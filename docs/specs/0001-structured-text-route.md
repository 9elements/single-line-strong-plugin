# Spec: a translatable structured_text route

**Status:** ready for implementation
**Gated on:** nothing — the spike passed both gates (see `SPIKE.md`)
**Related:** `SPEC.md` → *Open design question: translatability*, ADR 0001

## Problem Statement

Teams using this plugin cannot translate the fields it renders. The DatoCMS
`ai-translations` plugin — widely used, including at 9elements — offers no Translate
action on them at all. Editors who translate a record locale by locale find every
other field handled and this one silently skipped, so each single-line strong field
has to be retyped by hand in every locale, and the bold runs reapplied from memory.

The cause is not the JSON field type. Registering the editor as a **manual field
extension** replaces the field's **editor identity** with the plugin's own ID, and
`ai-translations` decides what it can translate by reading exactly that. The field is
filtered out before its value is ever inspected. The same wall applies to any present
or future tool that dispatches on field type or editor identity — translation is
simply the first one to arrive.

Behind that gate sits a second problem: even if the field were reachable, its value is
a private segment array that no other tool understands.

## Solution

A second way to use the plugin, alongside the existing one.

A **structured_text** field is configured natively to allow the strong mark and
nothing else. The editor opts the field in by enabling a **Single-line strong** addon
on it. The plugin then takes over that field's rendering at display time, showing the
same single-line editor with a bold button that the JSON route already provides —
while the field continues to identify itself to the rest of DatoCMS as an ordinary
structured_text field.

The result is a field that looks and behaves like a one-line headline input to the
person editing it, and like a native structured_text field to every tool around it.
`ai-translations` offers Translate, runs, and preserves bold on the correct word.
Consuming apps render it with the official DatoCMS renderers instead of a helper we
wrote.

The existing JSON route is untouched. Projects already using it keep working with no
migration, indefinitely.

## User Stories

### Translating content

1. As a content editor, I want the Translate action to appear on a single-line strong
   field, so that I can translate it the same way I translate every other field.
2. As a content editor, I want bold to survive translation, so that I do not have to
   reapply it in each locale.
3. As a content editor, I want bold to land on the word that *means* what was bold in
   the source, so that emphasis is not silently moved to the wrong word when a
   language reorders a sentence.
4. As a content editor, I want to translate a whole record in one action and have this
   field included, so that I do not have to remember which fields the bulk translation
   skips.
5. As a content editor, I want a field translated by a machine to open correctly in
   the editor afterwards, so that I can review and adjust the result.

### Editing

6. As a content editor, I want the field to be one row tall, so that it reads as a
   headline field rather than a rich-text area.
7. As a content editor, I want pressing Enter to do nothing, so that I cannot
   accidentally turn a headline into two paragraphs.
8. As a content editor, I want a bold button and the Cmd/Ctrl+B shortcut, so that
   applying emphasis works the way it does everywhere else.
9. As a content editor, I want the bold button to reflect whether my current selection
   is bold, so that I can tell the current state at a glance.
10. As a content editor, I want to bold part of a line rather than all of it, so that I
    can emphasise a single word in a headline.
11. As a content editor, I want to see bold rendered as actual bold text, so that I
    never have to read markup or JSON.
12. As a content editor, I want pasted text to arrive as plain text on one line, so
    that pasting from a document does not drag in formatting or line breaks.
13. As a content editor, I want undo and redo to work, so that mistakes are cheap.
14. As a content editor, I want a read-only field to display its content with bold
    intact but refuse edits, so that permissions are obvious.
15. As a content editor working in several locales, I want each locale to hold its own
    value, so that editing one never disturbs another.

### Length

16. As a content editor, I want to see how many characters I have used against the
    limit, so that I can write to fit.
17. As a content editor, I want the character count to ignore bold markup, so that the
    number matches what readers will see.
18. As a content editor, I want a length limit to be enforced when the record saves, so
    that a value written by a machine translation cannot quietly exceed it.

### Configuring a field

19. As a content modeller, I want to turn an ordinary structured_text field into a
    single-line strong field by enabling an addon, so that the choice is explicit and
    visible where every other field setting lives.
20. As a content modeller, I want a warning when I enable the addon on a field that
    still allows headings, lists or links, so that I find out before an editor loses
    content rather than after.
21. As a content modeller, I want documentation of the exact field configuration, so
    that I can set it up correctly the first time.
22. As a content modeller, I want per-field settings such as placeholder text, so that
    different fields can be labelled for their purpose.
23. As a content modeller, I want to remove the addon and get the native editor back,
    so that the decision is reversible.

### Consuming the content

24. As a frontend developer, I want the field's value to be standard DatoCMS
    structured text, so that I can render it with the official renderers and write no
    custom helper.
25. As a frontend developer, I want to render the field without a paragraph wrapper, so
    that a headline can go inside my own heading element.
26. As a frontend developer, I want the GraphQL shape to be the documented one, so that
    I can look it up in DatoCMS's own documentation.

### Existing installations

27. As an existing user of the plugin, I want my JSON fields to keep working exactly as
    they do now, so that upgrading costs me nothing.
28. As an existing user, I want both routes available from one plugin installation, so
    that I can adopt the new one per field rather than all at once.
29. As an existing user, I want to understand what the two routes are and when to pick
    each, so that I can choose deliberately.

### Robustness

30. As a content editor, I want a value containing a second paragraph — written by a
    migration or an import — to open without destroying my record, so that unexpected
    content is recoverable.
31. As a content editor, I want to be told when the editor has had to normalise
    something it cannot represent, so that silent content loss does not happen.
32. As a content editor, I want merely opening a record never to modify it, so that
    browsing is safe.

## Implementation Decisions

### Registration

- The plugin registers a **field extension of type `addon`** restricted to
  `structured_text` fields, configurable so it carries per-field parameters. Enabling
  it is how a field opts in. An addon appends to the field's `addons` list and leaves
  its **editor identity** untouched — verified against the CMA hyperschema and
  confirmed empirically in the spike.
- The plugin registers an **`overrideFieldExtensions` hook** that claims exactly those
  fields: `structured_text`, carrying this plugin's addon. The override is a
  render-time decision that never writes to the field record, so the field continues
  to report itself as `structured_text`. This is the specific mechanism that makes the
  field translatable, and the reason a manual editor extension cannot be used.
- The existing JSON manual field extension is **registered unchanged**, from the same
  bundle. Two routes, one plugin.

### The override hook is hostile territory

- The hook runs **for every field in the project**, so anything that throws inside it
  takes down the entire plugin handshake — DatoCMS then reports the plugin as not
  responding, with no indication of the cause. Every property read must be defensive,
  including ones the schema documents as required: `appearance.addons` is absent on
  some fields in practice.
- The hook is **synchronous**. Nothing can be awaited inside it, and `ctx.fields` /
  `ctx.itemTypes` are lazily populated, so any cross-field data must be warmed earlier.

### Each extension gets its own React root

The current entrypoint keeps one module-level React root so the input does not lose
focus between re-renders. With more than one extension in the bundle this is actively
harmful: rendering into that shared root from one extension unmounts what another
extension mounted in its own frame, presenting as an editor that silently refuses
input. Roots must be keyed per extension ID.

### The in-form value is Slate, not dast

Inside the form, the field's value is the DatoCMS editor's own Slate-flavoured shape:

```
[{ type: 'paragraph', children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }] }]
```

A bare array; `text` rather than `value`; marks as boolean keys on the leaf rather than
a `marks` array. **Dast** — `{ schema, document }` with `value` and a `marks` array —
is what the CMA and GraphQL return, not what the form holds. Writing dast into the form
is rejected.

This shape is **not documented by DatoCMS**. It was established by having the native
editor write a bold value and reading back what it stored. Treat it as a format that
could change: isolate every assumption about it in one module, and make the test suite
the thing that catches a change.

A single leaf carrying a mark for an entire value did not persist in the spike, while
the native editor's multi-leaf output did. The cause was not established. Implementers
should assume per-run leaves are required and verify against a real field.

### Localized fields read and write by different paths

On a localized field `ctx.fieldPath` is `headline.de`, but `ctx.formValues` is keyed by
the **bare field name** and holds a per-locale object. So:

- **Write** using the dotted path.
- **Read** by splitting the path and unwrapping the locale.
- **Never write the bare path** — it replaces the whole per-locale object and destroys
  every other locale.

Reading `formValues[fieldPath]` directly yields `undefined` and the editor appears
permanently empty. This passes single-locale testing and corrupts content in
production, so it needs a test and a comment, not just care.

### The form value lags writes

`setFieldValue` resolves successfully, but reading the path back immediately still
yields the previous value. An editor driven directly off the form value loses every
keystroke but the last.

The editor holds its own state as the source of truth for in-progress edits and treats
the form value as a seed plus an external-change signal. Distinguishing "the user is
typing" from "something replaced the value underneath us" matters here specifically
because **translation is an external writer** — a translated value must reach the open
editor, while the user's own keystrokes must not be fought.

### Module shape

- **A new pure module** owns the Slate value and nothing else: parse a stored value
  tolerantly, normalise it, and serialise back. Normalisation flattens multiple
  paragraphs to one, drops marks other than strong, merges adjacent runs sharing a
  mark, drops empty runs, and represents an empty field as no value at all. It imports
  neither Lexical nor React, and it is the single place that knows the undocumented
  Slate shape.
- **The existing editor component is reused unchanged.** It already accepts and emits
  `Segment[]`, with single-line enforcement, plain-text paste, the bold button, the
  character counter and read-only handling as plugins.
- **No new Lexical bridge.** The existing segment bridge already maps the Lexical node
  tree to and from `Segment[]`. The new route composes the new pure module with the
  existing bridge and editor.
- **`Segment` is reframed**: it is the shared in-memory representation of a run of
  text that is either bold or not, used by both routes. It stops being "the stored
  value" — that is true only of the JSON route. The glossary needs this edit.

### Field configuration is part of the product

A structured_text field backing this editor is configured with the strong mark only,
no nodes, and empty block and link validators. This cannot be enforced from a field
extension, so:

- The addon's config screen inspects the field's own configuration and **warns** when
  it allows marks or nodes this editor cannot represent.
- The documentation states the exact configuration.

It warns rather than blocks: a field that is merely over-permissive still works, and a
hard block would strand anyone whose field is configured slightly differently.

### Length

The per-field maximum character count moves to the **native `length` validator**,
which is enforced when the record saves and therefore applies to values written by
translation and the CMA — neither of which passes through our editor. The live counter
remains an editor affordance.

The unit `length` counts on structured_text is **unverified**. The documented wording
is shared with the string validator and is not independent evidence, and a `max: 60`
validator rejected an empty field during the spike. Establish the real behaviour before
relying on it; if it proves unusable, keep the input-level limit and document that it
is not enforced at save.

### Normalising incoming values

A value the editor cannot represent — a second paragraph, an unexpected mark — is
normalised **for display** and the editor surfaces a non-blocking notice. It is
**never written back on mount**: opening a record must not modify it. The normalised
form is persisted only when the user actually edits.

### What cannot be guaranteed

Single-paragraph is **enforced, not guaranteed**. Our editor prevents it; the schema
permits it and no validator constrains node count. A CMA script or import can still
produce one. Note that translation cannot: it rewrites leaf text inside a clone of the
original structure.

This is the same class of constraint the JSON route already lives with — its character
limit is likewise editor-level only. Against the current baseline it is a net gain,
since a JSON field has no server-side validation at all while structured_text is
schema-validated.

## Testing Decisions

A good test here describes behaviour an editor or a consuming app could observe, and
would survive the module being rewritten. Tests that assert on internal call sequences
or on the exact shape of intermediate state are not worth their maintenance.

### The new pure module — the one new seam

This is where the testing weight goes. It is pure, fast and exhaustively testable,
and it is the only place that encodes the undocumented Slate shape — so the suite is
also the alarm that fires if DatoCMS changes it.

Cover: parsing a well-formed value; parsing tolerantly (null, a bare array, a wrapped
object, garbage); the normalisation rules individually — multi-paragraph flattening,
unknown marks dropped, adjacent same-mark runs merged, empty runs dropped,
empty-field-is-no-value; and serialising back out, including the multi-leaf structure
the native editor produces.

Prior art: `src/segments.test.ts` tests exactly this kind of pure normalisation for the
JSON route and is the model to follow.

### Round-trip composition

The contract that matters is that a value survives the whole path and comes back
normalised: stored value → `Segment[]` → Lexical → `Segment[]` → stored value. The
segment bridge's existing test already proves the Lexical half of this with a headless
editor, so the new tests cover composition at the ends rather than re-deriving what is
already proven.

Prior art: `src/segment-bridge.test.ts`, including its use of a real headless Lexical
editor rather than a mock.

### Locale path handling

The read/write path asymmetry deserves a test even though it is a small amount of
logic, because the failure mode is destroying other locales' content and it does not
show up in single-locale testing. Extract the path resolution so it can be tested
without a live DatoCMS form.

### What is not unit-testable

Editor identity under the override, and translation round-tripping marks, cannot be
tested in this repo — they require a live DatoCMS project and the `ai-translations`
plugin. The spike verified both by hand and recorded the result. A regression in
either would surface in a real project, not in CI. `SPIKE.md` is the record; treat
re-verification as a manual step when the DatoCMS SDK is upgraded.

## Out of Scope

- **Migrating existing JSON fields.** The JSON route stays indefinitely. A migration
  script may follow as a separate, optional deliverable; it is not part of this work
  and no existing installation is expected to move.
- **Removing or deprecating the JSON route.** With marketplace installs we cannot
  observe, a sunset we can neither enforce nor measure would be a threat rather than a
  plan.
- **Marks other than strong**, and multi-line support. The field's identity is
  single-line and bold.
- **A render helper for the new route.** Consuming apps use the official DatoCMS
  renderers.
- **Creating or configuring fields on the user's behalf.** The plugin warns about
  misconfiguration; it does not fix it.
- **Guaranteeing single-paragraph at the schema level.** Not expressible; see above.
- **An upstream contribution to `ai-translations`.** Worth doing eventually so other
  plugins are not stuck behind the same gate, but it is not needed for this work and
  is not on this critical path.

## Further Notes

**Why this is a narrowing, not a broadening.** The plugin today owns an editor, a
storage format, normalisation rules, a render contract and length machinery. This route
owns only an editor. Every alternative that kept the private format made the plugin
larger — most of all building our own translation action, which would mean owning an
LLM integration inside a bold-button plugin. `SPEC.md` records the rejected
alternatives and why.

**The paragraph wrapper.** Dast has no inline-only document; a root takes block
children, so one paragraph is always present in storage. It need never reach rendered
output — the official renderers take a node rule that emits a span, or nothing at all.
A headline renders inside the app's own heading element regardless.

**Why the plugin still needs to exist.** A single-paragraph, strong-only field is not
expressible natively: `paragraph` is absent from the editor's node options, and the
complete five-key validator set for structured_text contains nothing constraining node
count. Both facts are schema-verified. The gap is structural and no roadmap item
suggests it is closing.

**Node version.** The toolchain requires Node 22 or newer — Vite 8 and Vitest 4 both
depend on a `node:util` export added in 22. The repo pins 20 via `.tool-versions`, under
which the build, the tests and the dev server all fail while `tsc` still passes. Worth
fixing alongside this work.

**Local development.** DatoCMS loads the plugin iframe in the browser, so registering it
as `http://localhost:5173` works directly — no tunnel. Chrome or Firefox only; Safari
blocks insecure localhost iframes.
