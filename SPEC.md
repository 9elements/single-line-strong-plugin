# Single-line Strong — DatoCMS Plugin Spec

## Summary

A DatoCMS **manual field extension** that turns a **JSON field** into a single-line
text editor where selected text can be made **bold**. Editors get a normal-looking
single-line text input; the field stores structured data (a segment array). A
separate render helper (built later, out of scope for this plugin) converts the
stored JSON into HTML such as:

```
This is my <strong>highlighted</strong> text
```

## Why a JSON field (not a String field)

The GraphQL API returns a field's stored value verbatim — there is no server-side
transform for custom plugins. We deliberately store **structured JSON** rather than
raw HTML for robustness (no HTML parsing/sanitizing in the CMS). The JSON→HTML
transform is a **frontend render helper**, owned by the consuming app, and is **out
of scope** for this plugin.

> **Correction (2026-10-02).** The framing above — structured JSON *versus* raw HTML
> — is a false dichotomy, and the rationale it supports does not hold up.
>
> The real alternative to a private segment array was never HTML. It was DatoCMS's
> own `structured_text` field, whose stored value is **dast**: a JSON tree with a
> published, machine-readable schema, validated server-side. Choosing it involves no
> HTML parsing and no sanitizing — it delivers every robustness property this section
> asks for, and adds server-side schema validation that a private segment array can
> never have (our format is validated only by our own code).
>
> The actual trade-off was **our JSON schema vs. theirs**, and that trade-off was not
> evaluated. Owning the format bought control and cost compatibility: because the
> stored value is opaque to DatoCMS, no other tool can read or write this field.
>
> The first bill for that isolation is **translation**. The `ai-translations` plugin
> gates on `field.attributes.appearance.editor`; registering via
> `manualFieldExtensions` overwrites that with our plugin ID, so the field is skipped
> before its value is ever inspected. Even past that gate, a `json` field falls to
> that plugin's `default:` branch, which stringifies the value for the LLM and never
> parses the result — so segment-array integrity would rest on model behaviour alone.
> The same wall applies to every other format-aware tool, present and future.
>
> This correction records that the stated rationale is wrong. It does **not** by
> itself decide a migration — see the open design question below.

## Data contract

The plugin reads/writes a **segment array**:

```json
[
  { "text": "This is my ", "bold": false },
  { "text": "highlighted", "bold": true },
  { "text": " text", "bold": false }
]
```

Rules:

- **Empty field → stored value is `null`** — clean semantics for Dato `required`
  validation and "is empty" filters.
- **Non-empty → normalized array:**
  - adjacent segments with the same `bold` value are **merged**,
  - **no empty-text** (`""`) segments.
- Bold is the **only** mark. The field's identity is single-line + strong.

## Editor

- **Engine:** [Lexical](https://lexical.dev), configured with the **Bold mark only**;
  all other nodes/marks disabled.
- **Stack:** React + Vite + **TypeScript**, scaffolded from the official DatoCMS
  plugin template, using `datocms-plugin-sdk` + `datocms-react-ui`.
- **Bold toggle:** a **fixed "B" toolbar button** plus the **Cmd/Ctrl+B** shortcut.
  The button reflects the active state of the current selection.
- **Single-line enforced:** Enter and Shift+Enter do nothing (no line breaks ever
  enter the document).
- **Paste = plain text:** all formatting is stripped (including bold), and any
  newlines are collapsed to spaces.
- **WYSIWYG:** the editor renders bold visually (actual bold text), never showing
  raw `<strong>` or JSON to the editor.
- **Placeholder:** optional, configurable per field.

## Length limit

- Optional **max character count**, configured per field.
- Counts **visible text only** (bold markup does not count).
- Shows a **live "X/Y" counter**.
- **Hard-blocks** input once the limit is reached (typing/paste beyond the max is
  rejected).

> Constraint: a field-editor plugin **cannot** hook DatoCMS's save-time validation
> pipeline, so the limit is enforced at input level rather than blocking record save.

## Registration & distribution

- **Manual field extension**, restricted to `fieldType: 'json'`. The editor
  explicitly selects "Single-line strong" as the editor for a JSON field.
- **Per-field config screen** with: max length, placeholder text.
- **Private, self-hosted:** the built app is deployed (e.g. Vercel/Netlify) and
  registered in the Dato project by URL. No public marketplace listing.

## Assumed defaults

1. **Localized fields** work automatically — Dato provides each field-editor
   instance with its locale.
2. When the field is **disabled/read-only** in Dato, the editor renders
   non-editable but still shows bold styling.
3. **Undo/redo** is whatever Lexical provides out of the box; no custom history.

## Build order

1. SDK registration + plugin manifest (declare the manual field extension + config).
2. Lexical editor with bold mark + single-line enforcement.
3. Segment-array serialization + normalization (Lexical state ⇄ segment array,
   `null`-when-empty).
4. Per-field config screen + live counter + hard-block limit.
5. Deploy + register as a private plugin in Dato.

## Out of scope

- The JSON→HTML render helper (owned by the consuming frontend/app).
- Marks other than bold.
- Multi-line / paragraph support.

> The original scope excluded publishing to the public DatoCMS marketplace. That is no
> longer true: the plugin is listed and has external installs, which is why the JSON
> route cannot be migrated or sunset by us.

## Open design question: translatability (2026-10-02)

**Status: decided, not yet built.** The spike passed both gates (see `SPIKE.md`) and
the rendering-only scope was accepted on 2026-10-02. The implementation spec is
`docs/specs/0001-structured-text-route.md`.

Still not planned or approved: migrating any existing JSON field. The JSON route stays
indefinitely. This section remains as the record of why the direction was chosen and
what was rejected.

### The problem

Fields using this plugin cannot be translated by the DatoCMS `ai-translations`
plugin, which is in common use (including at 9elements). See the correction under
*Why a JSON field* for the mechanism. The root cause is **not** the JSON field type
— it is that `manualFieldExtensions` overwrites `appearance.editor` with our plugin
ID, making the field invisible to every tool that dispatches on the editor name.

### Direction under consideration

A `structured_text` field, natively configured, with the editor swapped at render
time:

1. **Storage becomes dast** — one paragraph, `strong` the only mark. The field is
   configured natively with `parameters: { marks: ['strong'], nodes: [], heading_levels: [] }`
   and validators `structured_text_blocks: { item_types: [] }`,
   `structured_text_links: { item_types: [] }`.
2. **`overrideFieldExtensions` instead of `manualFieldExtensions`.** This is the
   actual fix: the override is a runtime render decision that does not write to the
   field record, so `appearance.editor` stays `"structured_text"` and format-aware
   tools treat the field as native.
3. **A `type: 'addon'` extension as the opt-in signal.** Addons append to
   `appearance.addons` and leave `appearance.editor` untouched, so they restore a
   Presentation-tab switch *and* provide a per-field config screen without
   reintroducing the gate.
4. **The JSON entrypoint stays indefinitely** as a legacy mode. The plugin is on the
   marketplace with external installs that cannot be migrated by us; a sunset we can
   neither observe nor enforce would be a threat, not a plan.
5. **The structured_text extension would own rendering only** — no storage format, no
   data contract, no render helper. Its Lexical↔value bridge is internal plumbing, not
   a published contract. **Accepted 2026-10-02.**

   This applies to the *new* extension only. The JSON extension keeps its segment
   array, its normalization rules and its render helper unchanged — `segments.ts` and
   `segment-bridge.ts` remain a real contract in that entrypoint. The asymmetry is
   deliberate: one editor owns a format because it must, the other does not because it
   need not.

### Verified facts

Confirmed against the DatoCMS CMA schema, the dast JSON Schema, `datocms-plugin-sdk`
v2.5.0 source, and the `ai-translations` source:

- **A single-paragraph field is not expressible natively.** `paragraph` is absent
  from the editor's `nodes` union, so paragraphs cannot be disabled; and the complete
  five-key validator set for `structured_text` (`required`, `structured_text_blocks`,
  `structured_text_links`, `length`, `structured_text_inline_blocks`) contains nothing
  constraining node count. This is the structural gap that justifies a field
  extension at all.
- **dast marks survive translation by construction.** `ai-translations` collects only
  `span.value` strings, sends that flat array to the model, and writes results back
  into a clone of the original tree. `marks: ['strong']` is never shown to the LLM and
  never rewritten.
- **Addons do not touch `appearance.editor`.** Confirmed by the CMA hyperschema's own
  example; addons live in a disjoint `appearance.addons` array and support
  `configurable: true` config screens exactly as editors do.
- **`overrideFieldExtensions` receives the full raw CMA `Field`** — `validators`,
  `appearance.parameters` and `appearance.addons` are all readable, so the override
  can gate on the field's own configuration. The hook is **synchronous**; any
  cross-field data must be warmed in `onBoot`.
- **The paragraph wrapper is permanent in storage** but need not reach rendered
  output — official renderers accept a `renderNode` rule to emit a `<span>`, or
  nothing at all.
- **The `length` validator applies to `structured_text`** (`{ min?, eq?, max? }`, at
  least one required), which could replace the current input-level character limit
  with save-time enforcement.

### Unverified — a spike must settle these first

Items 1 and 2 are pass/fail for the entire direction:

1. That `overrideFieldExtensions` leaves `appearance.editor === "structured_text"` in
   practice. The SDK source implies this strongly (pure sync hook, host-owned data
   flow, `ctx.updateFieldAppearance()` as the only mutation path), but no
   documentation states it and the host is closed-source.
2. That `ai-translations` then offers and completes a translation on such a field
   with `strong` intact.
3. That the addon-as-opt-in-signal works end to end.
4. The unit `length` counts on `structured_text`. The "number of characters" doc
   string is copy-shared with the `string` validator and is not independent evidence;
   the extraction rule over a dast tree is undocumented.
5. How the native editor degrades with `nodes: []`, for the case where the override
   does not load.

A stub override rendering a plain `<input>` is enough to test 1–3; no Lexical work is
needed to reach the gate.

### Rejected alternatives

- **Override on the JSON field.** Clears the editor gate but not the payload problem
  — `json` hits the `default:` branch, which hands the stringified value to the model
  and never parses the result. Appears to work until it silently corrupts a record.
- **A mirror `string` field** holding plain text. Translated text differs in length
  and word order, so bold offsets no longer map to anything.
- **Our own translate action** via `fieldDropdownActions`. Means owning an LLM
  integration — keys, cost, prompts, model choice — inside a bold-button plugin, and
  fixes only translation.
- **An addon that strips extra paragraphs.** Addons render beneath the editor and
  cannot intercept keystrokes, so this either destroys content silently on
  auto-collapse or amounts to a warning the field hint already provides. It also
  leaves the multi-row appearance that invites paragraphs in the first place.
- **A `string` field storing inline markers (`**bold**`).** The most seriously
  considered alternative, and natively single-line — no paragraph wrapper, no
  node-count problem, `single_line` is on the `ai-translations` supported list, and
  the `length` validator's unit is unambiguous there. Editors would still never see
  the markers: the override would render the same WYSIWYG bold button and serialize
  to markers underneath. **Rejected on mark integrity.** With dast, marks are never
  shown to the model and survive structurally. With markers, the markers *are* the
  payload — a model can drop them, move them to the wrong words (word order differs
  across languages), unbalance them, or escape them, all silently. It also
  reintroduces exactly the string parsing, escaping and sanitizing this spec
  originally set out to avoid — unbalanced markers, nested markers, literal asterisks
  in content. Fixing "cannot translate" by introducing "translates incorrectly,
  invisibly" is a bad trade when translation is the entire motivation. Secondary
  point: on a `string` field the native editor already works, so the plugin would be
  pure polish rather than filling a structural gap.
- **Storing dast on the existing JSON field.** Clears nothing. The editor gate still
  fires (`appearance.editor` is still the plugin ID), so the field is skipped before
  its value is inspected; and past the gate, `json` still reaches the `default:`
  branch, because handlers are selected by field type, not by sniffing content shape.
  The result would be DatoCMS's format with none of DatoCMS's tooling, and no
  server-side dast validation — that comes with the field type. More generally:
  DatoCMS dispatches on field type and editor, never on content shape, so "adopt
  their format" is not separable from "use their field type".

### Two clarifications worth holding on to

**Appearance stays ours; only storage moves.** `overrideFieldExtensions` returning an
`editor` is a *full* replacement of the native editor UI, not a layer over it — the
native toolbar and multi-row text area do not render. The single-line headline
appearance is therefore unaffected by this direction; it is the one thing the plugin
would still own outright. What is given up is the stored format, which editors never
see. The only degradation is the fallback case where the override fails to load and
DatoCMS renders the native editor (spike item 5) — cosmetic, and arguably better than
today's fallback, which is a raw JSON textarea.

**Single paragraph: enforced, not guaranteed.** Our editor swallows Enter, so nobody
typing in the field can create a second paragraph. But the *schema* permits them and
nothing can forbid them (see Verified facts), so a CMA script or bulk import could
still write one. Note the integration that motivates this work cannot: `ai-translations`
rewrites `span.value` inside a clone of the original tree, leaving the structure
immutable. The mitigation is to normalize on load — flatten for display, surface a
non-blocking notice, and never write on mount. This is the same class of constraint we
already live with: the current character limit is likewise editor-level only, as noted
under *Length limit*. Against today's baseline it is a net gain, since a JSON field has
no server-side validation at all, while dast is schema-validated server-side.

### Deferred until the spike reports

Strip-on-load semantics for non-conforming incoming values (never write on mount;
likely normalize for display plus a non-blocking notice), the `length` unit question,
the release plan, and how much field-setup guidance ships with it.
