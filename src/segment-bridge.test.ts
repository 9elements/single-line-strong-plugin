import { createHeadlessEditor } from '@lexical/headless';
import { $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { $populateFromSegments, $readSegments } from './segment-bridge';
import { normalizeSegments, type Segment } from './segments';

const p = (value: string): Segment => ({ value, mark: false });
const b = (value: string): Segment => ({ value, mark: true });

/** A fresh headless editor whose Lexical errors surface as test failures. */
function makeEditor() {
  return createHeadlessEditor({
    namespace: 'test',
    onError: (error) => {
      throw error;
    },
  });
}

/**
 * Drives both halves of the bridge through a real (headless) editor: populate
 * from `input`, then read back. `discrete: true` commits synchronously so the
 * following read sees the populated state.
 */
function roundTrip(input: Segment[]): Segment[] {
  const editor = makeEditor();
  editor.update(() => $populateFromSegments(input), { discrete: true });
  return editor.getEditorState().read(() => $readSegments());
}

describe('segment bridge round-trip', () => {
  // The contract from CONTEXT.md:
  //   $readSegments($populateFromSegments(x)) ≡ normalizeSegments(x)
  const cases: Array<{ name: string; input: Segment[] }> = [
    { name: 'plain text', input: [p('hello world')] },
    {
      name: 'the SPEC example',
      input: [p('This is my '), b('highlighted'), p(' text')],
    },
    { name: 'empty', input: [] },
    { name: 'already-normalized bold run', input: [p('a '), b('b'), p(' c')] },
    { name: 'adjacent same-mark runs', input: [p('foo'), p('bar')] },
    { name: 'bold edge-shift (leading)', input: [p('This is'), b(' Bold')] },
    { name: 'bold edge-shift (trailing)', input: [b('Bold '), p('text')] },
    { name: 'single-space absorption', input: [b('jetzt'), p(' '), b('mein')] },
    { name: 'empty-segment drop', input: [p(''), b('x'), p('')] },
    { name: 'leading/trailing edge trim', input: [p('  padded  ')] },
    { name: 'edge-trimmed leading bold space', input: [b(' Bold'), p(' rest')] },
  ];

  for (const { name, input } of cases) {
    it(`holds for ${name}`, () => {
      // The two halves compose to exactly the pure normalization of the input.
      expect(roundTrip(input)).toEqual(normalizeSegments(input));
    });
  }
});

describe('$populateFromSegments (write direction)', () => {
  it('builds a single paragraph of text nodes', () => {
    const editor = makeEditor();
    editor.update(
      () => $populateFromSegments([p('a'), b('b'), p('c')]),
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].getType()).toBe('paragraph');
      expect($getRoot().getAllTextNodes()).toHaveLength(3);
    });
  });

  it('sets the bold format on marked nodes only', () => {
    const editor = makeEditor();
    editor.update(
      () => $populateFromSegments([p('plain'), b('bold')]),
      { discrete: true },
    );

    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getAllTextNodes();
      expect(first.getTextContent()).toBe('plain');
      expect(first.hasFormat('bold')).toBe(false);
      expect(second.getTextContent()).toBe('bold');
      expect(second.hasFormat('bold')).toBe(true);
    });
  });

  it('clears prior content on repopulate', () => {
    const editor = makeEditor();
    editor.update(() => $populateFromSegments([p('first')]), { discrete: true });
    editor.update(() => $populateFromSegments([b('second')]), { discrete: true });

    expect(editor.getEditorState().read(() => $readSegments())).toEqual([b('second')]);
  });
});

describe('$readSegments (read direction)', () => {
  it('carries text and marks out faithfully', () => {
    const editor = makeEditor();
    editor.update(
      () => $populateFromSegments([p('This is my '), b('highlighted'), p(' text')]),
      { discrete: true },
    );

    expect(editor.getEditorState().read(() => $readSegments())).toEqual([
      p('This is my '),
      b('highlighted'),
      p(' text'),
    ]);
  });

  it('returns an empty array for an empty document', () => {
    const editor = makeEditor();
    editor.update(() => $populateFromSegments([]), { discrete: true });
    expect(editor.getEditorState().read(() => $readSegments())).toEqual([]);
  });
});
