# Marketplace listing images

Drop the two listing assets here, then reference them from the `datoCmsPlugin`
block in [`../package.json`](../package.json). Both are **optional** — the plugin
lists and installs without them — but they make the Marketplace entry look
finished.

DatoCMS serves these from a CDN, so **SVG is not supported — rasterize first.**

| Key            | File (suggested)            | Purpose                                   | Size / format                                                              |
| -------------- | --------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `coverImage`   | `docs/cover.png`            | Banner at the top of the listing          | **1200×800** (3:2), PNG, keep < ~150 KB                                    |
| `previewImage` | `docs/preview.gif` or `.mp4`| Shows the editor in action (bold toggle)  | Landscape ~4:3 or 16:9 (e.g. 832×642 / 1280×720); GIF/PNG/WebP/JPG or MP4/MOV |

Sizes derived from DatoCMS's own official plugins (`shopify-product`,
`web-previews`, etc.), which all ship a **1200×800** `cover.png`. `previewImage`
has no enforced size — match your screen recording; a short GIF/MP4 of typing +
toggling bold, kept lean (a few hundred KB), makes the best preview.

## Wiring them up

Once the files exist, add these two keys **inside** the `datoCmsPlugin` object in
`package.json` (paths are relative to the package root, and `docs/` is already in
the `files` allowlist so they ship in the tarball):

```jsonc
"datoCmsPlugin": {
  "title": "Single-line strong",
  "entryPoint": "dist/index.html",
  "permissions": [],
  "coverImage": "docs/cover.png",
  "previewImage": "docs/preview.png"
}
```

⚠️ Only add a key once its file exists — referencing a missing file makes the
Marketplace reject the listing. Verify with `npm pack --dry-run` that the images
appear in the tarball before publishing.
