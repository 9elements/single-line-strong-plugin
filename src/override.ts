/**
 * Which structured_text fields this plugin takes over, and what it calls itself
 * when it does.
 *
 * The structured_text route has two registrations. An *addon* is the opt-in
 * signal: enabling it on a field in the Presentation tab is how a modeller says
 * "edit this as single-line strong". An *override* then claims exactly those
 * fields at render time. Neither rewrites the field's editor identity, so
 * `ai-translations` and other tools still see an ordinary structured_text field —
 * which a manual editor extension would not allow.
 */

/** The addon a modeller enables on a structured_text field. */
export const STRUCTURED_TEXT_ADDON_ID = 'singleLineStrongAddon';

/** The editor the override swaps in for fields that carry the addon. */
export const STRUCTURED_TEXT_EDITOR_ID = 'singleLineStrongStructured';

/**
 * Whether the override should take over `field`.
 *
 * The override hook runs for EVERY field in the project, and anything that throws
 * inside it takes down the whole plugin handshake — DatoCMS then reports the plugin
 * as not responding, with nothing to say why. So this reads nothing it has not
 * checked, including properties the schema documents as required: `appearance.addons`
 * is absent on some fields in practice. Don't simplify the guards away.
 *
 * Takes `unknown` on purpose: the hook's own types promise more than the data
 * delivers.
 */
export function claimsField(field: unknown): boolean {
  const attributes = (field as { attributes?: unknown } | null | undefined)?.attributes;
  if (!attributes || typeof attributes !== 'object') return false;

  const { field_type: fieldType, appearance } = attributes as {
    field_type?: unknown;
    appearance?: unknown;
  };
  if (fieldType !== 'structured_text') return false;
  if (!appearance || typeof appearance !== 'object') return false;

  const { addons } = appearance as { addons?: unknown };
  if (!Array.isArray(addons)) return false;

  return addons.some(
    (addon) =>
      !!addon &&
      typeof addon === 'object' &&
      (addon as { field_extension?: unknown }).field_extension === STRUCTURED_TEXT_ADDON_ID,
  );
}
