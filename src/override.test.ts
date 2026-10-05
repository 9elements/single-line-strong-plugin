import { describe, expect, it } from 'vitest';

import { STRUCTURED_TEXT_ADDON_ID, claimsField } from './override';

/** A field shaped like the CMA resource DatoCMS hands the override hook. */
const field = (fieldType: string, addons: unknown) => ({
  attributes: {
    field_type: fieldType,
    appearance: { editor: fieldType, addons },
  },
});

const addon = (fieldExtension: string) => ({
  id: 'GLaqaXyVQF6H1lEX1d1cFQ',
  field_extension: fieldExtension,
  parameters: {},
});

describe('claimsField', () => {
  it('claims a structured_text field that carries the addon', () => {
    expect(
      claimsField(field('structured_text', [addon(STRUCTURED_TEXT_ADDON_ID)])),
    ).toBe(true);
  });

  it('claims it when other addons sit beside ours', () => {
    expect(
      claimsField(
        field('structured_text', [addon('somethingElse'), addon(STRUCTURED_TEXT_ADDON_ID)]),
      ),
    ).toBe(true);
  });

  it.each([
    ['a json field, even with the addon', field('json', [addon(STRUCTURED_TEXT_ADDON_ID)])],
    ['a string field, even with the addon', field('string', [addon(STRUCTURED_TEXT_ADDON_ID)])],
    ['a structured_text field with no addons', field('structured_text', [])],
    ['a structured_text field with only another addon', field('structured_text', [addon('somethingElse')])],
    ['an addon whose name merely contains ours', field('structured_text', [addon(`x${STRUCTURED_TEXT_ADDON_ID}`)])],
  ])('leaves %s alone', (_label, candidate) => {
    expect(claimsField(candidate)).toBe(false);
  });

  // The hook runs for EVERY field in the project, and anything that throws inside it
  // takes the whole plugin handshake down — DatoCMS then reports the plugin as not
  // responding, with nothing to say why. `appearance.addons` is documented as
  // required yet is absent on some fields in practice, so none of this may throw.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'structured_text'],
    ['a number', 42],
    ['an empty object', {}],
    ['no attributes', { attributes: null }],
    ['attributes without a field type', { attributes: {} }],
    ['no appearance', { attributes: { field_type: 'structured_text' } }],
    ['a null appearance', { attributes: { field_type: 'structured_text', appearance: null } }],
    ['appearance without addons', { attributes: { field_type: 'structured_text', appearance: {} } }],
    ['null addons', field('structured_text', null)],
    ['addons that are not a list', field('structured_text', 'singleLineStrongAddon')],
    ['addons that are an object', field('structured_text', { field_extension: STRUCTURED_TEXT_ADDON_ID })],
    ['addons holding junk', field('structured_text', [null, 7, 'x', undefined, []])],
    ['an addon with no field_extension', field('structured_text', [{ id: 'abc', parameters: {} }])],
  ])('does not throw, and claims nothing, for %s', (_label, candidate) => {
    expect(() => claimsField(candidate)).not.toThrow();
    expect(claimsField(candidate)).toBe(false);
  });
});
