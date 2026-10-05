import { describe, expect, it } from 'vitest';

import { classifyIncoming, rememberWrite } from './external-change';

// The editor writes as you type, but the value coming back from DatoCMS lags behind:
// `setFieldValue` resolves before the form shows the result. So an incoming value can be
// (a) what is already on screen, (b) an old echo of something this editor wrote a moment
// ago, or (c) a genuinely external change, such as a translation. Only (c) should replace
// what the editor shows — and (b) must never, or typing gets overwritten by its own past.
describe('classifyIncoming', () => {
  it('has nothing to adopt when the incoming value is what the editor already shows', () => {
    expect(classifyIncoming('abc', 'abc', [])).toEqual({ external: false, pending: [] });
  });

  it('treats a lagging echo of our own typing as not external', () => {
    // Typed "a" then "ab"; DatoCMS now reports the older "a" while "ab" is on screen.
    expect(classifyIncoming('a', 'ab', ['a', 'ab'])).toEqual({
      external: false,
      pending: ['ab'],
    });
  });

  it('drops the echoes it has seen, and the older ones with them', () => {
    expect(classifyIncoming('abc', 'abc', ['a', 'ab', 'abc'])).toEqual({
      external: false,
      pending: [],
    });
  });

  it('adopts a value the editor never wrote, such as a translation', () => {
    expect(classifyIncoming('Hello', 'abc', [])).toEqual({ external: true, pending: [] });
  });

  it('adopts a late-arriving stored value into an empty editor', () => {
    expect(classifyIncoming('stored text', '', [])).toEqual({ external: true, pending: [] });
  });

  it('adopts a translation even though the editor has unechoed typing of its own', () => {
    // The external write wins; the typing still in flight is discarded with it.
    expect(classifyIncoming('Hello', 'abc', ['a', 'ab', 'abc'])).toEqual({
      external: true,
      pending: [],
    });
  });

  it('adopts a value equal to something stored long ago, once we have edited since', () => {
    // The field held "Hello"; we edited to "Hello world"; re-translating produces "Hello"
    // again. "Hello" was never a write of ours, so it is external — treating it as an
    // echo because it matches old content would leave the editor out of step.
    expect(classifyIncoming('Hello', 'Hello world', ['Hello world'])).toEqual({
      external: true,
      pending: [],
    });
  });
});

describe('rememberWrite', () => {
  it('appends what the editor wrote, newest last', () => {
    expect(rememberWrite(['a'], 'ab')).toEqual(['a', 'ab']);
  });

  it('does not repeat a write that changed nothing', () => {
    expect(rememberWrite(['a', 'ab'], 'ab')).toEqual(['a', 'ab']);
  });

  it('stays bounded, keeping the newest writes', () => {
    let pending: string[] = [];
    for (const content of ['1', '2', '3', '4', '5']) {
      pending = rememberWrite(pending, content, 3);
    }

    expect(pending).toEqual(['3', '4', '5']);
  });
});
