# 06 — Warn when a field's configuration is too permissive

**What to build:** A content modeller enabling the addon on a field that still allows
headings, lists, links or extra marks is told so immediately — before an editor loses
content, rather than after.

A field backing this editor should allow the strong mark only, no nodes, and empty
block and link validators. A field extension cannot enforce that, so the addon's
config screen inspects the field's own configuration and reports what this editor
cannot represent.

**It warns; it never blocks.** An over-permissive field still works — the editor
normalises what it cannot show. Blocking would strand anyone whose field is configured
slightly differently, for no gain.

The exact configuration also belongs in the documentation, so a modeller can get it
right the first time rather than by reading a warning.

**Blocked by:** 04 (render structured_text field).

**Status:** ready-for-agent

- [ ] The config screen reads the field's own marks, nodes and validators
- [ ] It warns, specifically, about what is allowed that the editor cannot represent
- [ ] A correctly configured field produces no warning
- [ ] The warning never prevents saving the field or using the addon
- [ ] The required field configuration is documented in the README
