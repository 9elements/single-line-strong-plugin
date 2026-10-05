/**
 * What a structured_text field's own configuration allows that the single-line
 * editor cannot show.
 *
 * A field backing this editor should allow the strong mark and nothing else: no
 * other marks, no nodes, no embedded blocks, no links to records. A field extension
 * cannot enforce that, so the addon's config screen reports the difference instead.
 * It only ever warns. A field that allows more still works — the editor flattens
 * what it cannot show — and refusing to would strand anyone whose field is set up a
 * little differently, for no gain.
 */

const BOLD_OFF =
  'Bold is switched off for this field, so the bold button would have no effect. ' +
  'Turn on the bold mark in the field’s Presentation settings.';

/**
 * Plain-language warnings about `field` — a structured_text field as DatoCMS
 * describes it, in practice the config screen's `ctx.pendingField` — or an empty
 * list when nothing needs saying.
 *
 * Takes `unknown` and never throws: the screen runs while a modeller is part-way
 * through editing the field, and DatoCMS describes it loosely. Anything it cannot
 * read is treated as "can't tell" and produces no warning, so a half-filled form
 * never raises a false alarm.
 */
export function permissivenessWarnings(field: unknown): string[] {
  const attributes = asRecord(asRecord(field)?.attributes);
  if (!attributes || attributes.field_type !== 'structured_text') return [];

  const parameters = asRecord(asRecord(attributes.appearance)?.parameters);
  const validators = asRecord(attributes.validators);
  const warnings: string[] = [];

  const marks = asStrings(parameters?.marks);
  if (marks) {
    if (!marks.includes('strong')) warnings.push(BOLD_OFF);
    const extra = marks.filter((mark) => mark !== 'strong');
    if (extra.length > 0) {
      warnings.push(
        `This field also allows ${list(extra)}, which the single-line editor cannot ` +
          'show. Only bold is supported, so those marks are dropped the next time the ' +
          'field is edited. Switch them off in the field’s Presentation settings.',
      );
    }
  }

  const nodes = asStrings(parameters?.nodes);
  if (nodes && nodes.length > 0) {
    warnings.push(
      `This field also allows ${list(nodes)}, which the single-line editor cannot ` +
        'show. Only the text is kept, so that formatting is lost the next time the ' +
        'field is edited. Switch them off in the field’s Presentation settings.',
    );
  }

  const kinds: [string, string][] = [
    ['structured_text_blocks', 'embedded blocks'],
    ['structured_text_inline_blocks', 'inline blocks'],
    ['structured_text_links', 'links to other records'],
  ];
  for (const [validator, label] of kinds) {
    const itemTypes = asStrings(asRecord(validators?.[validator])?.item_types);
    if (itemTypes && itemTypes.length > 0) {
      warnings.push(
        `This field also allows ${label}, which the single-line editor cannot show ` +
          'and drops the next time the field is edited. Remove the allowed types in the ' +
          'field’s Validations settings.',
      );
    }
  }

  return warnings;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The strings in a list, or `undefined` when it is not a list at all. */
function asStrings(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

/** `a`, `a and b`, `a, b and c`. */
function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
