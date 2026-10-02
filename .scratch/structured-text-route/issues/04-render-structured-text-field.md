# 04 — Render a structured_text field as a single-line strong editor

**What to build:** The first slice anyone can see. A content modeller enables a
**Single-line strong** addon on a structured_text field; from then on that field edits
as a one-row headline input with a working bold button, while continuing to identify
itself to the rest of DatoCMS as an ordinary structured_text field.

This is the demo. After this ticket a person can type a headline, bold one word, save,
reload, and see it come back correctly — and `ai-translations` offers its Translate
action on the field.

**Two registrations, one bundle.** An **addon** extension restricted to structured_text
fields is the opt-in signal: enabling it on a field is how a modeller says "treat this
as single-line strong". An **override** hook then claims exactly those fields and
replaces their rendering. The existing JSON manual field extension stays registered and
unchanged alongside both.

**Why not a manual editor extension.** Registering an editor manually overwrites the
field's **editor identity** with the plugin's ID, and `ai-translations` decides what it
can translate by reading exactly that — so the field gets filtered out before its value
is ever inspected. An addon appends to the field's addon list and an override is a
render-time decision; neither touches the identity. This is the whole mechanism that
makes the route work, and it was verified end to end in the spike.

**The override hook is hostile territory.** It runs for *every field in the project*,
and anything that throws inside it takes down the entire plugin handshake — DatoCMS
then reports the plugin as not responding, with no indication of the cause. Read every
property defensively, including ones the schema documents as required: `appearance.addons`
is absent on some fields in practice. The hook is also synchronous, so nothing can be
awaited inside it.

**Reuse the existing editor.** It already provides single-line enforcement, the bold
button with active state, Cmd/Ctrl+B, the character counter, plain-text paste and
read-only handling, and it already speaks segments in and out. Compose it with the
module from ticket 03 rather than writing a second editor.

**Looks the same as the JSON route.** The field should look like the existing
single-line strong input — same box, B button on the left — so that anyone seeing the two
side by side recognises one plugin. Rendering the same editor component is what gives
this for free.

**Reuse the existing path handling.** The JSON wrapper already reads a localized or
block-nested field by traversing the dotted path, and writes with the dotted path. Extract
that helper so both routes share it, and give it the test it lacks today — a multi-locale
value and a field nested inside a block. Never write the bare field name: on a localized
field that replaces the whole per-locale object and destroys every other locale. The
spike's throwaway stub read the path as a flat key and saw an editor that looked
permanently empty; the existing editor does not have that problem and must keep not
having it.

**Blocked by:** 03 (structured_text value module).

**Status:** ready-for-agent

- [ ] An addon extension restricted to structured_text fields is registered and can be
      enabled on a field in the Presentation tab
- [ ] The override claims exactly those structured_text fields carrying the addon, and
      no others
- [ ] The field's editor identity still reads `structured_text` while the override is
      rendering
- [ ] The field renders as a one-row editor with a working bold button; bold applies to
      a selection, not the whole value
- [ ] A value survives type → save → reload with its marks intact
- [ ] Removing the addon returns the field to the native editor
- [ ] The existing JSON route is unaffected
- [ ] Every property read inside the override hook is defensive
- [ ] The field looks the same as a JSON-route field, so the two are visibly the same
      plugin
- [ ] The path-reading helper is shared with the JSON route, tested for a multi-locale
      value and a block-nested field, and the JSON route's behaviour is unchanged
- [ ] Editing one locale never alters another
- [ ] Verified by hand against a live project that `ai-translations` offers Translate
      on the field
- [ ] Verified by hand that a translated value reaches the open editor, including the
      case where the field has focus when the translation is written
