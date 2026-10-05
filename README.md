# Single-line Strong — DatoCMS plugin

A DatoCMS manual field extension that turns a **JSON field** into a single-line
text input where selected text can be made **bold** — and nothing else. Editors
get a clean one-line field; the value is stored as structured JSON (a segment
array), so there's no HTML to parse or sanitize.

![Single-line Strong](docs/cover.png)

## Two ways to use it

The route is chosen by the **field type**, which is fixed when the field is created —
there is no switch.

| | **Structured text** (recommended) | **JSON** (legacy) |
|---|---|---|
| Field type | Structured text | JSON |
| How you enable it | Enable the **Single-line strong** addon in Presentation | Pick **Single-line strong** as the editor in Presentation |
| Field identifies as | `structured_text`, so translation and other format-aware tools treat it as native | the plugin’s own editor, so tools like `ai-translations` skip it |
| Length limit | The field’s native length validator, enforced at save | The plugin’s own setting, enforced in the editor only |

**For a new field, use Structured text.** The JSON route is **legacy: supported, not
recommended for new fields.** It stays supported — existing installs keep working and
nothing is being removed — it is simply not where new fields should start.

Moving an existing JSON field to Structured text is not a setting you can change. It
means creating a new field, migrating the content, and updating your frontend. No
migration is required: if the JSON route works for you, leave it as it is.

## Features

- **Bold, and only bold.** A fixed **B** toolbar button and the native
  **⌘/Ctrl + B** shortcut toggle bold on the current selection. No other marks or
  block types exist.
- **Single line, always.** Enter and Shift+Enter never insert a line break.
- **Plain-text paste.** Pasted content is stripped of all formatting and any
  newlines are collapsed to spaces.
- **WYSIWYG.** Bold renders as actual bold text — editors never see `<strong>` or
  raw JSON.
- **Optional length limit.** Set a max character count per field; a live “X/Y”
  counter shows progress and input is hard-blocked at the limit. Bold markup
  doesn’t count toward the limit.
- **Localization & read-only** are supported out of the box.

## Install

The plugin is on the DatoCMS Marketplace:

1. In your project: **Settings → Plugins → Add new plugin**.
2. Search for **Single-line strong** and install it.

Then attach it to a field:

1. On a model, add or edit a **JSON field** (the plugin only offers itself for
   `json` fields).
2. Open the field’s **Presentation** tab and choose **Single-line strong** as the
   editor.
3. *(Optional)* set a **Maximum character count**. Leave it empty for no limit.

That’s it — edit a record and the field behaves like a single-line input with a
bold toggle.

## Using it on a structured text field

The plugin can also take over a **Structured text** field. The field stays an
ordinary structured text field as far as the rest of DatoCMS is concerned; only the
editor you see changes.

Set the field up so it allows bold and nothing else:

1. Add a **Structured text** field to a model.
2. In its **Presentation** settings, allow the **bold** mark only, and allow no
   nodes (no headings, lists, links, quotes or code).
3. In its **Validations** settings, allow no embedded blocks, no inline blocks and no
   links to other records.
4. Back in **Presentation**, enable the **Single-line strong** addon.

If the field allows more than that, the addon’s settings panel says what — for
example “This field also allows emphasis and underline, which the single-line editor
cannot show.” It is only a heads-up: you can still save the field, and the editor
simply drops what it cannot show the next time the field is edited.

## Stored value

An empty field stores `null`. A non-empty field stores a JSON string holding the
normalized segment array plus a plain-text mirror:

```json
{
  "segments": [
    { "value": "This is my ", "mark": false },
    { "value": "highlighted", "mark": true },
    { "value": " text", "mark": false }
  ],
  "raw": "This is my highlighted text"
}
```

Each segment is a run of text that is either bold (`mark: true`) or not. The array
is normalized — adjacent runs with the same mark are merged and there are no empty
runs — so a given rendered text always serializes to exactly one array. See
[SPEC.md](SPEC.md) for the full data contract and normalization rules.

## Rendering the value on your frontend

The JSON→HTML transform is owned by the consuming app (intentionally out of scope
for the plugin). A minimal renderer:

```ts
type Segment = { value: string; mark: boolean };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderStrong(fieldValue: string | null): string {
  if (!fieldValue) return '';
  const { segments } = JSON.parse(fieldValue) as { segments: Segment[] };
  return segments
    .map((s) => (s.mark ? `<strong>${escapeHtml(s.value)}</strong>` : escapeHtml(s.value)))
    .join('');
}
```

If you only need the unformatted text (slugs, meta tags), use the `raw` mirror
directly.

## Development

```bash
npm install
npm run dev      # serve the plugin at http://localhost:5173
npm run build    # typecheck (tsc -b) + production build into dist/
npm test         # run the segment / bridge test suites (vitest)
```

To try local changes against a real project, run `npm run dev`, then in DatoCMS go
to **Settings → Plugins → Add new plugin → Advanced** and register
`http://localhost:5173` as the entry-point URL. Dato loads the plugin in an iframe
from that URL, so changes hot-reload as you edit.

Built with React + Vite + TypeScript on `datocms-plugin-sdk` / `datocms-react-ui`,
using [Lexical](https://lexical.dev) as the editor engine.

## License

[MIT](LICENSE) © 9elements
