# Single-line Strong — DatoCMS Plugin

A DatoCMS manual field extension that turns a JSON field into a single-line text
editor where selected text can be made **bold**. See [SPEC.md](SPEC.md) for the
full design.

## Status

Bold editing (issue #3): a **Lexical** editor with **bold as the only mark**.
A fixed "B" toolbar button and Cmd/Ctrl+B toggle bold on the selection (the
button reflects the active state); Enter/Shift+Enter never insert a line break;
paste is flattened to plain text (formatting stripped, newlines → spaces); bold
renders visually (WYSIWYG). The editor state serializes to the **normalized
segment array** stored on the `json` field — adjacent same-bold segments merged,
no empty segments, and an empty field stored as `null` (see [SPEC.md](SPEC.md)).

Still to come: per-field config screen + live counter / max-length (issue #4).

## Tech stack

React 19 + Vite + TypeScript, using `datocms-plugin-sdk` + `datocms-react-ui`,
with [Lexical](https://lexical.dev) as the editor engine.

## Local development

```bash
npm install
npm run dev      # serves the plugin at http://localhost:5173
npm run build    # typecheck (tsc -b) + production build into dist/
```

## Register against a Dato project (dev)

1. Run `npm run dev` to serve the plugin locally.
2. In your DatoCMS project: **Settings → Plugins → Add new plugin → Advanced**,
   and register it by URL with `http://localhost:5173` as the entry point.
   (Dato loads the plugin in an iframe from that URL.)
3. On a model, add or edit a **JSON field**. In the field's **Presentation** tab,
   choose **Single-line strong** as the editor. The extension only offers itself
   for `json` fields.
4. Edit a record: type in the field, save, and confirm the value persists and is
   restored on reload (and returned verbatim by the GraphQL API).

## Deploy + register as a private plugin (production)

The plugin is a static build hosted on **Netlify** and registered in the target
Dato project by URL. There is no public marketplace listing — it stays private to
the project it's registered in.

### 1. Deploy to Netlify

The repo ships a [`netlify.toml`](netlify.toml) with the build settings, so Netlify
needs no manual configuration:

- **Build command:** `npm run build`
- **Publish directory:** `dist`

Connect the GitHub repo to a Netlify site (or drag-and-drop a local `npm run build`
output). Netlify builds on push and serves the plugin at a stable public URL, e.g.
`https://<your-site>.netlify.app`. That URL is the plugin entry point.

> Netlify sends no `X-Frame-Options` header by default, so DatoCMS can embed the
> plugin in its iframe. Don't add a framing header that would block embedding.

### 2. Register as a private plugin in Dato

1. In the target project: **Settings → Plugins → Add new plugin → Advanced**.
2. Set the **entry point URL** to your Netlify site URL (from step 1).
3. Give it a name (e.g. "Single-line strong") and save. The plugin now loads from
   the deployed URL instead of `localhost`.

### 3. Attach to a real field and verify

1. On a real model, add or edit a **JSON field**. In its **Presentation** tab,
   choose **Single-line strong** as the editor.
2. Edit a record: type a value, save, and confirm it persists and is restored on
   reload.
3. Query the field via the project's **GraphQL API** and confirm the stored value
   is returned verbatim.
