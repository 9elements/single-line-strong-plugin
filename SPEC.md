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
- Publishing to the public DatoCMS marketplace.
