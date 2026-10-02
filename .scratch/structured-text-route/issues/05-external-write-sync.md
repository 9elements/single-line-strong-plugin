# 05 — Keep an open editor in sync when something else writes the field

**What to build:** A content editor translates a record while the field is open, and
the translated value appears in the editor. Their own typing is never fought or
reverted.

Two writers exist for the same field: the person typing, and anything else —
`ai-translations`, a CMA script, undo, a locale switch. The editor has to tell them
apart.

**Why this is not automatic.** `setFieldValue` resolves successfully, but reading the
path back immediately still yields the previous value. An editor driven directly off
the form value therefore loses every keystroke but the last — observed in the spike.
The editor holds its own state as the source of truth for in-progress edits and treats
the form value as a seed plus an external-change signal.

Getting this wrong in the other direction is just as bad: if external changes never
reach the editor, a translated value sits in storage while the open editor shows the
old text and silently overwrites it on the next keystroke.

**Blocked by:** 04 (render structured_text field).

**Status:** ready-for-agent

- [ ] Typing is never reverted or re-ordered by the form value lagging behind
- [ ] A value written externally while the editor is open appears in the editor
- [ ] Switching locale shows that locale's value
- [ ] Undo and redo behave sensibly
- [ ] Verified by hand: translate a record with the field open and watch the value
      arrive
