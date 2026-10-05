import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  connect,
  type ManualFieldExtensionsCtx,
  type RenderFieldExtensionCtx,
  type RenderManualFieldExtensionConfigScreenCtx,
} from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';

import { SingleLineStrongEditor } from './entrypoints/SingleLineStrongEditor';
import { StrongEditorConfigScreen } from './entrypoints/StrongEditorConfigScreen';
import { StructuredTextConfigScreen } from './entrypoints/StructuredTextConfigScreen';
import { StructuredTextEditor } from './entrypoints/StructuredTextEditor';
import {
  STRUCTURED_TEXT_ADDON_ID,
  STRUCTURED_TEXT_EDITOR_ID,
  claimsField,
} from './override';

// The manual field extension the editor picks as the JSON field's editor.
const FIELD_EXTENSION_ID = 'singleLineStrong';

// DatoCMS re-invokes the render hook whenever ctx changes (e.g. on every
// keystroke, as the field value updates). Create the React root ONCE and
// re-render into it so React reconciles the existing tree instead of
// remounting it — otherwise the <input> is recreated each render and loses
// focus after a single character.
let root: Root | null = null;

function render(component: React.ReactNode) {
  if (!root) {
    root = createRoot(document.getElementById('root')!);
  }
  root.render(<StrictMode>{component}</StrictMode>);
}

connect({
  manualFieldExtensions(_ctx: ManualFieldExtensionsCtx) {
    return [
      {
        id: FIELD_EXTENSION_ID,
        name: 'Single-line strong',
        type: 'editor',
        // Restricts the extension so it can only be attached to JSON fields.
        fieldTypes: ['json'],
        // Enables the per-field config screen (renderManualFieldExtensionConfigScreen).
        configurable: true,
      },
      // The opt-in for structured_text fields. An addon is appended to the field's
      // addon list and leaves its editor identity alone, which is the whole point:
      // tools such as ai-translations decide what they can translate by reading
      // that identity, and a manual editor extension would overwrite it.
      {
        id: STRUCTURED_TEXT_ADDON_ID,
        name: 'Single-line strong',
        type: 'addon',
        fieldTypes: ['structured_text'],
        // Shows the config screen, which has nothing to set: it only warns when the
        // field's own settings allow more than the editor can show.
        configurable: true,
      },
    ];
  },
  // Claims exactly the structured_text fields that carry the addon and swaps in the
  // single-line editor at render time. Runs for EVERY field in the project, so it
  // must never throw — see claimsField. It is also synchronous: nothing can be
  // awaited in here.
  overrideFieldExtensions(field) {
    if (!claimsField(field)) return;
    return { editor: { id: STRUCTURED_TEXT_EDITOR_ID } };
  },
  renderFieldExtension(fieldExtensionId, ctx: RenderFieldExtensionCtx) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<SingleLineStrongEditor ctx={ctx} />);
    }
    if (fieldExtensionId === STRUCTURED_TEXT_EDITOR_ID) {
      render(<StructuredTextEditor ctx={ctx} />);
    }
    // The addon renders nothing: it is only a flag for the override to read.
  },
  renderManualFieldExtensionConfigScreen(
    fieldExtensionId,
    ctx: RenderManualFieldExtensionConfigScreenCtx,
  ) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<StrongEditorConfigScreen ctx={ctx} />);
    }
    if (fieldExtensionId === STRUCTURED_TEXT_ADDON_ID) {
      render(<StructuredTextConfigScreen ctx={ctx} />);
    }
  },
});
