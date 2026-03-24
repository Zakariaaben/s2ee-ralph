# S2EE Frontend Implementation Task Plan

This plan turns the page specification into execution-ready work slices intended for parallel subagents.

The decomposition assumes:

- implementation will be delegated to `gpt-5.3-codex` workers
- tasks should stay reviewable
- write conflicts should be minimized
- frontend rendering should not be tested for cosmetic coverage
- logic tests should be added only for non-trivial behavior

## Design References

The implementation should explicitly reflect the design direction already captured in the page specification:

- `design-taste-frontend`
- `high-end-visual-design`
- `frontend-skill`
- `minimalist-ui`
- `coss ui` component philosophy from `https://coss.com/ui/llms.txt`

For UI-facing work, workers should explicitly load and apply these skills while implementing:

- `high-end-visual-design`
- `design-taste-frontend`
- `frontend-skill`
- `minimalist-ui`

In practice, this means:

- calm, minimal, warm-light or soft-neutral application surfaces
- typography-led hierarchy
- no repeated hero/dashboard shell across role pages
- no decorative blobs or showcase-app chrome
- composable accessible form primitives
- task-first layouts with restrained visual noise

## Execution Strategy

The work is split into five lanes:

1. Foundation and contracts
2. Public, auth, and student
3. Company and interview flow
4. Admin split
5. Check-in, public map, and cross-app visual cleanup

Only the first lane is broadly blocking. After that, the rest can run mostly in parallel with coordination around shared files.

## Lane 1: Foundation and Contracts

These tasks should be done first because they change route structure or core data contracts used by multiple surfaces.

### Task F1: Route partition foundation

Purpose:

- split `/` from auth
- introduce `/auth`
- preserve role redirects

Likely files/modules:

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/__root.tsx`
- new `apps/web/src/routes/auth/*`
- `apps/web/src/lib/auth-routing.ts`

Dependencies:

- none

Acceptance criteria:

- `/` no longer hosts auth
- `/auth` redirects to `/auth/sign-in`
- role redirects still target `/student`, `/company`, `/admin`, `/check-in`

### Task F2: Student onboarding contract expansion

Purpose:

- support `firstName`, `lastName`, `phoneNumber`, `academicYear`, `major`, `institution`, optional image

Likely files/modules:

- `packages/domain`
- `packages/rpc`
- student-related server services, repositories, handlers
- any DB schema/repository code that persists onboarding

Dependencies:

- none

Acceptance criteria:

- end-to-end contract supports the new onboarding fields
- old `course`-centric assumptions are removed or mapped cleanly

### Task F3: Re-key QR/manual code to CV profile

Purpose:

- make the presented CV profile the identity unit

Likely files/modules:

- `packages/domain`
- `packages/rpc`
- student/cv-profile/interview services and handlers
- `apps/web/src/lib/student-atoms.ts`
- `apps/web/src/lib/company-atoms.ts`

Dependencies:

- none

Acceptance criteria:

- QR/manual code resolves to one presented CV profile
- recruiter no longer selects a CV after scan

### Task F4: Candidate preview contract expansion

Purpose:

- return student identity, optional photo, academic info, and presented profile info in one shape

Likely files/modules:

- `packages/domain`
- `packages/rpc`
- student and cv-profile repositories/services

Dependencies:

- `F3`

Acceptance criteria:

- company preview has all required display data in one resolved payload

### Task F5: Real interview lifecycle with start mutation

Purpose:

- move from client-only staged interview state to persisted active interviews

Likely files/modules:

- `packages/domain/src/interview/*`
- `packages/rpc/src/groups/interview.ts`
- interview services, repositories, handlers
- `apps/web/src/lib/company-atoms.ts`
- `apps/web/src/lib/company-interview-execution.ts`

Dependencies:

- `F3`

Acceptance criteria:

- `startInterview` returns a persisted `interviewId`
- complete/cancel operate on persisted interview context

## Lane 2: Public, Auth, and Student

These tasks can be assigned to one or two subagents after `F1`, `F2`, and `F3`.
This lane should explicitly load:

- `high-end-visual-design`
- `design-taste-frontend`
- `frontend-skill`
- `minimalist-ui`

### Task PAS1: Public homepage for `/`

Purpose:

- implement the polished standalone S2EE public page

Likely files/modules:

- new `apps/web/src/components/public/public-home.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/index.css`

Dependencies:

- `F1`

Acceptance criteria:

- `/` explains the 16th edition of S2EE
- primary CTA goes to `/auth/sign-in`
- secondary CTA goes to `/map`
- page feels finished and branded enough to stand alone

### Task PAS2: Shared auth shell

Purpose:

- create a lean auth layout for sign-in and sign-up

Likely files/modules:

- new `apps/web/src/routes/auth.tsx`
- new `apps/web/src/components/auth/auth-shell.tsx`
- extracted auth components

Dependencies:

- `F1`

Acceptance criteria:

- shared auth framing exists
- no routing-map or multi-role explainer copy remains

### Task PAS3: Dedicated sign-in page

Purpose:

- move sign-in into `/auth/sign-in`

Likely files/modules:

- new `apps/web/src/routes/auth/sign-in.tsx`
- new `apps/web/src/components/auth/sign-in-form.tsx`
- `apps/web/src/lib/auth-client.ts`
- `apps/web/src/lib/auth-routing.ts`

Dependencies:

- `PAS2`

Acceptance criteria:

- sign-in is isolated
- links to sign-up and `/`
- role-based redirects remain intact

### Task PAS4: Dedicated student sign-up page

Purpose:

- move registration into `/auth/sign-up`

Likely files/modules:

- new `apps/web/src/routes/auth/sign-up.tsx`
- new `apps/web/src/components/auth/sign-up-form.tsx`

Dependencies:

- `PAS2`

Acceptance criteria:

- sign-up is clearly student-only
- privileged roles are organizer-managed

### Task PAS5: First-login student onboarding dialog

Purpose:

- block student access until onboarding is complete

Likely files/modules:

- `apps/web/src/components/student/student-workspace.tsx` or replacement
- new `apps/web/src/components/student/student-onboarding-dialog.tsx`
- `apps/web/src/lib/student-workspace.ts`
- `apps/web/src/lib/student-atoms.ts`

Dependencies:

- `F2`

Acceptance criteria:

- incomplete students see a blocking dialog
- dialog includes optional image upload

### Task PAS6: Student profile library refactor

Purpose:

- turn `/student` into a CV profile library

Likely files/modules:

- `apps/web/src/routes/student.tsx`
- `apps/web/src/components/student/student-workspace.tsx` or replacement
- `apps/web/src/lib/student-workspace.ts`

Dependencies:

- `PAS5`

Acceptance criteria:

- page focuses on list/add/delete/open profile
- old readiness/dashboard/QR-global sections are gone

### Task PAS7: Student profile detail route

Purpose:

- create `/student/profiles/:profileId`

Likely files/modules:

- new route file for profile detail
- new `apps/web/src/components/student/student-profile-detail.tsx`
- `apps/web/src/lib/student-atoms.ts`

Dependencies:

- `F3`
- `PAS6`

Acceptance criteria:

- one profile page shows profile-specific code and QR
- back navigation to `/student`

### Task PAS8: Student library-to-detail wiring

Purpose:

- connect profile list to detail route

Likely files/modules:

- student library component
- route wiring

Dependencies:

- `PAS6`
- `PAS7`

Acceptance criteria:

- each profile has a clear entry path into its detail page

### Task PAS9: Auth and student cleanup pass

Purpose:

- remove obsolete showcase code and dead assumptions

Likely files/modules:

- `apps/web/src/components/auth/auth-entry.tsx`
- `apps/web/src/components/auth/role-surface.tsx`
- student route/component leftovers

Dependencies:

- `PAS1` through `PAS8`

Acceptance criteria:

- old shared-entry/tabbed-auth/showcase copy is gone

## Lane 3: Company and Interview Flow

These tasks should start after `F3`, `F4`, and `F5`.
This lane should explicitly load:

- `high-end-visual-design`
- `design-taste-frontend`
- `frontend-skill`
- `minimalist-ui`

### Task CI1: Split company experience into route-level surfaces

Purpose:

- separate `/company` and `/company/interviews/:interviewId`

Likely files/modules:

- `apps/web/src/routes/company.tsx`
- new company interview route
- `apps/web/src/components/company/company-workspace.tsx`
- supporting route-level components

Dependencies:

- `F5`

Acceptance criteria:

- `/company` is the scan-first station
- `/company/interviews/:interviewId` is the live interview screen

### Task CI2: Rebuild `/company` as scan/manual-code station

Purpose:

- make scanning and code entry the primary flow

Likely files/modules:

- `apps/web/src/components/company/company-interview-start-panel.tsx`
- new scan/code components
- `apps/web/src/lib/company-interview-start.ts`
- `apps/web/src/lib/company-atoms.ts`

Dependencies:

- `CI1`
- `F3`

Acceptance criteria:

- camera first
- manual code entry directly below
- explicit invalid/not-found states

### Task CI3: Candidate preview and recruiter confirmation

Purpose:

- show resolved candidate context and single `Start interview` CTA

Likely files/modules:

- company preview components
- `company-interview-start-panel.tsx`
- `company-atoms.ts`

Dependencies:

- `F4`
- `F5`
- `CI2`

Acceptance criteria:

- student identity, image, academic info, and presented profile render from one payload
- recruiter auto-selection works

### Task CI4: Interview detail query and CV document delivery

Purpose:

- make the live interview route self-sufficient

Likely files/modules:

- interview RPC group
- interview service/repository
- CV document retrieval path
- `company-atoms.ts`

Dependencies:

- `F5`

Acceptance criteria:

- route refresh loads active interview and selected CV document cleanly

### Task CI5: Live interview workspace UI

Purpose:

- implement PDF-left, form-right interview screen

Likely files/modules:

- `apps/web/src/components/company/company-interview-execution-panel.tsx`
- new route component for interview detail
- supporting focused UI pieces
- `apps/web/src/lib/company-interview-execution.ts`

Dependencies:

- `CI4`

Acceptance criteria:

- left PDF viewer
- right stacked form
- unified tags
- recruiter context
- notes
- decimal score 1 to 5
- major sought selector
- `Complete` and `Cancel`

### Task CI6: Reintroduce active/completed interview lists as secondary context

Purpose:

- keep activity visible without fighting the scan-first layout

Likely files/modules:

- `company-workspace.tsx`
- `company-workspace.ts`
- list/card subcomponents

Dependencies:

- `CI1`
- `F5`

Acceptance criteria:

- active/completed lists exist below the primary scanning flow
- active items link to the live interview route

### Task CI7: Targeted company-flow logic tests

Purpose:

- cover non-trivial logic only

Likely files/modules:

- `apps/web/src/lib/company-interview-start.test.ts`
- `apps/web/src/lib/company-interview-execution.test.ts`
- relevant RPC/handler tests if branching changes

Dependencies:

- parallel after relevant logic lands

Acceptance criteria:

- tests cover profile-scoped code resolution, recruiter auto-selection, and interview lifecycle transitions
- no shallow page-render tests

## Lane 4: Admin Split

These tasks are intentionally route-first and should be owned by one subagent or by two subagents with a clear split between shell/data and page implementation.
This lane should explicitly load:

- `high-end-visual-design`
- `design-taste-frontend`
- `frontend-skill`
- `minimalist-ui`

### Task A1: Extract admin route shell and shared navigation

Purpose:

- create the admin route shell

Likely files/modules:

- `apps/web/src/routes/admin.tsx`
- new admin child route files
- shared admin shell/nav components
- `apps/web/src/lib/admin-atoms.ts`

Dependencies:

- `F1`

Acceptance criteria:

- shared admin navigation exists
- admin role guard remains intact

### Task A2: Create admin data access layer for page-level slices

Purpose:

- break `AdminWorkspace` data wiring into reusable selectors and helpers

Likely files/modules:

- `apps/web/src/lib/admin-atoms.ts`
- `apps/web/src/lib/admin-workspace.ts`
- `apps/web/src/lib/admin-venue.ts`
- `apps/web/src/lib/admin-map.ts`

Dependencies:

- `A1`

Acceptance criteria:

- each admin page can import only the data it needs

### Task A3: Implement `/admin/overview`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- compact summary only
- links into the other admin modules

### Task A4: Implement `/admin/companies`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- company list and recruiter roster live here
- venue/map/access controls do not

### Task A5: Implement `/admin/venue`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- room CRUD and placement live here

### Task A6: Implement `/admin/map`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- public map upload and pin placement live here

### Task A7: Implement `/admin/access`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- user and role management live here

### Task A8: Implement `/admin/interviews`

Dependencies:

- `A1`
- `A2`

Acceptance criteria:

- interview ledger and filtering live here

### Task A9: Replace old `AdminWorkspace` monolith

Dependencies:

- `A3` through `A8`

Acceptance criteria:

- admin navigation is route-driven
- tabbed monolith is retired

## Lane 5: Check-in, Public Map, and Cross-App Visual Cleanup

These tasks can run after route foundations are stable. Visual cleanup should happen late in the lane, once page boundaries exist.
This lane should explicitly load:

- `high-end-visual-design`
- `design-taste-frontend`
- `frontend-skill`
- `minimalist-ui`

### Task CPM1: Refocus `/check-in` into a narrower arrival workflow

Purpose:

- keep only search, room filter, arrival action

Likely files/modules:

- `apps/web/src/routes/check-in.tsx`
- `apps/web/src/components/check-in/check-in-workspace.tsx`
- `apps/web/src/lib/check-in-workspace.ts`

Dependencies:

- none

Acceptance criteria:

- company list is primary
- summary chrome is secondary or removed

### Task CPM2: Add explicit room filtering to check-in

Dependencies:

- `CPM1`

Acceptance criteria:

- room filter composes with search and arrival status

### Task CPM3: Redesign `/map` as a quieter public information page

Purpose:

- keep map read-only while reducing dashboard chrome

Likely files/modules:

- `apps/web/src/routes/map.tsx`
- `apps/web/src/components/public/public-venue-map.tsx`
- `apps/web/src/lib/public-venue-map.ts`

Dependencies:

- `PAS1`

Acceptance criteria:

- page remains public and read-only
- visual emphasis stays on the map and room details

### Task CPM4: Tighten public map state handling and copy

Dependencies:

- `CPM3`

Acceptance criteria:

- loading, empty, and failure states are public-facing and non-technical

### Task CPM5: Shared visual cleanup across implemented slices

Purpose:

- align completed routes with the agreed design direction

Likely files/modules:

- route-level components across `apps/web/src/components`
- `apps/web/src/index.css`
- `packages/ui/src/styles/globals.css`

Dependencies:

- `PAS1` through `PAS9`
- `CI1` through `CI6`
- `A3` through `A9`
- `CPM1` through `CPM4`

Acceptance criteria:

- warm-light or soft-neutral operational feel is visible
- repeated hero shells and blobs are gone
- pages no longer feel like one reused showcase template

## Recommended Subagent Assignment

### Worker 1: Foundation

Own:

- `F1`
- `F2`
- `F3`
- `F4`
- `F5`

Why:

- these tasks touch shared contracts and route foundations

### Worker 2: Public/Auth/Student

Own:

- `PAS1` to `PAS9`

Write scope:

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/auth/*`
- `apps/web/src/routes/student*`
- `apps/web/src/components/auth/*`
- `apps/web/src/components/student/*`
- `apps/web/src/components/public/public-home.tsx`

Start after:

- `F1`, `F2`, `F3`

### Worker 3: Company/Interview

Own:

- `CI1` to `CI7`

Write scope:

- `apps/web/src/routes/company*`
- `apps/web/src/components/company/*`
- `apps/web/src/lib/company-*`

Start after:

- `F3`, `F4`, `F5`

### Worker 4: Admin

Own:

- `A1` to `A9`

Write scope:

- `apps/web/src/routes/admin*`
- `apps/web/src/components/admin/*`
- `apps/web/src/lib/admin-*`

Start after:

- `F1`

### Worker 5: Check-in/Map/Visual Cleanup

Own:

- `CPM1` to `CPM5`

Write scope:

- `apps/web/src/routes/check-in.tsx`
- `apps/web/src/routes/map.tsx`
- `apps/web/src/components/check-in/*`
- `apps/web/src/components/public/public-venue-map.tsx`
- shared visual files only after coordination

Start after:

- `PAS1` for `/` link consistency
- later for `CPM5`

## Parallelization Notes

- `F1` can start immediately.
- `F2`, `F3`, and `F5` can begin in parallel if carefully coordinated, but they touch shared contracts. In practice, it is safer to keep them in one worker lane.
- `PAS` lane should wait for the contract tasks it consumes.
- `CI` lane should wait for profile-scoped identity and interview lifecycle work.
- `A` lane can start earlier because most of its blocking work is route and composition oriented.
- `CPM5` should be late, once the page boundaries are stable, otherwise it will create unnecessary merge pressure.

## Suggested Execution Order

1. `F1`
2. `F2`, `F3`, `F5`
3. `F4`
4. `A1`, `A2`
5. `PAS1`, `PAS2`, `PAS3`, `PAS4`
6. `PAS5`, `PAS6`
7. `CI1`, `CI2`, `CI3`, `CI4`, `CI5`, `CI6`
8. `A3` through `A8`
9. `PAS7`, `PAS8`, `PAS9`
10. `CPM1`, `CPM2`, `CPM3`, `CPM4`
11. `A9`
12. `CI7`
13. `CPM5`

## Testing Guidance

Only add tests where behavior is non-trivial.

Good candidates:

- role redirects
- onboarding gating
- QR/code profile scoping
- candidate resolution
- recruiter auto-selection
- interview lifecycle transitions
- check-in filtering composition

Do not add tests just to assert:

- headings render
- layout sections exist
- cards/buttons are present
- visual composition matches a static page structure
