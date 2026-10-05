import { describe, expect, it } from 'vitest';

import { getValueAtPath } from './field-path';

describe('getValueAtPath', () => {
  it('reads a top-level field by its API key', () => {
    expect(getValueAtPath({ title: 'Hallo' }, 'title')).toBe('Hallo');
  });

  it('reads the value for one locale of a localized field', () => {
    // On a localized field the path is `headline.de`, but the form is keyed by the
    // bare field name and holds one value per locale. Reading the path as a flat key
    // finds nothing, so an editor built that way looks permanently empty.
    const formValues = {
      headline: { de: 'Der schnelle Fuchs', en: 'The fast Fox' },
    };

    expect(getValueAtPath(formValues, 'headline.de')).toBe('Der schnelle Fuchs');
    expect(getValueAtPath(formValues, 'headline.en')).toBe('The fast Fox');
  });

  it('does not mistake one locale for another', () => {
    const formValues = { headline: { de: 'nur Deutsch' } };

    expect(getValueAtPath(formValues, 'headline.en')).toBeUndefined();
  });

  it('reads a field nested inside a block, where numeric segments index the blocks', () => {
    const formValues = {
      content: {
        de: [
          { headline: 'erster Block' },
          { headline: 'zweiter Block' },
          { headline: 'dritter Block' },
        ],
      },
    };

    expect(getValueAtPath(formValues, 'content.de.2.headline')).toBe('dritter Block');
  });

  it('keeps null and structured values as they are', () => {
    const value = [{ type: 'paragraph', children: [{ text: 'x' }] }];

    expect(getValueAtPath({ headline: { de: null } }, 'headline.de')).toBeNull();
    expect(getValueAtPath({ headline: { de: value } }, 'headline.de')).toBe(value);
  });

  it.each([
    ['a path that does not exist', {}, 'a.b.c'],
    ['a path through null', { a: null }, 'a.b'],
    ['a path through a string', { a: 'text' }, 'a.b'],
    ['an index past the end of a list', { a: [1] }, 'a.5'],
  ])('yields undefined for %s rather than throwing', (_label, formValues, path) => {
    expect(getValueAtPath(formValues, path)).toBeUndefined();
  });
});
