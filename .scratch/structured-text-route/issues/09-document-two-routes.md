# 09 — Document the two routes and mark the JSON one legacy

**What to build:** Someone setting up a new field lands on the structured_text route
without having to work out that two routes exist. Someone already using the JSON route
learns that it is still supported, and that new fields should go the other way.

**Legacy, not deprecated.** The JSON route is supported indefinitely — the plugin is on
the marketplace with external installs whose content we cannot migrate, so a sunset we
can neither observe nor enforce would be a threat rather than a plan. The wording
everywhere should say *legacy: supported, not recommended for new fields*, and must not
imply removal. A deprecation notice that never leads to removal only teaches people to
ignore notices.

**The distinction to explain.** The two routes are chosen by **field type**, and a
field's type is fixed at creation — there is no switch, and an existing field cannot
drift from one to the other:

- A **JSON** field offers "Single-line strong" in its editor dropdown. Picking it
  replaces the field's editor identity with the plugin's own, which is why tools like
  `ai-translations` skip the field.
- A **structured_text** field does not offer it there. Instead the modeller enables the
  **Single-line strong addon**, and the plugin takes over rendering at display time.
  The field keeps identifying as `structured_text`, so translation and other
  format-aware tooling treat it as native.

Moving an existing field across is not a switch but a new field plus a content
migration and a frontend change. Say so plainly rather than leaving people to discover
it.

**Where it needs to appear.** The in-product note is the one that actually prevents a
wrong choice; the rest is for people already reading.

- The **JSON route's config screen** carries a quiet, non-blocking note with a link to
  the structured_text setup instructions. No warning icon — this is guidance, not an
  error, and the field in front of them is working correctly.
- The **README** explains both routes, which to pick, and why the JSON one still
  exists.
- The **marketplace description** points a fresh installation at the structured_text
  route.
- The **changelog** announces the new route and the legacy positioning at release.

**Blocked by:** 04 (render structured_text field).

**Status:** done

- [x] The JSON config screen shows a non-blocking legacy note linking to the
      structured_text setup instructions
- [x] The note does not block or interfere with configuring a JSON field
- [x] The README documents both routes, how each is enabled, and which to choose for a
      new field
- [x] The README states that moving an existing field across means a new field plus a
      content migration, and that no migration is required
- [x] The marketplace description directs new installations to the structured_text
      route
- [x] The changelog entry describes the new route and the legacy positioning
- [x] Nothing anywhere implies the JSON route will be removed
