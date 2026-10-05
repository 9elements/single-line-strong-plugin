/**
 * Reads the value at a dot-path out of the form's values — in practice
 * `getValueAtPath(ctx.formValues, ctx.fieldPath)`.
 *
 * `fieldPath` is a *dot-path* into the (nested) `formValues` object, not a flat
 * key. For a top-level field it's just the API key (e.g. `"title"`), so a bracket
 * lookup would happen to work — but for a field inside a block it looks like
 * `"content.de.content.2.headline"`, and `formValues["content.de.…"]` finds no
 * such literal key (returns `undefined`). We therefore traverse each segment,
 * with numeric segments indexing the block arrays. A localized field works the
 * same way: `headline.de` is the `de` key of the object held under `headline`, so
 * the form is keyed by the bare field name and holds one value per locale.
 * Mirrors DatoCMS's own `lodash.get(formValues, fieldPath)` idiom without pulling
 * in the dependency.
 *
 * Reads only. Always write with the dotted `ctx.fieldPath`: writing the bare field
 * name replaces the whole per-locale object and destroys every other locale.
 */
export function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
