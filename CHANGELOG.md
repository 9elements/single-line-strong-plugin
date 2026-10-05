# Changelog

## Unreleased

### Added

- **Structured text route.** Enable the **Single-line strong** addon on a Structured
  text field to get the single-line, bold-only editor. The field keeps identifying as
  `structured_text`, so translation and other format-aware tools treat it as native.
  Values the editor cannot show are flattened for display with a notice, and are only
  written back once you edit. A length limit on the field’s native validator is
  enforced at save.

### Changed

- **The JSON route is now legacy: supported, not recommended for new fields.** It
  keeps working exactly as before and nothing is being removed. New fields should use
  Structured text. Moving an existing field means a new field plus a content
  migration, and none is required.
