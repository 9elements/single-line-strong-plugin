/**
 * The Lexical ⇄ segment bridge (see CONTEXT.md, "Segment bridge").
 *
 * Two directions of the same mapping:
 *   - `$readSegments()` reads the editor's node tree into a normalized segment
 *     array, and
 *   - `$populateFromSegments(segments)` builds the editor's paragraph/text-node
 *     tree from a segment array.
 *
 * Both are `$`-prefixed by Lexical convention: they touch the active editor
 * state and so must be called inside a read/update transaction
 * (`editorState.read(...)` or `editor.update(...)`), never standalone.
 *
 * This is the Lexical-facing counterpart to the Lexical-free `./segments`
 * module. Splitting them keeps `segments.ts` testable in isolation and gives the
 * bridge its own headless test surface. The bridge's contract is the round-trip
 * identity:
 *
 *   $readSegments($populateFromSegments(x)) ≡ normalizeSegments(x)
 *
 * i.e. populating an editor from `x` and reading it back yields exactly the
 * normalized form of `x` — `$readSegments` applies `normalizeSegments` on the
 * way out, so the editor never needs to hold a canonical tree for the stored
 * value to be canonical.
 */
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

import { normalizeSegments, type Segment } from './segments';

/** Reads the current editor content into normalized segments. Call inside `read`. */
export function $readSegments(): Segment[] {
  return normalizeSegments(
    $getRoot()
      .getAllTextNodes()
      .map((node) => ({
        value: node.getTextContent(),
        mark: node.hasFormat('bold'),
      })),
  );
}

/** Builds the initial editor state from segments. Call inside an `update`. */
export function $populateFromSegments(segments: Segment[]): void {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  for (const segment of segments) {
    const node = $createTextNode(segment.value);
    if (segment.mark) {
      node.setFormat('bold');
    }
    paragraph.append(node);
  }
  root.append(paragraph);
}
