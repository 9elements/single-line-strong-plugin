/**
 * Telling a genuinely external change to a field from the echo of the editor's own
 * typing, so an editor can adopt the one without being overwritten by the other.
 *
 * The editor writes as you type, but the value coming back from DatoCMS lags: the
 * write resolves before the form shows the result. An incoming value can therefore
 * be what is already on screen, an old echo of something this editor wrote a moment
 * ago, or a change from outside — a translation, a script, a late-arriving stored
 * value. Only the last should replace what the editor shows.
 *
 * "Content" here is any stable string for an editor state, such as the JSON of its
 * normalized segments; this module never looks inside it.
 */

/** How many unechoed writes are remembered; far more than typing can outrun. */
export const MAX_PENDING_WRITES = 100;

/** What to do with an incoming value, and the writes still waiting for their echo. */
export type Classification = { external: boolean; pending: string[] };

/**
 * Classifies `incoming` against what the editor `current`ly shows and the contents it
 * has written that have not echoed back yet (`pending`, oldest first).
 *
 * An echo is recognised only as something the editor itself wrote — not as anything
 * it ever contained. Otherwise re-running a translation that happens to reproduce
 * old content would be mistaken for an echo and ignored, leaving the editor out of
 * step with what is stored.
 *
 * Seeing an echo clears it and every older write: they were superseded in order.
 */
export function classifyIncoming(
  incoming: string,
  current: string,
  pending: readonly string[],
): Classification {
  const echoed = pending.lastIndexOf(incoming);

  if (incoming === current || echoed >= 0) {
    return { external: false, pending: echoed >= 0 ? pending.slice(echoed + 1) : [...pending] };
  }
  // Something the editor never wrote. It wins, and typing still in flight is dropped
  // with it, since the value being adopted already replaces whatever it was based on.
  return { external: true, pending: [] };
}

/**
 * Records a write the editor has just made, newest last. Writes that changed nothing
 * are not repeated, and the list stays bounded so a long editing session cannot grow
 * it without end.
 */
export function rememberWrite(
  pending: readonly string[],
  content: string,
  limit = MAX_PENDING_WRITES,
): string[] {
  if (pending[pending.length - 1] === content) return [...pending];
  return [...pending, content].slice(-limit);
}
