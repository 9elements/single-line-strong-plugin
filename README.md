# Single-line Strong — DatoCMS Plugin

A DatoCMS manual field extension that turns a JSON field into a single-line text
editor where selected text can be made **bold**. See [SPEC.md](SPEC.md) for the
full design.

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

## Publish to the DatoCMS Marketplace

For a public, one-click-installable listing, DatoCMS serves the plugin's built
assets straight out of the **published npm package** — the Netlify host below is
not involved in the marketplace flow.

Requirements (already configured in [`package.json`](package.json)):

- `name` prefixed with `datocms-plugin-`, a `homepage`, and an MIT `license`
- `keywords` includes `datocms-plugin`
- a `datoCmsPlugin` block with `title`, `entryPoint` (`dist/index.html`) and
  `permissions`
- `files: ["dist", "docs"]` (plus a [`.npmignore`](.npmignore)) so the built
  plugin ships in the tarball; `prepublishOnly` rebuilds `dist/` before every
  publish

Optional but recommended — a `coverImage` and `previewImage` for the listing.
These are **not** wired up yet because the files don't exist; add real raster
assets (no SVG) as described in [`docs/README.md`](docs/README.md), then add the
two keys to the `datoCmsPlugin` block.

Before publishing, confirm the tarball contains `dist/index.html`, the bundled
assets, and any listing images:

```bash
npm pack --dry-run   # inspect the file list
npm publish          # runs prepublishOnly → npm run build first
```

DatoCMS scans npm for the `datocms-plugin` keyword and adds the plugin to the
Marketplace automatically, usually within an hour. Bump `version` in
`package.json` for every republish — npm rejects a re-publish of an existing
version.

## Deploy + register as a private plugin (production)

Alternatively, keep the plugin private to a single project: host the static build
on **Netlify** and register it in the target Dato project by URL — no marketplace
listing.

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
