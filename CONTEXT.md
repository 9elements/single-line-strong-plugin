# Single-line Strong

A DatoCMS field extension that turns a field into a single-line text input where
selected text can be made bold, and nothing else.

## Language

**Segment**:
A run of characters that is either bold or not. The field's stored value is a
normalized array of these.
_Avoid_: run, chunk, piece, token

**Mark**:
The bold flag carried by a segment. Bold is the only mark this plugin supports.
_Avoid_: format, style, annotation

**Segment bridge**:
The mapping between the stored segment array and the editor's node tree, in both
directions. Its contract is the round-trip identity — reading back what the bridge
populated yields the normalized original.
_Avoid_: serializer, adapter, converter

**Normalization**:
The rules that give a segment array exactly one canonical form: adjacent segments
sharing a mark are merged, empty segments are dropped, and an empty field stores
nothing at all.
_Avoid_: cleanup, sanitizing, canonicalization

**Editor identity**:
What a field declares itself to be to every other plugin and tool in the project.
Registering an editor as a manual field extension replaces that identity with the
plugin's own, which makes the field invisible to tools that dispatch on it;
overriding the editor at render time leaves it intact.
_Avoid_: editor gate, editor type, appearance

**Field extension**:
The plugin's editing surface for a field. An *editor* extension replaces the field's
UI and can intercept input; an *addon* extension renders beneath it and can only
react after the fact.
_Avoid_: widget, custom field, component
