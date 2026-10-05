# 07 — Normalise incoming values the editor cannot represent

**What to build:** A value this editor cannot show — a second paragraph from a
migration, an unexpected mark from an import — opens without destroying the record, and
the editor says what it had to do.

Three rules:

- **Normalise for display.** Flatten to one paragraph, drop marks that cannot be
  represented, show the result.
- **Tell the person.** A non-blocking notice, so content loss is never silent.
- **Never write back on mount.** Opening a record must not modify it. The normalised
  form is persisted only when the user actually edits.

That third rule is the one that matters most: writing on mount marks the record dirty
and would corrupt content on a stray page open.

**Context worth keeping in mind.** Single-paragraph is enforced, not guaranteed — our
editor prevents it, the schema permits it, and no validator constrains node count.
Translation cannot produce one, since it rewrites leaf text inside a clone of the
original structure. The realistic sources are migrations, imports and CMA scripts.

**Blocked by:** 04 (render structured_text field).

**Status:** done

- [x] A multi-paragraph value opens, flattened, without error
- [x] A value with unsupported marks opens with those marks dropped
- [x] A notice appears when the incoming value did not round-trip cleanly, and not
      otherwise
- [x] Opening a record never modifies it — no write happens on mount
- [x] The normalised value is persisted only once the user edits
- [x] The notice does not block editing
