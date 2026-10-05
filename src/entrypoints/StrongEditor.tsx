import { useEffect, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $trimTextContentFromAnchor } from '@lexical/selection';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  PASTE_COMMAND,
  RootNode,
  type EditorState,
} from 'lexical';

import { classifyIncoming, rememberWrite } from '../external-change';
import { normalizeSegments, type Segment } from '../segments';
import { $populateFromSegments, $readSegments } from '../segment-bridge';
import './StrongEditor.css';

type Props = {
  /** Segments to prefill the editor with on mount. */
  initialSegments: Segment[];
  /** Called with the normalized segments whenever the content changes. */
  onChange: (segments: Segment[]) => void;
  /** ARIA label for the editable region (the field's label). */
  label: string;
  /** Optional placeholder shown while the editor is empty. */
  placeholder?: string;
  /**
   * Optional cap on the visible-text length. When set, a live "X/Y" counter is
   * shown and typing/paste beyond the limit is hard-blocked. Bold markup does
   * not count toward the limit. Omitted (or non-positive) means no limit.
   */
  maxLength?: number;
  /** When true, the editor is read-only but still renders bold styling. */
  disabled?: boolean;
  /**
   * Adopt a value written from outside — a translation, say — even while the editor
   * has focus. Off by default: the editor then ignores incoming values while focused,
   * so the lagging echo of its own typing cannot overwrite it. When on, echoes are
   * recognised by what the editor itself wrote (see `external-change.ts`), so only a
   * genuinely external value is adopted.
   */
  adoptExternalWhileFocused?: boolean;
};

/**
 * The bold-only, single-line Lexical editor.
 *
 * Bold is the only mark: rich-text's `FORMAT_TEXT_COMMAND` (bound to the toolbar
 * button and the native Cmd/Ctrl+B shortcut) is the sole formatting affordance;
 * no other nodes or marks are ever created. Line breaks are blocked and pastes
 * are flattened to plain text, so the document stays a single run of styled text
 * that maps cleanly onto the segment-array contract.
 */
export function StrongEditor({
  initialSegments,
  onChange,
  label,
  placeholder,
  maxLength,
  disabled = false,
  adoptExternalWhileFocused = false,
}: Props) {
  // A positive number enables the counter + input limit; anything else disables
  // the feature entirely (graceful no-op when no max is configured).
  const hasLimit = typeof maxLength === 'number' && maxLength > 0;
  const initialConfig = {
    namespace: 'single-line-strong',
    editable: !disabled,
    // Prefill the editor state from the stored segments (runs inside an update).
    editorState: () => $populateFromSegments(initialSegments),
    onError(error: Error) {
      // Surface Lexical internal errors instead of silently swallowing them.
      console.error('[single-line-strong] Lexical error:', error);
    },
  };

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => onChange($readSegments()));
  };

  return (
    <div className="sls-editor" data-disabled={disabled}>
      <LexicalComposer initialConfig={initialConfig}>
        <BoldToolbarButton disabled={disabled} />
        <div className="sls-input-wrap">
          <RichTextPlugin
            contentEditable={
              // ContentEditable's props are a discriminated union: a placeholder
              // requires a matching `aria-placeholder`, or neither is present.
              placeholder ? (
                <ContentEditable
                  className="sls-content"
                  aria-label={label}
                  aria-placeholder={placeholder}
                  placeholder={
                    <div className="sls-placeholder">{placeholder}</div>
                  }
                />
              ) : (
                <ContentEditable className="sls-content" aria-label={label} />
              )
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        {hasLimit && <CharCounter maxLength={maxLength} />}
        <HistoryPlugin />
        <SingleLinePlugin />
        <PlainTextPastePlugin />
        {hasLimit && <MaxLengthPlugin maxLength={maxLength} />}
        <EditableSyncPlugin editable={!disabled} />
        <ExternalValueSyncPlugin
          segments={initialSegments}
          adoptWhileFocused={adoptExternalWhileFocused}
        />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </LexicalComposer>
    </div>
  );
}

/** The fixed "B" toolbar button; reflects and toggles the selection's bold state. */
function BoldToolbarButton({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);

  useEffect(() => {
    // Every editor update carries the current selection, so this fires on both
    // content and caret/selection changes — keeping the button's active state in
    // sync with wherever the cursor is.
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        setIsBold($isRangeSelection(selection) && selection.hasFormat('bold'));
      });
    });
  }, [editor]);

  return (
    <button
      type="button"
      className="sls-bold-btn"
      aria-label="Bold"
      aria-pressed={isBold}
      disabled={disabled}
      // Keep the text selection: without this the button steals focus on press
      // and the selection collapses, so the toggle would apply to nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
    >
      B
    </button>
  );
}

/**
 * Enforces the single-line rule by swallowing the two commands that would insert
 * vertical whitespace. `COMMAND_PRIORITY_CRITICAL` runs ahead of rich-text's
 * default handlers (registered at `COMMAND_PRIORITY_EDITOR`), and returning
 * `true` marks the command handled so those defaults never run — Enter and
 * Shift+Enter therefore do nothing.
 */
function SingleLinePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => true,
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        INSERT_LINE_BREAK_COMMAND,
        () => true,
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor]);
  return null;
}

/**
 * Forces every paste to plain text. Rich-text's paste would carry formatting
 * (including bold) and line breaks into the document; instead we take only
 * `text/plain`, collapse newline runs to single spaces (single-line), and insert
 * it at the caret. `COMMAND_PRIORITY_CRITICAL` + returning `true` pre-empts the
 * default paste handler.
 */
function PlainTextPastePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent) || !event.clipboardData) {
          return false;
        }
        event.preventDefault();
        const flat = event.clipboardData
          .getData('text/plain')
          .replace(/[\r\n]+/g, ' ');
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(flat);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);
  return null;
}

/**
 * Hard-blocks input once the visible text reaches `maxLength`. It runs as a
 * `RootNode` transform — after every change Lexical re-runs it, so any edit that
 * pushed the text over the cap (a keystroke, or a paste inserting many chars at
 * once) is trimmed back from the caret in the same update. The user sees typing
 * simply stop at the limit and pasted text truncated, never a value that exceeds
 * it. Bold markup isn't text, so `getTextContentSize()` counts visible chars only.
 */
function MaxLengthPlugin({ maxLength }: { maxLength: number }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerNodeTransform(RootNode, (rootNode) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
      const overflow = rootNode.getTextContentSize() - maxLength;
      if (overflow > 0) {
        $trimTextContentFromAnchor(editor, selection.anchor, overflow);
      }
    });
  }, [editor, maxLength]);
  return null;
}

/** Live "X/Y" counter of the visible-text length (bold markup excluded). */
function CharCounter({ maxLength }: { maxLength: number }) {
  const [editor] = useLexicalComposerContext();
  const [count, setCount] = useState(() =>
    editor.getEditorState().read(() => $getRoot().getTextContentSize()),
  );
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => setCount($getRoot().getTextContentSize()));
    });
  }, [editor]);
  return (
    <div className="sls-counter" data-at-limit={count >= maxLength}>
      {count}/{maxLength}
    </div>
  );
}

/** A stable string for what an editor state holds, comparable with an incoming value. */
function contentOf(state: EditorState): string {
  return state.read(() => JSON.stringify($readSegments()));
}

/** Marks an update as the editor adopting an external value, not a write of its own. */
const EXTERNAL_SYNC_TAG = 'external-sync';

/**
 * Reconciles a late-arriving or externally-changed stored value into the editor.
 *
 * Lexical reads `initialConfig.editorState` only once, at mount. In DatoCMS the
 * field value is frequently hydrated *after* the extension iframe has mounted
 * (notably when reopening a record), so without this the editor would stay empty
 * even though the stored value loaded a tick later. This plugin watches the
 * incoming segments and, whenever they differ from what the editor currently
 * holds, repopulates it. Comparing against the editor's *own* content means our
 * own edits — which loop back in through `formValues` — are seen as
 * already-applied and skipped, so the caret is never disturbed while typing.
 *
 * By default the editor ignores incoming values while it has focus. With
 * `adoptWhileFocused` it instead recognises the echoes of its own writes and adopts
 * everything else, so a value written from outside — a translation — shows up even
 * while the cursor is in the field.
 */
function ExternalValueSyncPlugin({
  segments,
  adoptWhileFocused,
}: {
  segments: Segment[];
  adoptWhileFocused: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  // A stable, comparable projection of the incoming value; also the effect key so
  // the reconciliation runs only when the stored value actually changes.
  const incoming = JSON.stringify(normalizeSegments(segments));
  // Contents this editor has written whose echo has not come back yet. Only used
  // when adopting while focused; see `external-change.ts`.
  const pending = useRef<string[]>([]);

  useEffect(() => {
    if (!adoptWhileFocused) return;
    return editor.registerUpdateListener(({ editorState, prevEditorState, tags }) => {
      // Our own adoption of an external value is not a write of ours.
      if (tags.has(EXTERNAL_SYNC_TAG)) return;
      const content = contentOf(editorState);
      // Selection and focus changes update the editor too; only a change of
      // content is a write.
      if (content === contentOf(prevEditorState)) return;
      pending.current = rememberWrite(pending.current, content);
    });
  }, [editor, adoptWhileFocused]);

  useEffect(() => {
    const target: Segment[] = JSON.parse(incoming);
    const current = contentOf(editor.getEditorState());

    if (adoptWhileFocused) {
      // `ctx.setFieldValue` is async, so the stored value looping back lags behind
      // what has been typed. Rather than trusting focus to mean "the user is
      // typing", recognise our own echoes by what we wrote, and adopt the rest.
      const result = classifyIncoming(incoming, current, pending.current);
      pending.current = result.pending;
      if (!result.external) return;
    } else {
      // Don't fight the user's own in-flight edits. `ctx.setFieldValue` is async, so
      // the stored value looping back through `formValues` lags behind what's been
      // typed; while the editor is focused, local state is authoritative. Genuine
      // external changes (record reopen, late hydration, locale switch) all happen
      // while the field isn't being actively edited.
      const root = editor.getRootElement();
      if (root && root.contains(root.ownerDocument.activeElement)) return;
      if (current === incoming) return;
    }
    editor.update(() => $populateFromSegments(target), { tag: EXTERNAL_SYNC_TAG });
  }, [editor, incoming, adoptWhileFocused]);
  return null;
}

/** Keeps the editor's editable state in sync when the field is toggled read-only. */
function EditableSyncPlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);
  return null;
}
