# 01 — Give each field extension its own React root

**What to build:** The plugin keeps working exactly as it does today, while becoming
safe to add a second editor to. Today the entrypoint holds one module-level React root
shared by every extension in the bundle, so rendering from one extension unmounts
whatever another mounted in its own frame. During the spike this presented as an editor
that silently refused all input — `disabled: false`, no error anywhere, the change
handler simply never firing.

Prefactor. No user-visible change; it removes a trap before the structured_text route
walks into it.

The shared root exists for a reason — recreating it per render loses input focus after
a single character. Keying roots per extension ID preserves that while isolating
extensions from each other.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each extension renders into a root keyed by its own extension ID
- [ ] Typing in the existing JSON editor retains focus across re-renders
- [ ] Rendering from one extension does not unmount another
- [ ] The comment explaining why the root is reused is preserved and updated to cover
      the per-extension keying
- [ ] Existing tests pass; build and typecheck clean
