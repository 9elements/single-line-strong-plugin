import { describe, expect, it } from 'vitest';

import { nativeMaxLength, permissivenessWarnings } from './field-config';

type Overrides = {
  marks?: unknown;
  nodes?: unknown;
  blocks?: unknown;
  links?: unknown;
  inlineBlocks?: unknown;
};

/**
 * A structured_text field as DatoCMS describes it to the config screen. By default it
 * is configured the way this editor wants: bold only, no nodes, no blocks or links.
 */
const field = ({
  marks = ['strong'],
  nodes = [],
  blocks = [],
  links = [],
  inlineBlocks = [],
}: Overrides = {}) => ({
  type: 'field',
  attributes: {
    field_type: 'structured_text',
    appearance: {
      editor: 'structured_text',
      parameters: { marks, nodes, heading_levels: [] },
      addons: [],
    },
    validators: {
      structured_text_blocks: { item_types: blocks },
      structured_text_links: { item_types: links },
      structured_text_inline_blocks: { item_types: inlineBlocks },
    },
  },
});

/** Whether any one warning mentions every one of `words`. */
const warns = (warnings: string[], ...words: string[]) =>
  warnings.some((warning) => words.every((word) => warning.includes(word)));

describe('permissivenessWarnings', () => {
  it('has nothing to say about a field configured the way the editor wants', () => {
    expect(permissivenessWarnings(field())).toEqual([]);
  });

  it('warns about marks the editor cannot show, naming each one', () => {
    const warnings = permissivenessWarnings(
      field({ marks: ['strong', 'emphasis', 'underline'] }),
    );

    expect(warnings).toHaveLength(1);
    expect(warns(warnings, 'emphasis', 'underline')).toBe(true);
    // Bold is the one mark it can show, so it is not part of the complaint.
    expect(warnings[0]).not.toContain('strong');
  });

  it('warns about nodes the editor cannot show, naming each one', () => {
    const warnings = permissivenessWarnings(field({ nodes: ['heading', 'list', 'link'] }));

    expect(warnings).toHaveLength(1);
    expect(warns(warnings, 'heading', 'list', 'link')).toBe(true);
  });

  it.each([
    ['embedded blocks', { blocks: ['abc123'] }, 'block'],
    ['links to records', { links: ['abc123', 'def456'] }, 'link'],
    ['inline blocks', { inlineBlocks: ['abc123'] }, 'inline'],
  ])('warns when the field allows %s', (_label, overrides, word) => {
    const warnings = permissivenessWarnings(field(overrides));

    expect(warnings).toHaveLength(1);
    expect(warns(warnings, word)).toBe(true);
  });

  // A field with bold switched off cannot hold the bold this plugin writes, so the
  // plugin's one feature would silently not work — as worth flagging as too much is.
  it('warns when the field does not allow bold at all', () => {
    const warnings = permissivenessWarnings(field({ marks: [] }));

    expect(warnings).toHaveLength(1);
    expect(warns(warnings, 'bold')).toBe(true);
  });

  it('warns about bold being off and a different mark being on together', () => {
    const warnings = permissivenessWarnings(field({ marks: ['emphasis'] }));

    expect(warns(warnings, 'bold')).toBe(true);
    expect(warns(warnings, 'emphasis')).toBe(true);
  });

  it('gives one warning per kind of problem when there are several', () => {
    const warnings = permissivenessWarnings(
      field({ marks: ['strong', 'code'], nodes: ['heading'], blocks: ['abc123'], links: ['def456'] }),
    );

    expect(warnings).toHaveLength(4);
  });

  // Nothing here may throw: the config screen runs while a modeller is part-way through
  // editing the field, and DatoCMS describes it loosely.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'structured_text'],
    ['an empty object', {}],
    ['no attributes', { attributes: null }],
    ['no appearance', { attributes: { field_type: 'structured_text', validators: {} } }],
    ['no validators', { attributes: { field_type: 'structured_text', appearance: { parameters: {} } } }],
    ['marks and nodes that are not lists', field({ marks: 'strong', nodes: 'heading' })],
    ['validators that are not objects', { attributes: { field_type: 'structured_text', appearance: { parameters: {} }, validators: 'x' } }],
    ['item types that are not lists', field({ blocks: 'abc', links: null, inlineBlocks: 7 })],
  ])('says nothing, and does not throw, for %s', (_label, candidate) => {
    expect(() => permissivenessWarnings(candidate)).not.toThrow();
    expect(permissivenessWarnings(candidate)).toEqual([]);
  });

  it('leaves a field that is not structured_text alone', () => {
    // Misconfigured in every way a structured_text field could be — only the type differs.
    const misconfigured = field({ marks: ['emphasis'], nodes: ['heading'], blocks: ['abc123'] });
    const json = {
      ...misconfigured,
      attributes: { ...misconfigured.attributes, field_type: 'json' },
    };

    expect(permissivenessWarnings(json)).toEqual([]);
  });
});

describe('nativeMaxLength', () => {
  const withValidators = (validators: unknown) => ({ attributes: { validators } });

  it('reads the maximum from the native length validator', () => {
    expect(nativeMaxLength(withValidators({ length: { max: 60 } }))).toBe(60);
  });

  it.each([
    ['no validators', withValidators({})],
    ['a length validator with only a minimum', withValidators({ length: { min: 3 } })],
    ['a zero maximum', withValidators({ length: { max: 0 } })],
    ['a negative maximum', withValidators({ length: { max: -5 } })],
    ['a fractional maximum', withValidators({ length: { max: 2.5 } })],
    ['a non-numeric maximum', withValidators({ length: { max: '60' } })],
    ['garbage', 'text'],
    ['null', null],
    ['undefined', undefined],
  ])('has no limit for %s', (_label, field) => {
    expect(nativeMaxLength(field)).toBeUndefined();
  });
});
