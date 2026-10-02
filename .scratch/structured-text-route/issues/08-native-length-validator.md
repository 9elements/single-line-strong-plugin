# 08 — Move the character limit to the native length validator

**What to build:** A length limit on this route is enforced when the record saves, so a
value written by machine translation or a CMA script cannot quietly exceed it. The live
counter stays as an editing affordance.

Today's limit is enforced at input level only — a field extension cannot hook DatoCMS's
save-time validation, as the original spec notes. That gap is wider on this route than
it was on the JSON one, because translation is an external writer that never passes
through our editor at all.

**Start by establishing what `length` actually counts.** The spike left this
unverified, and there is reason for doubt: the documented wording is shared with the
string validator and is not independent evidence, and a `max: 60` validator rejected an
*empty* field during the spike. Test it against a real field before building on it.

**If it turns out unusable**, that is a legitimate outcome for this ticket. Keep the
input-level limit, and document plainly that the limit is not enforced at save and why.
Do not fake an enforcement that is not there.

**Blocked by:** 04 (render structured_text field).

**Status:** ready-for-agent

- [ ] What `length` counts on structured_text is established against a real field and
      written down
- [ ] If usable: the per-field maximum is expressed as the native validator, and
      exceeding it blocks the save
- [ ] If unusable: the input-level limit stays and the limitation is documented
- [ ] The live counter reflects visible characters, ignoring bold markup
- [ ] The JSON route's existing limit behaviour is unchanged either way
