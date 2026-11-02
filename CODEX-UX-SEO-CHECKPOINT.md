# Local Public UX / SEO Checkpoint

Date: November 2, 2026 (America/Los_Angeles).

## Starting State

- Original branch/commit: `main` / `52ef5129b1167bb34f4a0b869edb6364f0a6f68d`.
- Current branch: `codex/public-ux-seo-simplification`.
- Backup: `public-ux-seo-20261102-090026`, retained outside the active checkout in the local backup directory.
- Existing `public/content/ram.json` edit preserved unchanged; SHA-256 `3F369D23E343BE317EAC667EE398D7C28B6119014AA81B8149AEAF1689FF1F4A`.
- No production changes, Git pushes, merges or deployments.

## Objective And Decisions

Simplify public discovery, Program landing pages and registration using the existing CMS and secure backend. Preserve Admin, schemas, Google Apps Script/Sheet and the global Ads ID. One shared public controller reuses the original Form and success renderers; forms are never shortened or independently defined.

User confirmed there is no explicit Ads conversion snippet/label in the repository. Do not invent one. The non-sending success-only DOM hook is intentional. Verify the existing Google Ads interface-configured action separately before deployment.

Community has no equivalent registration dataset/adapter. Keep honest empty states/contact links; do not extend Admin/backend without separate approval.

## Completed

- Backup/branch and public-layer implementation saved to disk.
- Home and cross-initiative directory, direct form dialogs, shared Program template, public labels/section order, SEO/schema/sitemap updates.
- 125 tests passed after the responsive/typography/testimonial refinement (119 passed before this pass).
- Final production build passed: 40 pages, 1,877 links, 37 public Ads heads and 3 tag-free Admin pages. Astro checks report 0 errors, 0 warnings and 0 hints across 109 files.
- Initial headless Edge QA passed all 11 viewport widths, six form entry points, published ten-field definitions, synthetic failure/retry/receipt handling, focus restoration and unchanged protected Admin.
- Visual refinements saved: remove duplicate desktop join link, move mobile CTA above long facts, remote-image fallback and resource layout.
- Code-review findings fixed: server-rendered forms fail closed and use POST; unchanged SSR forms bind without replacement; changing forms preserves matching answers; stale batch responses cannot win; selected-batch facts/actions update together; published testimonials and Featured Content controls remain functional; authoritative CMS noindex is retained through hydration.
- Expanded final browser QA passed with all of those checks, no page errors or missing local assets. All synthetic data stayed in an ephemeral in-memory backend.
- Local preview running and verified on `http://127.0.0.1:4322/`; real Google submissions are disabled. Admin requires normal private local credentials; synthetic QA verified its unchanged protected interfaces.
- Refinement backup: `.astro/backups/public-ux-refinement-20261102-111417/accepted-local-source.zip` relative to the original SITARAM workspace, outside the active checkout.
- Georgia/Arial retained with a consistent, lighter public type scale; no external fonts or carousel dependencies. Warm, static testimonial cards support approved identity/photos without placeholders.
- Program testimonials now prioritize exact Program matches, then unassigned same-initiative testimonials only, using the existing CMS collection and privacy selector. Home testimonials/resources follow initiatives while retaining CMS section order. Stored testimonial source remains unchanged/empty.
- Refinement browser audit passed all 33 valid public destinations at 12 requested widths: 448 layout checks, plus 15 success-dialog/table cases and real native zoom at 100/125/150/200%. Seven common contrast samples passed 4.5:1. Existing registration/Admin browser checks also passed again.

## Remaining Review

- User review/approval of the local public version.
- Separately verify the existing Google Ads interface-configured conversion before any release. There is no explicit conversion-event label/code in this repository and none was invented.
- Review the incomplete active New RAM Program in the preserved local CMS data. Community registration requires a separately approved backend/schema extension; its current empty state is intentional.
- Real external YouTube playback and live Core Web Vitals remain manual checks. No production release or production registration test has been attempted.

## Exact Next Step

Read this checkpoint, `docs/PUBLIC-REFINEMENT-REVIEW.md` and `docs/PUBLIC-UX-SEO-REVIEW.md`, inspect `git status` and diff, then continue only with the user's requested review changes. Do not redo completed implementation or deploy without explicit approval. Verification can be repeated with `npm test`, `SKIP_VIDEO_SYNC=true npm run build`, and the ignored `.astro/public-ux-browser-qa.mjs`, `.astro/refinement-browser-qa.mjs`, `.astro/refinement-success-qa.mjs` helpers under Node 22. They use synthetic temporary data and block real Google submissions. Native zoom tests use an isolated persistent Edge profile. To restart the review preview, run `npm run preview:firebase` on an unused loopback port; no real registration endpoint is enabled there.

See `docs/PUBLIC-UX-SEO-REVIEW.md` for the complete file list, architecture decisions, known data gaps and manual review checklist. Local source is in `.astro/production-migration` relative to the original SITARAM workspace.

NOT PUSHED. NOT DEPLOYED. User approval is required before any release.
