# Public UX And SEO: Local Review

The subsequent typography/responsive/testimonial pass is documented in `PUBLIC-REFINEMENT-REVIEW.md`: 125 passing tests, 12 viewport widths and actual native zoom through 200%. The original implementation record below is retained for context.

## Safety Record

- Starting branch: `main`.
- Starting commit: `52ef5129b1167bb34f4a0b869edb6364f0a6f68d`.
- Local development branch: `codex/public-ux-seo-simplification`.
- Backup: `public-ux-seo-20261102-090026`, retained outside the active checkout in the local backup directory.
- Backup includes `working-source.zip` and `git-history.bundle`, outside the active checkout. Dependencies, build artifacts and private environment/credential files are excluded from the source ZIP.
- The pre-existing edit to `public/content/ram.json` is preserved, not overwritten. Its SHA-256 remains `3F369D23E343BE317EAC667EE398D7C28B6119014AA81B8149AEAF1689FF1F4A`.
- The ignored `firebase/functions/.env.gopal-e2ad1` was inventoried by name only; its contents were not read or modified.
- No push, merge, deployment, DNS, billing or production configuration changes.

## Public Experience

Home now presents the mission, Programs Open Now, official initiative identities, organization information and genuine public resources. Program cards use published RAM/SITA content, status and opening/closing rules. Cards open registration directly; their title/image links still lead to the canonical Program page.

`/programs/` is a cross-initiative directory with initiative and registration-type filters. It is an optional discovery route, never a required registration step. RAM/SITA pages show joinable programs before their featured/all-program lists. Public headings use Programs Open Now instead of the internal Opportunity terminology.

RAM and SITA share one Program landing template: actual title, description, initiative identity, configured logistical facts, a prominent action, inline registration, supporting content, fact-based FAQs, genuine testimonials and associated media/resources where configured. Registration remains ahead of supporting information. A `#register` anchor is stable for campaign links. Existing canonical URLs are retained, including `/ram/programs/gita-for-beginners/` and `/sita/vedic-garbh-vigyan/`.

Official logo files are unchanged. The presentation uses the repository's existing bitmap assets and CMS image URLs. Remote card-image failures have a repository-asset fallback, not a replacement logo. Missing facts, fees, dates, reviews and claims are not invented.

## Registration Architecture

No Admin, backend, CMS schema, response management, CSV, Secret Manager or Apps Script changes are required or implemented.

The shared public controller resolves:

`initiative + opportunity ID -> published Opportunity -> opportunity.formId -> original Form`

It uses the existing initiative form/success renderers and private submission adapters. It does not define a separate set of homepage, directory or landing-page questions. Enabled questions remain in Admin order with their existing types, required settings, options and labels. Per-opportunity success settings remain authoritative.

The single controller manages modal/inline presentation, native validation, required checkbox-group validation, stable retry IDs, duplicate-submit prevention, error messages and success dialogs. A receipt must confirm success and match the submission ID before success UI or the post-success hook runs. Failed requests keep the entered answers. There is no participant-data localStorage or analytics payload.

Native dialogs provide keyboard containment and Escape handling; closing returns focus to the initiating button. A pending submission cannot be dismissed accidentally. Long mobile forms use a full-height scrollable dialog.

Server-rendered forms use POST to the existing private endpoint and keep submission disabled until the shared controller is ready, so a JavaScript failure cannot put answers in a GET URL. Unchanged SSR controls are bound in place; changed definitions retain matching entered values. Selection generations prevent stale batch requests from replacing the currently selected form, and selected-batch hero facts/actions update together.

## Google Ads Boundary

The existing global `AW-17887984435` implementation is unchanged. Generated public HTML has exactly one loader/configuration; Admin HTML and login/private API responses exclude it.

The user confirmed that the repository has no explicit conversion-event snippet or conversion label. No `gtag('event', 'conversion', ...)` code or Google Ads configuration was added. The centralized `sitaram:registration-confirmed` DOM hook contains only the successful submission ID and initiative; it sends nothing to Google and only runs after the existing secure receipt path confirms success.

The Sign-up conversion configured in the Google Ads interface/Tag Assistant must be verified separately before deployment. Opening a form, failed submission or mismatched acknowledgment must not count as a confirmed registration.

## SEO And Performance

- Homepage and directory use distinct, human-readable SEO copy in existing CMS fields; no schema changes or keyword stuffing.
- Program-specific Admin SEO overrides are preserved. Program canonicals remain stable and exclude form/query states.
- Program pages retain one H1, unique metadata, Open Graph data and configured images.
- JSON-LD includes breadcrumbs, educational Course data for described programs, and FAQPage only for the questions/answers visible on that page. No fake offers, reviews, ratings, dates, participant counts or SearchAction.
- Program FAQs use configured text or directly configured audience/format/language/fee facts. Unknown answers are omitted.
- Sitemap filtering excludes Admin/API, query/draft states and incomplete/nonindexable programs. Runtime sitemap URLs use the production origin even during local preview.
- Static-first crawlable HTML remains. Published CMS changes update the server-rendered directory and Program forms without a rebuild.
- One shared browser registration controller; no UI framework, duplicate hydration or new runtime dependency.
- Program-card images have dimensions and lazy loading. Video facades remain click-to-load, with one active heavy player. Existing image/CDN URLs remain editable in Admin.
- Core Web Vitals and real Google Ads delivery are not claimed from local tests; verify them against the approved deployed release later.

## Data Limits Requiring Review

- Community Programs has no configured private registration adapter or equivalent published Program/Opportunity/Form collection. The community filter/page therefore has an honest empty state and contact links. This task does not create unsupported forms or change schemas. Adding actual Community registration requires a separately approved Admin/backend extension.
- The preserved local RAM edit includes an active program called New RAM Program with little descriptive content. It remains visible if its published Opportunity is open, because CMS status is authoritative; its incomplete Program page is not indexed. Review/publish the intended content or deactivate it in Admin.
- No fees are configured for the current seed programs, so cards/SEO do not claim every program is free. Set accurate existing content/SEO fields before making such a claim.
- Historical Markdown Program routes are retained. They do not gain guessed links to unrelated Opportunities.
- Local preview uses temporary CMS storage and disables the real Google registration backend. Do not enter real participant information during review.
- Local testimonial settings currently contain no published quotes. The real-data-only design therefore omits that section until genuine consented feedback is published in Admin; synthetic QA verifies publication and hydration without adding fake public testimonials.

## Files Changed

Existing presentation/build files:

- `astro.config.mjs`: sitemap indexability filter only.
- `firebase/pages.mjs`: public HTML and canonical sitemap rendering only; authorization runtime unchanged.
- `package.json`: includes the public UX regression tests.
- `public/content/website.json`: existing homepage/directory copy and SEO fields only.
- `src/components/Header.astro`, `src/layouts/BaseLayout.astro`: simple public header and shared public resources. Ads snippet unchanged.
- `src/lib/website/model.mjs`: public navigation/footer projection. Validators/schema unchanged.
- `src/lib/ram/{page,render}.mjs`, `src/lib/sita/{page,render,detail}.mjs`: public registration reuse, public labels, ordering and Program presentation. Form/success renderer exports preserved.
- `src/pages/index.astro`, `src/pages/programs.astro`, `src/pages/community-programs.astro`: public discovery experience.
- `src/pages/ram/program.astro`, `src/pages/ram/programs/[slug].astro`, `src/pages/sita/program.astro`, `src/pages/sita/[slug].astro`: shared Program presentation and preserved routes.

New files:

- `firebase/public-pages.mjs`: published cross-initiative HTML rendering.
- `src/components/OpenPrograms.astro`, `src/components/ProgramLanding.astro`.
- `src/lib/public-programs/{model,cards,registration,landing,surfaces,client}.mjs`.
- `src/styles/public-ux.css`: public-scoped visual system; Admin styles are untouched.
- `scripts/public-ux.test.mjs`: definition, visibility, CMS, SEO and privacy regression tests.
- This review record and the local checkpoint.

Ignored local QA: `.astro/public-ux-browser-qa.mjs` and `.astro/public-ux-qa/`. These are not deployed public assets.

## Manual Review Checklist

1. Review the homepage hero, spacing, Programs Open Now placement and official initiative logos.
2. Open a registration from Home, directory, RAM and SITA without visiting another page.
3. Confirm Register Now, Join Waitlist and I'm Interested correspond to the configured state.
4. Compare every displayed question with the selected Form in Admin, including order, optional fields, options and consent. A ten-field Form must show ten fields everywhere.
5. At 320/390px, inspect the full-height form, keyboard focus, Escape and return focus. Required questions must remain usable.
6. Review initiative/type filters, the Community empty state, and Program title/image links.
7. Review RAM and SITA Program heroes, actual logistics, `#register`, inline form, session chooser when configured, supporting information and related content.
8. Inspect page source: one H1, unique title/description, correct production canonical and matching Open Graph fields.
9. Parse visible JSON-LD. FAQ answers must match page content; no fake dates, prices, ratings or claims.
10. Inspect sitemap/robots. No Admin/API, private/draft/query states or incomplete programs should be indexed.
11. Confirm the Ads ID appears once in public heads, not in Admin/login/API output. Verify the existing Sign-up conversion separately in Google Ads/Tag Assistant before deployment.
12. Confirm failure retains answers and never shows success. Use the isolated synthetic QA harness for positive success testing; the review preview intentionally cannot write to the production Sheet.
13. Confirm Admin layout, login, page controls, response statuses and CSV behave as before. Automated QA uses temporary synthetic credentials/data only. A standalone preview without local private credentials correctly reports that Admin setup is needed.
14. Check actual YouTube playback and remote images in a normal browser. Automated external Google/YouTube tracking requests are blocked during synthetic QA.

## Local Commands

From the production checkout:

```powershell
npm test
$env:SKIP_VIDEO_SYNC="true"
npm run build
npm run preview:firebase
```

The preview defaults to `http://127.0.0.1:4322`. Use an unused PORT if another preview is running. Positive registration QA is isolated in `.astro/public-ux-browser-qa.mjs`; no production registrations are sent.

## Final Validation Results

- `npm test`: 119 passed, 0 failed.
- `npm run build`, with `SKIP_VIDEO_SYNC=true` to preserve the current editorial data: passed.
- Astro checks: 109 files, 0 errors, 0 warnings, 0 hints.
- Generated output: 40 HTML pages; 1,877 internal links validated.
- Firebase validation: passed; 37 public pages have one Google tag loader/configuration, all 3 generated Admin pages exclude it.
- Final headless Edge checks: all 11 requested widths (320 through 1920), six registration entry points, all ten published enabled fields, one synthetic backend receipt, error/retry answer preservation, stale-batch protection, matching batch facts, early typing/autofill preservation, JavaScript-disabled safety, testimonial hydration, Featured Content publishing and CMS noindex preservation: passed.
- Browser errors: 0. Missing local assets: 0. Public remote image providers were allowed for image checks; Google tracking/YouTube embedding requests were blocked, so real conversion delivery and playback remain manual checks.
- Admin source/authentication, response APIs, CSV, Apps Script, Firebase runtime/configuration and workflow files have no changes. Only the shared public form renderer gained optional inert initialization and safe native POST attributes; its question/success definitions and Admin preview calls are retained.
- Existing local RAM content hash is unchanged. Source backup checked: 157 entries, no prohibited environment/credential/dependency/build entries.

Verified local URLs:

- Home: `http://127.0.0.1:4322/`
- Directory: `http://127.0.0.1:4322/programs/`
- RAM: `http://127.0.0.1:4322/ram/`
- SITA: `http://127.0.0.1:4322/sita/`
- RAM example: `http://127.0.0.1:4322/ram/programs/gita-for-beginners/`
- SITA example: `http://127.0.0.1:4322/sita/vedic-garbh-vigyan/`
- Admin: `http://127.0.0.1:4322/admin/` (existing authentication; private local setup is required if this checkout has no credentials).

## Release Status

NOT PUSHED. NOT DEPLOYED. Do not release until the user approves the local version.
