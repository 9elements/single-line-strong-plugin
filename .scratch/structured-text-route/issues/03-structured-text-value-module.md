# 03 — Map the structured_text value to segments

**What to build:** A pure module that turns a structured_text field's in-form value
into the **segment** representation the editor already speaks, and back again. This is
the one genuinely new piece of logic in the whole route; everything else is wiring.

Nothing user-visible lands in this ticket. It is demoable as a passing test suite, and
it is the module every later ticket depends on.

**The shape it maps to and from.** Inside the form, a structured_text field's value is
the DatoCMS editor's own Slate-flavoured shape — *not* dast:

```
[{ type: 'paragraph', children: [{ text: 'Der schnelle ' }, { text: 'Fuchs', strong: true }] }]
```

A bare array; `text` rather than `value`; marks as boolean keys on the leaf rather than
a `marks` array. Dast — `{ schema, document }` with `value` and a `marks` array — is
what the CMA and GraphQL return, and writing it into the form is rejected. The above
came from reading back what DatoCMS's own editor stored during the spike.

**This shape is not documented by DatoCMS.** Keep every assumption about it inside this
module, so the test suite is also the alarm that fires if it ever changes.

**Normalisation** gives a value exactly one canonical form: multiple paragraphs
flattened to one, marks other than strong dropped, adjacent runs sharing a mark merged,
empty runs dropped, and an empty field represented as no value at all. This mirrors the
rules the JSON route already applies to segments.

**One unresolved observation from the spike:** a single leaf carrying a mark for an
entire value did not persist, while the native editor's multi-leaf output did. The
cause was never established. Assume per-run leaves are required, and verify against a
real field rather than trusting that inference.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Parses a well-formed value into segments
- [ ] Parses tolerantly: null, a bare array, a wrapped object, and garbage all yield a
      sensible result rather than throwing
- [ ] Normalisation is covered rule by rule — paragraph flattening, unknown marks
      dropped, adjacent same-mark runs merged, empty runs dropped, empty-is-no-value
- [ ] Serialises back out, producing the multi-leaf structure the native editor writes
- [ ] Round-trips: a value survives parse → serialise and comes back normalised
- [ ] Imports neither Lexical nor React
- [ ] A comment records that the shape is undocumented and how it was established
