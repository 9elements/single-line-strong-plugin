---
status: accepted
---

# Store a private segment array on a JSON field

The plugin needs to persist which runs of a single line are bold. We chose a JSON
field holding a normalized segment array of our own design, on the reasoning that
structured JSON is more robust than storing raw HTML in the CMS, and that converting
to HTML is the consuming frontend's job.

## Considered options

The decision was framed at the time as **private structured JSON vs. raw HTML**, and
raw HTML was rejected for robustness. That framing was incomplete: the real
alternative was DatoCMS's own `structured_text` field, whose stored value (dast) is
also a JSON tree, needs no parsing or sanitizing, and is validated server-side
against a published schema. That option was not evaluated.

## Consequences

Because the stored value is opaque to DatoCMS, no other tool in the project can read
or write this field meaningfully. The plugin is the only safe way to edit it, and
every consuming app needs a render helper we wrote.

That isolation is reinforced by registering the editor as a *manual* field
extension, which replaces the field's **editor identity** with the plugin's own —
so format-aware tools skip the field before they ever inspect its value.

The first concrete cost is translation: the DatoCMS `ai-translations` plugin cannot
translate these fields. The same wall applies to any present or future tool that
dispatches on field type or editor identity.

Reversing this is expensive. The plugin is published on the DatoCMS marketplace with
external installs whose content we cannot migrate.

See `SPEC.md` → *Open design question: translatability* for the direction under
consideration and `SPIKE.md` for the investigation that gates it.
