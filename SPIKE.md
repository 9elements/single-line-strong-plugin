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
| G1 | `appearance.editor` stays native | — | |
| G2 | ai-translations works, `strong` survives | — | |
| S1 | Addon opt-in signal works | — | |
| S2 | `length` unit | — | |
| S3 | Fallback appearance | — | |

### Verdict

- [ ] **PASS** — both gates clear. The direction is real. Next open decision becomes
      whether to accept that the plugin owns rendering only (SPEC.md, direction
      item 5), then a full implementation spec.
- [ ] **FAIL** — gate blocked. The remaining options are an upstream PR to
      `ai-translations` adding a third-party opt-in, or accepting that this plugin
      stays outside the ecosystem. Record which gate failed and how.

---

## What this spike does *not* decide

- Whether to migrate. A passing spike proves the direction is *possible*, not that it
  is *chosen*.
- Whether the thin plugin (rendering only, no storage format) is worth maintaining.
  That is a judgment call, deliberately left open in SPEC.md.
- Anything about the existing JSON entrypoint, which stays regardless — there are
  marketplace installs that cannot be migrated by us.
