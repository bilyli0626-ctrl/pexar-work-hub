# HTML Publishing Checklist

Use this reference for local verification and Miaoda/Spark publication.

## Content and Navigation

- The title, owner or role, team, version, and baseline date are correct.
- Every top-level manual chapter appears in the table of contents.
- Search finds visible chapter content and clears correctly.
- Chapter links, collapse controls, back-to-top, and reading progress work.
- Source links open safely and do not expose inaccessible local paths.
- Tables remain readable on narrow screens, using horizontal table scrolling when necessary.

## Visual and Accessibility

- Test at least one wide desktop viewport and one narrow mobile viewport.
- Confirm no page-level horizontal overflow, clipped text, overlapping controls, or layout shifts.
- Confirm the mobile navigation drawer opens, closes, and does not obscure its close control.
- Confirm light and dark themes have readable contrast.
- Confirm keyboard focus, button labels, and reduced-motion behavior are usable.
- Confirm print/PDF mode expands collapsed content and hides interactive chrome.

## Technical and Publication

- Produce one self-contained `index.html` with no runtime package or CDN dependency.
- Keep the canonical Markdown and site configuration beside the generated site.
- Record app ID, published URL, management URL, publication time, and access scope in deployment metadata.
- Reuse the app ID when updating the same manual.
- Verify the deployed page after publishing; distinguish a login redirect from an application error.
- Ask before changing access. Record whether access is restricted, tenant-visible, public with login, or public without login.

## Handoff

Return the published URL, management URL, canonical source path, local HTML path, access scope, and verification result. State any untested behavior or unresolved access limitation explicitly.
