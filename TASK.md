# Task: extract the segment bridge + add tests

Implement a refactor in this DatoCMS plugin: extract the Lexical↔segment bridge into
its own testable module, then add a test suite. **Zero behavior change** — this is a
pure extraction plus tests.

## 1. Create `src/segment-bridge.ts`
- Move `$readSegments` and `$populateFromSegments` out of
  `src/entrypoints/StrongEditor.tsx` into this new file and export them.
- Keep the `$` prefix and the "call inside a Lexical read/update transaction"
  convention — do not change their signatures or bodies. `$readSegments()` still
  applies `normalizeSegments` on the way out; `$populateFromSegments(segments)` still
  builds the paragraph/text-node tree.
- Import `normalizeSegments` / `Segment` from `./segments`. Add a file-level doc
  comment describing the bridge and its round-trip contract
  `$readSegments($populateFromSegments(x)) ≡ normalizeSegments(x)`.

## 2. Rewire `src/entrypoints/StrongEditor.tsx`
- Delete the two moved functions; import them from `../segment-bridge`.
- Leave all three call sites untouched: `handleChange` (`editorState.read`),
  `ExternalValueSyncPlugin` (read + `editor.update`), and `initialConfig.editorState`.
  Nothing else in the file changes.

## 3. Add test tooling
- Add `vitest` and `@lexical/headless` as devDependencies. Add a `"test": "vitest"`
  script.
- Configure Vitest for a `node` environment (no jsdom) — the bridge only touches
  root/paragraph/text nodes with the built-in `bold` format flag.

## 4. Write `src/segment-bridge.test.ts`
- Drive a real editor via
  `createHeadlessEditor({ namespace: 'test', onError: (e) => { throw e } })`.
  Pattern: `editor.update(() => $populateFromSegments(input))`, then
  `editor.getEditorState().read(() => $readSegments())`.
- Assert the **round-trip identity** `result ≡ normalizeSegments(input)` on
  representative inputs.
- Direction-specific checks: populate sets `bold` on the right nodes; read carries
  text and marks out faithfully.
- The SPEC's tricky normalization cases driven **through the editor** to prove the
  two halves compose: bold edge-shift, single-space absorption between same-marked
  runs, empty-segment drop, leading/trailing edge trim.
- Keep this file focused on *composition* — don't re-derive every normalization
  branch here.

## 5. Write `src/segments.test.ts`
- Test the normalization rules directly (pure, fast, exhaustive) — merge adjacent
  same-mark, drop empty, space absorption, bold edge-shift, edge trim — plus
  `serializeFieldValue` (null-when-empty, stringified object) and `parseFieldValue`
  (tolerant of string/null/legacy bare-array/garbage).

## Verify
- `npm test` (all green), `tsc` / the build (no type errors), and confirm
  `src/preview.tsx` still imports cleanly.
- Read `SPEC.md`, `CONTEXT.md` (defines **Segment** and **Segment bridge**), and the
  current `StrongEditor.tsx` / `segments.ts` before starting. Reference Lexical 0.46.
