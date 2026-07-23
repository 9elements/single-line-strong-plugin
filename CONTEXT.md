# Domain glossary — single-line-strong-plugin

Names for the seams in this plugin. Use these terms in code, comments, and future
architecture reviews.

## Segment

A run of characters that is either bold or not: `{ value: string; mark: boolean }`.
The stored field value is a normalized array of segments (see SPEC.md for the
normalization rules). Lives in `src/segments.ts` — pure, no Lexical, no React.

## Segment bridge

The pure segment↔Lexical mapping: reads the editor's node tree into a normalized
segment array, and populates the editor from a segment array. Lives in
`src/segment-bridge.ts` as two `$`-prefixed functions (`$readSegments`,
`$populateFromSegments`) that, by Lexical convention, must be called inside a
read/update transaction. The bridge is the Lexical-facing counterpart to the
Lexical-free `segments.ts`; splitting them keeps `segments.ts` testable in
isolation and gives the bridge its own headless test surface.

The bridge's contract is the round-trip identity:
`$readSegments($populateFromSegments(x)) ≡ normalizeSegments(x)`.
