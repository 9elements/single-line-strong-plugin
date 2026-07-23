import { describe, expect, it } from 'vitest';

import {
  normalizeSegments,
  parseFieldValue,
  serializeFieldValue,
  type Segment,
} from './segments';

/** Terse constructors so the cases below read as data, not boilerplate. */
const p = (value: string): Segment => ({ value, mark: false });
const b = (value: string): Segment => ({ value, mark: true });

describe('normalizeSegments', () => {
  it('drops empty-text segments', () => {
    expect(normalizeSegments([p(''), b('hello'), p('')])).toEqual([b('hello')]);
  });

  it('merges adjacent segments that share a mark', () => {
    expect(normalizeSegments([p('foo'), p('bar')])).toEqual([p('foobar')]);
    expect(normalizeSegments([b('foo'), b('bar')])).toEqual([b('foobar')]);
  });

  it('keeps differently-marked runs distinct and preserves interior spacing', () => {
    expect(normalizeSegments([p('This is my '), b('highlighted'), p(' text')])).toEqual([
      p('This is my '),
      b('highlighted'),
      p(' text'),
    ]);
  });

  it('absorbs a lone single space between two same-marked runs', () => {
    // A space's mark is visually meaningless: bold + " " + bold → one bold run.
    expect(normalizeSegments([b('jetzt'), p(' '), b('mein')])).toEqual([b('jetzt mein')]);
  });

  it('absorbs a chain of single spaces between same-marked runs', () => {
    expect(
      normalizeSegments([b('a'), p(' '), b('b'), p(' '), b('c')]),
    ).toEqual([b('a b c')]);
  });

  it('does not absorb a multi-character gap', () => {
    // Only a lone single-space run is absorbed; two spaces stay a real gap.
    expect(normalizeSegments([b('a'), p('  '), b('c')])).toEqual([
      b('a'),
      p('  '),
      b('c'),
    ]);
  });

  it('shifts leading whitespace out of a marked run onto the previous run', () => {
    expect(normalizeSegments([p('This is'), b(' Bold')])).toEqual([
      p('This is '),
      b('Bold'),
    ]);
  });

  it('shifts trailing whitespace out of a marked run onto the next run', () => {
    expect(normalizeSegments([b('Bold '), p('text')])).toEqual([
      b('Bold'),
      p(' text'),
    ]);
  });

  it('leaves interior whitespace inside a bold phrase untouched', () => {
    expect(normalizeSegments([b('two words')])).toEqual([b('two words')]);
  });

  it('trims leading whitespace off the first run', () => {
    expect(normalizeSegments([p('  hi')])).toEqual([p('hi')]);
  });

  it('trims trailing whitespace off the last run', () => {
    expect(normalizeSegments([p('hi  ')])).toEqual([p('hi')]);
  });

  it('trims edge whitespace shifted out of a marked run at the field boundary', () => {
    // Leading space on a leading bold run has no previous neighbour, so it is
    // trimmed away rather than shifted.
    expect(normalizeSegments([b(' Bold'), p(' rest')])).toEqual([
      b('Bold'),
      p(' rest'),
    ]);
  });

  it('normalizes to an empty array when everything drops out', () => {
    expect(normalizeSegments([])).toEqual([]);
    expect(normalizeSegments([p('   ')])).toEqual([]);
    expect(normalizeSegments([p(''), b('')])).toEqual([]);
  });
});

describe('serializeFieldValue', () => {
  it('returns null for an empty field', () => {
    expect(serializeFieldValue([])).toBeNull();
    expect(serializeFieldValue([p('')])).toBeNull();
    expect(serializeFieldValue([p('   ')])).toBeNull();
  });

  it('returns a stringified object with normalized segments and a raw mirror', () => {
    const out = serializeFieldValue([p('This is my '), b('highlighted'), p(' text')]);
    expect(typeof out).toBe('string');
    expect(JSON.parse(out!)).toEqual({
      segments: [p('This is my '), b('highlighted'), p(' text')],
      raw: 'This is my highlighted text',
    });
  });

  it('normalizes before serializing', () => {
    const out = serializeFieldValue([p('foo'), p('bar')]);
    expect(JSON.parse(out!)).toEqual({ segments: [p('foobar')], raw: 'foobar' });
  });
});

describe('parseFieldValue', () => {
  it('parses the current stringified object shape', () => {
    const stored = JSON.stringify({
      segments: [p('a '), b('b')],
      raw: 'a b',
    });
    expect(parseFieldValue(stored)).toEqual([p('a '), b('b')]);
  });

  it('parses the legacy bare-array shape (as a JSON string)', () => {
    const stored = JSON.stringify([p('a '), b('b')]);
    expect(parseFieldValue(stored)).toEqual([p('a '), b('b')]);
  });

  it('accepts an already-parsed array', () => {
    expect(parseFieldValue([p('hi')])).toEqual([p('hi')]);
  });

  it('accepts an already-parsed object', () => {
    expect(parseFieldValue({ segments: [b('hi')], raw: 'hi' })).toEqual([b('hi')]);
  });

  it('normalizes what it parses', () => {
    expect(parseFieldValue(JSON.stringify([p('foo'), p('bar')]))).toEqual([p('foobar')]);
  });

  it('coerces a missing mark to false and drops malformed items', () => {
    const stored = JSON.stringify([
      { value: 'kept' },
      { mark: true },
      { value: 42 },
      'nope',
      null,
      { value: 'bold', mark: true },
    ]);
    expect(parseFieldValue(stored)).toEqual([p('kept'), b('bold')]);
  });

  it('yields an empty list for null, garbage, or unrecognized shapes', () => {
    expect(parseFieldValue(null)).toEqual([]);
    expect(parseFieldValue(undefined)).toEqual([]);
    expect(parseFieldValue('')).toEqual([]);
    expect(parseFieldValue('not json {')).toEqual([]);
    expect(parseFieldValue(42)).toEqual([]);
    expect(parseFieldValue({ nope: true })).toEqual([]);
  });
});
