# 02 — Read and write localized field values correctly

**What to build:** A field on a localized model holds its own value per locale, and
editing one locale never disturbs another.

Prefactor, and a latent bug fix for the existing JSON route. DatoCMS is asymmetric
here: a localized field's path is `headline.de`, but the form's values are keyed by the
**bare field name** and hold a per-locale object — `{ headline: { de: …, en: … } }`.

So:

- **Write** using the dotted path.
- **Read** by splitting the path and unwrapping the locale.
- **Never write the bare path.** It replaces the whole per-locale object and destroys
  every other locale's content.

Reading the dotted path directly yields `undefined`, which presents as a field that is
permanently empty no matter what is stored. This was found during the spike and cost
real debugging time.

This matters beyond tidiness: the failure mode is silent content loss in locales
nobody was editing, and it does not show up in single-locale testing.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Path resolution is extracted so it can be tested without a live DatoCMS form
- [ ] Reading a localized field returns the value for the current locale
- [ ] Reading a non-localized field still works
- [ ] Writing targets only the current locale and leaves other locales untouched
- [ ] A test covers the multi-locale case specifically, with a comment naming the
      failure mode it guards against
- [ ] Existing tests pass; build and typecheck clean
