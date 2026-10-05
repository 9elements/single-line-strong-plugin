import { describe, expect, it } from 'vitest';

import { parseSlateValue, serializeSlateValue, valueToWrite } from './slate';
import type { Segment } from './segments';

/** Terse constructors so the cases below read as data, not boilerplate. */
const p = (value: string): Segment => ({ value, mark: false });
const b = (value: string): Segment => ({ value, mark: true });

describe('parseSlateValue', () => {
  it('reads the value DatoCMS stores for a paragraph with one bold segment', () => {
    // Verbatim from what the native structured_text editor wrote during the spike.
    const stored = [
      {
        type: 'paragraph',
        children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }],
      },
    ];

    expect(parseSlateValue(stored)).toEqual([p('Der schnelle '), b('Fuchs')]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'Der schnelle Fuchs'],
    ['a number', 42],
    ['an empty object', {}],
    ['an empty list', []],
    ['a list of non-blocks', [1, 'a', null]],
    ['a block with no children', [{ type: 'paragraph' }]],
    ['a leaf whose text is not a string', [{ type: 'paragraph', children: [{ text: 7 }] }]],
  ])('yields an empty editor for %s rather than throwing', (_label, garbage) => {
    expect(parseSlateValue(garbage)).toEqual([]);
  });

  it('keeps strong as the only mark and drops every other', () => {
    const stored = [
      {
        type: 'paragraph',
        children: [
          { text: 'plain ' },
          { text: 'slanted', emphasis: true },
          { text: ' ' },
          { text: 'underlined', underline: true, code: true },
          { text: ' ' },
          { text: 'not bold', strong: false },
        ],
      },
    ];

    expect(parseSlateValue(stored)).toEqual([p('plain slanted underlined not bold')]);
  });

  it('flattens several paragraphs onto one line, separated by a space', () => {
    // A migration or import can write a second paragraph; the editor is one line.
    const stored = [
      { type: 'paragraph', children: [{ text: 'Erste Zeile' }] },
      { type: 'paragraph', children: [{ text: 'Zweite ' }, { text: 'Zeile', strong: true }] },
    ];

    expect(parseSlateValue(stored)).toEqual([p('Erste Zeile Zweite '), b('Zeile')]);
  });

  it('reads the dast wrapper the CMA and GraphQL return', () => {
    // dast is not what the form holds, but an import or script may hand it over.
    const dast = {
      schema: 'dast',
      document: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'span', value: 'The fast ' },
              { type: 'span', value: 'Fox', marks: ['strong', 'emphasis'] },
            ],
          },
        ],
      },
    };

    expect(parseSlateValue(dast)).toEqual([p('The fast '), b('Fox')]);
  });

  it('reads text nested inside headings and links, ignoring what the editor cannot show', () => {
    const stored = [
      {
        type: 'heading',
        level: 2,
        children: [
          { text: 'Titel ' },
          { type: 'link', url: 'https://example.com', children: [{ text: 'Link', strong: true }] },
        ],
      },
      { type: 'block', item: 'abc123' },
    ];

    expect(parseSlateValue(stored)).toEqual([p('Titel '), b('Link')]);
  });

  it('flattens the value the native editor stores for two bold paragraphs', () => {
    // Verbatim from the native editor: two Enter-separated paragraphs, each fully bold.
    const stored = [
      { type: 'paragraph', children: [{ text: 'Der schnelle Fuchs', strong: true }] },
      { type: 'paragraph', children: [{ text: 'Eine neue Zeile auch fett', strong: true }] },
    ];

    // The joining space sits between two bold segments, so it is absorbed into one.
    expect(parseSlateValue(stored)).toEqual([b('Der schnelle Fuchs Eine neue Zeile auch fett')]);
  });

  it('does not stack separators around an empty paragraph', () => {
    const stored = [
      { type: 'paragraph', children: [{ text: 'oben' }] },
      { type: 'paragraph', children: [{ text: '' }] },
      { type: 'paragraph', children: [{ text: 'unten' }] },
    ];

    expect(parseSlateValue(stored)).toEqual([p('oben unten')]);
  });

  it('merges neighbouring leaves that share a mark', () => {
    const bold = [{ type: 'paragraph', children: [{ text: 'a', strong: true }, { text: 'b', strong: true }] }];
    const plain = [{ type: 'paragraph', children: [{ text: 'a' }, { text: 'b' }] }];

    expect(parseSlateValue(bold)).toEqual([b('ab')]);
    expect(parseSlateValue(plain)).toEqual([p('ab')]);
  });

  it('does not double the whitespace when a paragraph already supplies it', () => {
    const trailing = [
      { type: 'paragraph', children: [{ text: 'a ' }] },
      { type: 'paragraph', children: [{ text: 'b' }] },
    ];
    const leading = [
      { type: 'paragraph', children: [{ text: 'a' }] },
      { type: 'paragraph', children: [{ text: ' b' }] },
    ];

    expect(parseSlateValue(trailing)).toEqual([p('a b')]);
    expect(parseSlateValue(leading)).toEqual([p('a b')]);
  });

  it('treats a whitespace-only paragraph like an empty one', () => {
    const stored = [
      { type: 'paragraph', children: [{ text: 'oben' }] },
      { type: 'paragraph', children: [{ text: '   ' }] },
      { type: 'paragraph', children: [{ text: 'unten' }] },
    ];

    expect(parseSlateValue(stored)).toEqual([p('oben unten')]);
  });
});

describe('parseSlateValue normalization', () => {
  it('returns the canonical form the JSON route also promises', () => {
    const stored = [
      {
        type: 'paragraph',
        children: [
          { text: '  Das ' },
          { text: 'ist', strong: true },
          { text: ' ' },
          { text: 'mein', strong: true },
          { text: '' },
          { text: ' Text  ' },
        ],
      },
    ];

    // Bold segments split by a lone space merge, empty ones drop, outer edges trim.
    expect(parseSlateValue(stored)).toEqual([p('Das '), b('ist mein'), p(' Text')]);
  });
});

describe('serializeSlateValue', () => {
  it('writes one paragraph with a separate leaf per segment, as the native editor does', () => {
    expect(serializeSlateValue([p('Der schnelle '), b('Fuchs')])).toStrictEqual([
      {
        type: 'paragraph',
        children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }],
      },
    ]);
  });

  it.each([
    ['no segments', []],
    ['only empty segments', [p(''), b('')]],
    ['only whitespace', [p('   '), b(' ')]],
  ])('stores nothing at all for %s, so the field counts as empty', (_label, segments) => {
    expect(serializeSlateValue(segments)).toBeNull();
  });

  it('normalizes on the way out, so one text always has one stored form', () => {
    expect(serializeSlateValue([p('  Das '), b('ist'), p(' '), b('mein'), p(' Text  ')])).toStrictEqual([
      {
        type: 'paragraph',
        children: [{ text: 'Das ' }, { text: 'ist mein', strong: true }, { text: ' Text' }],
      },
    ]);
  });

  // A fully bold line as one marked leaf is what the native editor itself stores for it.
  it('writes plain segments without a strong key and a fully bold line as one marked leaf', () => {
    expect(serializeSlateValue([p('nur Text')])).toStrictEqual([
      { type: 'paragraph', children: [{ text: 'nur Text' }] },
    ]);
    expect(serializeSlateValue([b('ganz fett')])).toStrictEqual([
      { type: 'paragraph', children: [{ text: 'ganz fett', strong: true }] },
    ]);
  });
});

describe('round trip', () => {
  it.each([
    ['plain text', [p('Hallo Welt')], [p('Hallo Welt')]],
    ['one bold word', [p('Der schnelle '), b('Fuchs')], [p('Der schnelle '), b('Fuchs')]],
    ['a bold segment in the middle', [p('a '), b('b'), p(' c')], [p('a '), b('b'), p(' c')]],
    ['a fully bold line', [b('ganz fett')], [b('ganz fett')]],
    // Two spaces survive: one was typed after `y`, one is the bold segment's leading space
    // pushed out onto it. Interior whitespace is never collapsed, only the outer edges trimmed.
    ['untidy input', [p(' x'), p('y '), b(''), b(' z ')], [p('xy  '), b('z')]],
  ])('brings back the canonical form of %s', (_label, input, canonical) => {
    expect(parseSlateValue(serializeSlateValue(input))).toEqual(canonical);
  });

  it('leaves a value the native editor wrote exactly as it was', () => {
    const native = [
      {
        type: 'paragraph',
        children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }],
      },
    ];

    expect(serializeSlateValue(parseSlateValue(native))).toStrictEqual(native);
  });

  it('leaves a fully bold value the native editor wrote exactly as it was', () => {
    // Verbatim from the native editor, checked against a live field.
    const native = [
      { type: 'paragraph', children: [{ text: 'Der schnelle Fuchs', strong: true }] },
    ];

    expect(serializeSlateValue(parseSlateValue(native))).toStrictEqual(native);
  });

  it('turns a multi-paragraph value into a single paragraph', () => {
    const imported = [
      { type: 'paragraph', children: [{ text: 'eins' }] },
      { type: 'paragraph', children: [{ text: 'zwei', strong: true }] },
    ];

    expect(serializeSlateValue(parseSlateValue(imported))).toStrictEqual([
      { type: 'paragraph', children: [{ text: 'eins ' }, { text: 'zwei', strong: true }] },
    ]);
  });

  it('keeps an emptied field empty', () => {
    expect(serializeSlateValue(parseSlateValue(null))).toBeNull();
    expect(serializeSlateValue(parseSlateValue([{ type: 'paragraph', children: [{ text: '' }] }]))).toBeNull();
  });
});

describe('valueToWrite', () => {
  // What the form holds for a bold word in a plain line, as the native editor wrote it.
  const stored = [
    {
      type: 'paragraph',
      children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }],
    },
  ];

  // Opening a record makes the editor report its content once, as if it had changed.
  // Writing that back would mark the record dirty and could rewrite content nobody edited.
  it('has nothing to write when the editor reports what is already stored', () => {
    expect(valueToWrite(stored, [p('Der schnelle '), b('Fuchs')])).toBeUndefined();
  });

  it('has nothing to write when an empty field reports empty on opening', () => {
    expect(valueToWrite(null, [])).toBeUndefined();
    expect(valueToWrite(undefined, [])).toBeUndefined();
  });

  it('does not write on opening a value that was only normalized for display', () => {
    // Two paragraphs from an import: shown as one line, stored untouched until edited.
    const imported = [
      { type: 'paragraph', children: [{ text: 'eins' }] },
      { type: 'paragraph', children: [{ text: 'zwei' }] },
    ];

    expect(valueToWrite(imported, [p('eins zwei')])).toBeUndefined();
  });

  it('writes the new value once the content has really changed', () => {
    expect(valueToWrite(stored, [p('Der schnelle '), b('Fuchs'), p(' springt')])).toStrictEqual({
      value: [
        {
          type: 'paragraph',
          children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }, { text: ' springt' }],
        },
      ],
    });
  });

  it('writes a change of mark alone', () => {
    expect(valueToWrite(stored, [p('Der schnelle Fuchs')])).toStrictEqual({
      value: [{ type: 'paragraph', children: [{ text: 'Der schnelle Fuchs' }] }],
    });
  });

  it('writes null, not an empty paragraph, when the field is cleared', () => {
    // `{ value: null }` is a real write; `undefined` is "nothing to write".
    expect(valueToWrite(stored, [])).toStrictEqual({ value: null });
  });

  it('writes the first value typed into an empty field', () => {
    expect(valueToWrite(null, [p('Hallo')])).toStrictEqual({
      value: [{ type: 'paragraph', children: [{ text: 'Hallo' }] }],
    });
  });
});
