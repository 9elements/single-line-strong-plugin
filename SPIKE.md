# Spike: structured_text + overrideFieldExtensions

**Branch:** `spike/structured-text-override`
**Opened:** 2026-10-02
**Status:** not started
**Timebox:** half a day

Throwaway investigation. Nothing here is meant to ship. Its only job is to answer
two pass/fail questions before any implementation work begins.

Background, the direction being tested, verified facts and rejected alternatives all
live in **SPEC.md → "Open design question: translatability"**. This file is the
procedure and the results.

---

## Why this spike exists

The whole direction rests on one architectural inference that the SDK source implies
strongly but **no documentation states**, and the DatoCMS host is closed-source:

> `overrideFieldExtensions` is a pure synchronous function with no write path to the
> field record, so a field it overrides keeps `appearance.editor === "structured_text"`
> and remains visible to tools that dispatch on the editor name.

If that is false, the direction is dead. Everything else — the dast bridge, the addon
opt-in, the migration story — is downstream of it. Building any of it first would be
building on sand.

---

## Questions

### Gate — these decide the whole direction

**G1. Does `overrideFieldExtensions` leave `appearance.editor` native?**

Setup: a scratch DatoCMS project, one model, one `structured_text` field configured

```
parameters: { marks: ['strong'], nodes: [], heading_levels: [] }
validators: { structured_text_blocks: { item_types: [] },
              structured_text_links:  { item_types: [] } }
```

and a stub plugin registering `overrideFieldExtensions` that returns an `editor`
override for that field. The override renders a plain `<input>` — **no Lexical, no
bridge, no styling.**

Check: read the field via the CMA and inspect `attributes.appearance.editor`.

- PASS → still `"structured_text"`
- FAIL → anything else (notably the plugin's UUID)

**G2. Does `ai-translations` work on that field?**

With the override active, install the DatoCMS `ai-translations` plugin in the same
scratch project.

Check, in order:
1. Does the field's ⋯ menu offer "Translate to" / "Translate from"? (If the field is
   filtered out, no action appears at all.)
2. Run a translation on a value containing a bold run.
3. Inspect the resulting dast: is `marks: ['strong']` still present, on the
   corresponding translated text?

- PASS → action appears, translation completes, `strong` survives
- FAIL → action absent, or marks lost/moved/malformed

> Expectation for 3 is that marks survive **structurally** — `ai-translations`
> collects only `span.value` strings and writes them back into a clone of the
> original tree, so the mark array is never shown to the model. Confirming this end
> to end is the point.

### Secondary — cheap to answer while in there, not gating

**S1.** Does the addon-as-opt-in-signal work end to end? Declare a
`manualFieldExtensions` entry with `type: 'addon'` and `configurable: true`, enable
it on the field via the Presentation tab, confirm `appearance.editor` is *still*
native, confirm it lands in `appearance.addons`, and confirm the override can read
its per-field parameters from the `field` argument.

**S2.** What unit does the `length` validator count on `structured_text`? Set
`max: 10`, then try saving values that differ in where the characters sit — one
paragraph of 12 visible characters; two paragraphs of 6 each; a value with a bold run
(to confirm mark markup is not counted). The "number of characters" doc string is
copy-shared with the `string` validator, so it is not evidence; the extraction rule
over a dast tree is undocumented.

**S3.** What does the field look like if the override fails to load (plugin
unreachable, JS error)? DatoCMS should fall back to the native editor. Capture a
screenshot — this is the cosmetic worst case, and worth knowing. For comparison, the
current JSON field's fallback is a raw JSON textarea.

---

## Procedure

1. Scratch DatoCMS project. Do **not** use a project with real content.
2. One model, one `structured_text` field, configured as in G1.
3. Stub plugin — a `overrideFieldExtensions` returning an `editor` override, rendering
   a plain `<input>` wired to `ctx.setFieldValue` with a hand-built dast document.
   Minimal valid shape:

   ```json
   {
     "schema": "dast",
     "document": {
       "type": "root",
       "children": [
         { "type": "paragraph", "children": [
           { "type": "span", "marks": ["strong"], "value": "bold text" }
         ]}
       ]
     }
   }
   ```

   `span` requires `value`; `marks` is optional. The mark name is `"strong"`, never
   `"bold"`.
4. Answer G1. **If it fails, stop and record the result — do not continue.**
5. Answer G2. Same rule.
6. Answer S1–S3 if time remains.
7. Record results below, commit, and bring them back to the design discussion.

Note: `overrideFieldExtensions` is **synchronous** — no `await` inside it. `ctx.fields`
and `ctx.itemTypes` are lazily-populated `Partial` records; anything cross-field must
be warmed in `onBoot`. Not expected to matter for a stub, but it will shape the real
implementation.

---

## Results

> Fill in as you go. Record what was actually observed, including anything
> surprising or ambiguous — a half-answer recorded honestly is worth more than a
> clean-looking guess.

| | Question | Result | Notes |
|---|---|---|---|
| G1 | `appearance.editor` stays native | **PASS** | Reads `structured_text` while the override is rendering. The inference the whole direction rested on is confirmed empirically. |
| G2 | ai-translations works, `strong` survives | **PASS** | The Translate action appears on an overridden field, runs, and writes the target locale. A value carrying `{"text":"form","strong":true}` round-tripped with the mark intact. Caveat: the test string was identical in both languages, so mark *placement* under real translation is still unproven — see below. |
| S1 | Addon opt-in signal works | **PASS** | Addon lands in `appearance.addons` as `<pluginId>/spikeOptIn`, and the editor identity stays native alongside it. The override reads it back and claims the field. |
| S2 | `length` unit | partial | A `max: 60` validator reported "Feld darf nicht mehr als 60 Zeichen lang sein" on an **empty** field, so it is not counting visible characters as expected. Needs a deliberate test. |
| S3 | Fallback appearance | — | |

### Confirmed: a mark stays on the right word

Tested with text that genuinely changes across languages:

```
de: [{"text":"Der schnelle "},{"text":"Fuchs","strong":true}]
en: [{"text":"The fast "},{"text":"Fox","strong":true}]
```

The mark moved from *Fuchs* to *Fox*. Marks track **meaning**, not character
position, and the leaf boundary survived translation intact.

This is the empirical confirmation of the argument that chose dast over inline
`**bold**` markers: because `ai-translations` translates each leaf's text separately
and writes it back at the same path, the mark array is never exposed to the model and
cannot be dropped, moved or unbalanced. With inline markers the markers *are* the
payload and carry all of those risks.

Note the mechanism's cost, not observed here but worth knowing: each leaf is
translated as an independent string, so the model never sees the whole sentence. On a
short headline that is fine; on longer text with several marked runs it could produce
awkward fragments. Their source carries defensive post-processing for exactly this
(`enforceBoundarySpaces`).

### Unplanned finding: localized fields read and write by different paths

On a localized field, `ctx.fieldPath` is `headline.de`, but `ctx.formValues` is keyed
by the **bare field name** and holds a per-locale object:

```json
{ "internalLocales": [...], "headline": { "de": <value>, "en": <value> } }
```

So `ctx.formValues[ctx.fieldPath]` is always `undefined` — the editor reads as
permanently empty while writes to the dotted path succeed. **Write with the dotted
path; read by splitting it and unwrapping the locale.** Writing to the *bare* path
replaces the entire per-locale object and destroys every other locale.

This is the kind of defect that passes single-locale testing and corrupts content in
production. SPEC.md's assumption that "localized fields work automatically" needs
revisiting for the real implementation.

### Unplanned finding: `ctx.formValues` lags `setFieldValue`

`setFieldValue` resolves OK, but reading the path back immediately still yields the
previous value. An input driven directly off `formValues` therefore loses every
keystroke but the last. The editor needs local state as the source of truth for
in-progress edits, with `formValues` used only to seed it and to pick up external
changes — a translation writing a new value, undo, a locale switch.

This matters for the real implementation precisely because translation is an external
writer: the bridge has to distinguish "the user is typing" from "something replaced
the value underneath us".

### Unplanned finding: one React root per bundle is a trap

`main.tsx` keeps a single shared React root so the input does not lose focus between
re-renders. Adding a second extension to the same bundle broke that: the addon's
`render(null)` unmounted the editor the override had just mounted in its own frame,
which presented as an input that silently refused to accept typing — `disabled: false`,
handler never firing, no error anywhere.

Key the root per extension id, or give each extension its own.

### Unplanned finding: the form value is not dast

The field's in-form value (`ctx.formValues`) is the editor's **Slate** shape, not dast:

```json
[{ "type": "paragraph", "children": [{ "text": "Test me", "strong": true }] }]
```

A bare array, `text` rather than `value`, and marks as boolean keys on the leaf
(`strong: true`) rather than a `marks: ["strong"]` array. Dast — `{ schema, document }`
with `value` and a `marks` array — is what the CMA and GraphQL return.

Writing dast into the form is rejected; saving only worked once the stub wrote the
Slate shape. **Consequence for the real implementation:** the bridge maps Lexical ↔
Slate, not Lexical ↔ dast. Translation still operates on the stored dast, which is why
marks survive it, but the editor never sees that shape. Round-trip tests must target
whichever representation the module under test actually handles.

### Verdict

- [x] **PASS** — both gates clear, 2026-10-02.

`overrideFieldExtensions` leaves a field's editor identity native, so
`ai-translations` treats an overridden `structured_text` field exactly as it would an
untouched one: the Translate action appears, runs, and preserves `strong` on the
right word across a real translation. An addon works as the per-field opt-in signal
without reintroducing the gate.

The technical question the spike existed to answer is settled. **The remaining
decision is not technical**: whether to accept that the plugin would own rendering
only, with no storage format of its own (SPEC.md, direction item 5). That is
deliberately still open.

Four findings below cost real debugging time and would have been worse to hit
mid-implementation. They belong in the implementation spec, not just here.

---

## Follow-up: the authoring half is untested

Every gate here measured the **stored value**. Nothing tested the editing experience,
by design — G1 and G2 were about ecosystem visibility, not authoring.

The stub renders a single `<input>` with one bold flag for the whole value, so a
value marked only on *Fox* displays entirely unbolded. That is a limitation of the
stub, not a defect: a plain input cannot render partial formatting at all.

What remains unproven is that **Lexical maps cleanly onto DatoCMS's Slate shape** —
authoring partial bold, selecting across a mark boundary, splitting and merging leaves
as marks are toggled. The format is undocumented, so there is no spec to check an
implementation against.

A second, smaller spike would settle it: point the existing Lexical editor's bridge at
the Slate shape instead of the segment array and see whether authoring partial bold
round-trips. Roughly half a day.

Alternatively treat it as acceptable risk. Lexical does per-run formatting natively,
and `segment-bridge.ts` already demonstrates mapping its node tree to a run-based
format; the two structures are close enough that it should work. The risk is schedule,
not viability.

## What this spike does *not* decide

- Whether to migrate. A passing spike proves the direction is *possible*, not that it
  is *chosen*.
- Whether the thin plugin (rendering only, no storage format) is worth maintaining.
  That is a judgment call, deliberately left open in SPEC.md.
- Anything about the existing JSON entrypoint, which stays regardless — there are
  marketplace installs that cannot be migrated by us.
