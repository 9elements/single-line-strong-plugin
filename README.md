# Single-line Strong — DatoCMS Plugin

A DatoCMS manual field extension that turns a JSON field into a single-line text
editor where selected text can be made **bold**. See [SPEC.md](SPEC.md) for the
full design.

## Status

Walking skeleton (issue #1): scaffolded React + Vite + TypeScript plugin that
registers a **manual field extension** on `json` fields and round-trips a raw
value via `setFieldValue`. No bold / Lexical / segment-array logic yet.

## Tech stack

React 19 + Vite + TypeScript, using `datocms-plugin-sdk` + `datocms-react-ui`.

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
