# PRD: S2EE Frontend Information Architecture and Page Specification

## Problem Statement

The current frontend is functional, but it feels like a showcase application instead of a focused event platform. Many pages try to explain the system, display too many summaries at once, and mix primary tasks with secondary information. This makes the interface feel crowded and generic, especially for operational roles that need narrow, fast flows during the event.

The product needs to become a clean, minimal, task-oriented S2EE platform. Each role should land on a surface that is immediately actionable, visually calm, and clearly separated from the other workflows. The public-facing entry also needs to stop behaving like a shared auth shell and instead become a polished standalone S2EE page that can live independently even if the long-term branded landing later moves to another URL.

## Solution

Redesign the frontend around explicit page responsibilities and route separation.

The new frontend should follow these principles:

- One page should serve one primary task.
- The root route `/` should become a polished standalone S2EE public page about the 16th edition of the event, with clear calls to action to enter the platform and open the public map.
- Authentication should move into dedicated routes under `/auth`, with sign-in and sign-up separated.
- Student onboarding should happen as a blocking dialog on first login, then the student should be redirected into a profile library centered on CV profiles.
- Company users should land on a scanning-first workflow, with current interviews shown below only as secondary context.
- Check-in should stay narrow and operational, focused on search, room filtering, and marking companies as arrived.
- Admin should be split into dedicated sub-pages instead of one broad workspace.
- Public map should remain read-only, public, and informational.

## Product Direction

The target is not a marketing-heavy experience. It is a polished operational platform.

The visual direction should be:

- minimal
- clean
- calm
- precise
- task-driven
- production-ready

The interface should avoid these patterns:

- large dashboard hero blocks on every page
- architecture language exposed to users
- repeated KPI cards that do not unlock an action
- pages that mix unrelated tasks in a single surface
- noisy gradients and decorative effects that compete with the workflow
- “workspace” copy that sounds internal instead of user-facing

The interface should emphasize:

- direct page titles
- clear primary action areas
- strong separation between routes
- compact summaries only where they help decisions
- explicit empty/loading/error states
- lightweight but polished surfaces

## Visual and Interaction Direction

This redesign should explicitly follow a premium minimalist product direction rather than a generic SaaS or showcase-app direction.

The intended feel is:

- editorial but not luxurious in a branding-first way
- operational but not dense
- polished but not decorative
- calm and mature rather than playful
- minimal with clear structure, not visually empty

The design language should borrow selectively from the following internal references:

- `design-taste-frontend` for anti-generic structure, disciplined hierarchy, and strong task-first layouts
- `high-end-visual-design` for premium spacing, refined surfaces, and intentional interaction quality
- `minimalist-ui` for restrained composition, warm-neutral surfaces, low-noise interfaces, and reduced visual clutter

The UI implementation should also use the existing `coss ui`-style component philosophy as a fit check:

- composable components
- strong accessibility defaults
- quiet surfaces
- precise form controls
- minimal but capable primitives for dialog, input, tabs, table, select, field, and empty states

The visual system should prefer:

- warm light or softly neutral surfaces for most app screens
- minimal or near-zero use of gradients
- very subtle shadows only when hierarchy requires them
- crisp radii, not oversized pill-heavy containers
- compact icon use
- typography-led hierarchy
- structured whitespace instead of card overload
- split layouts only when they directly support the task, such as the interview page

The visual system should avoid:

- forced global dark mode as the default application identity
- repeated hero banners across role pages
- floating decorative blobs
- glassmorphism-heavy surfaces
- oversized metric dashboards at the top of every screen
- visual language that suggests a product demo instead of an event platform

The target impression should be:

"This is a serious, well-designed event operating system with clear screens and excellent taste."

## Route Map

### Public Routes

- `/`
- `/auth`
- `/auth/sign-in`
- `/auth/sign-up`
- `/map`

### Student Routes

- `/student`
- `/student/profiles/:profileId`

### Company Routes

- `/company`
- `/company/interviews/:interviewId`

### Check-in Routes

- `/check-in`

### Admin Routes

- `/admin`
- `/admin/overview`
- `/admin/companies`
- `/admin/venue`
- `/admin/map`
- `/admin/access`
- `/admin/interviews`

## Global UX Rules

1. The root route must no longer host authentication.
2. `/auth` should redirect to `/auth/sign-in`.
3. Sign-in and sign-up must be different routes and different screens.
4. English is the interface language.
5. Non-admin roles should land directly on their task-first page.
6. Admin should have a dedicated admin navigation shared across admin sub-pages.
7. Student onboarding should be enforced before access to the student profile library.
8. The platform should never explain implementation details, architecture choices, issue numbers, or internal abstractions to end users.
9. The student photo is optional during onboarding and should be reused wherever candidate context matters.
10. A CV profile is the unit the student presents to companies. QR and manual code belong to a CV profile, not to the student globally.

## Page Specifications

## `/`

### Purpose

Serve as the public S2EE homepage for the 16th edition of the event, even if the future brand-heavy landing later lives on another URL.

### Primary Actor

Any public visitor.

### Primary Goal

Understand what S2EE is and choose between entering the platform or opening the public venue map.

### Required Content

- A concise introduction to the 16th edition of S2EE.
- A clear explanation that S2EE is the employment fair of ESI.
- A polished but restrained presentation of the event.
- A primary CTA to `/auth/sign-in`.
- A secondary CTA to `/map`.

### Structural Layout

- Hero section with event title, short description, and CTAs.
- One or two compact supporting sections at most.
- No auth form on this page.
- No multi-role routing explanation.
- No “temporary page” language.

### Notes

This page should feel complete and intentional on its own. It should not read as a placeholder.

## `/auth/sign-in`

### Purpose

Provide a clear access point for all provisioned users and returning students.

### Primary Actor

Student, company, admin, or check-in user who already has access.

### Primary Goal

Authenticate and continue to the correct role destination.

### Required Content

- Sign-in form only.
- Short explanatory copy.
- Link to student sign-up.
- Link back to `/`.
- Optional link to `/map`.

### Rules

- Do not mix sign-up and sign-in in tabs.
- Do not display route maps or role architecture explanations.
- Keep the copy role-safe and non-technical.

## `/auth/sign-up`

### Purpose

Allow self-service student registration only.

### Primary Actor

New student participant.

### Primary Goal

Create a student account and continue into the student flow.

### Required Content

- Student-only sign-up form.
- Explicit statement that company, admin, and check-in access are organizer-managed.
- Link back to sign-in.
- Link back to `/`.

### Rules

- This page is only for student account creation.
- After successful account creation, the user should be treated as a student and redirected into the student flow.

## Student First Login Onboarding Dialog

### Trigger

First successful student login when required onboarding data is incomplete.

### Purpose

Collect the minimum identity and academic metadata required before the student can use CV profiles.

### Fields

- first name
- last name
- phone number
- academic year
- major
- institution
- optional profile image

### Behavior

- The dialog should block the student flow until submitted.
- The dialog should appear on top of the student route after first login.
- Once completed, the student is redirected into the profile library state of `/student`.

### Design Notes

- This should feel like a focused setup step, not a form buried in a dashboard.
- The image upload is optional.
- The rest of the student platform should assume these fields are available after onboarding.

## `/student`

### Purpose

Serve as the student CV profile library.

### Primary Actor

Authenticated student.

### Primary Goal

Review, add, and manage CV profiles.

### Primary Content

- List of CV profiles.
- Primary action to add a new profile.
- Lightweight profile cards or rows with enough information to identify each profile.
- Delete action for each profile.
- Enter action for each profile to open profile details.

### Required Behavior

- If onboarding is incomplete, the onboarding dialog appears first.
- The page should not lead with big readiness dashboards.
- The list itself is the product.

### Empty State

- Clear explanation that no CV profiles exist yet.
- Primary CTA to add the first CV profile.

### Secondary Information

- Student identity can appear in a compact header.
- Large metrics or decorative summaries should be avoided unless they directly help the student act.

## `/student/profiles/:profileId`

### Purpose

Show one CV profile in detail.

### Primary Actor

Authenticated student.

### Primary Goal

Inspect the selected profile, display its manual code and QR code, and manage that profile.

### Required Content

- The selected CV file or profile metadata.
- The profile code in text form.
- The QR code for the same profile.
- Delete action.
- Back navigation to `/student`.

### Rules

- QR and manual code must be profile-specific.
- This page is where the student prepares to present a specific profile to recruiters.

## `/company`

### Purpose

Act as the recruiter home page and entry point to interviews.

### Primary Actor

Authenticated company user.

### Primary Goal

Resolve a student profile by scan or manual code entry, then start an interview.

### Page Priority

1. Camera scanner
2. OTP or manual code entry
3. Active interviews list below

### Required Content

- Camera-based scanner at the top.
- Manual code entry directly below the scanner.
- A candidate preview panel when a valid CV profile is resolved.
- Current active interviews underneath, only if any exist.

### Candidate Preview

After successful scan or manual code entry, display:

- student name
- optional student image
- institution
- academic year
- major
- selected CV profile context
- a single primary CTA: `Start interview`

### Rules

- The recruiter does not select the CV.
- The student presents one specific CV profile.
- Active interviews are secondary context, not the page’s first concern.
- This page should feel like a scanning station, not a dashboard.

## `/company/interviews/:interviewId`

### Purpose

Provide the live interview workspace.

### Primary Actor

Authenticated company user in an active interview.

### Primary Goal

Review the candidate CV and complete or cancel the interview.

### Layout

Two-column layout on desktop:

- Left: PDF viewer for the selected CV
- Right: interview form stack

On smaller screens, this should collapse into a vertical layout while keeping the form actions accessible.

### Right-Side Form Stack

- tags input with multi-tag support
- recruiter selector with current recruiter auto-selected when possible
- notes textarea
- grading control from 1.0 to 5.0 with decimal precision
- major sought selector for later filtering
- completion controls: `Complete` and `Cancel`

### Interview Data Decisions

- Shared tags and company tags are merged into one unified tag experience.
- The interviewer does not change the CV during the flow.
- The selected CV remains locked because it is the one the student presented.

### UX Rules

- The PDF viewer is part of the interview, not a secondary detail.
- The right column should read as one stacked operational form.
- The design should feel calm and focused, not analytic or dashboard-like.

## `/check-in`

### Purpose

Provide the arrival desk workflow.

### Primary Actor

Authenticated check-in staff.

### Primary Goal

Search for a company, filter by room, and mark it as arrived.

### Required Content

- Search by company name.
- Room-based filtering.
- Clear list of matching companies.
- Compact placement context such as room and stand.
- Primary action to mark a company as arrived.

### Rules

- This route should remain narrow.
- No secondary admin controls should appear here.
- The page should optimize for speed and queue handling.

## `/map`

### Purpose

Expose the public venue map to any visitor.

### Primary Actor

Any public visitor or participant.

### Primary Goal

Locate rooms and understand where companies are placed.

### Rules

- Public and read-only.
- No authentication required.
- No operational actions.

### Required Content

- Published venue image
- room pins
- room detail panel
- company placement information
- arrival state when available

### Design Notes

- The page should be informative and calm.
- Decorative chrome should not compete with the map itself.

## `/admin` and `/admin/overview`

### Purpose

Provide an operational starting point for admins.

### Primary Actor

Authenticated admin.

### Primary Goal

See the current state of the event and navigate to the correct admin module.

### Required Content

- Compact event summary
- urgent or pending operational items
- clear links into the dedicated admin modules

### Rules

- This is the only admin page allowed to behave like an overview.
- It should not become a dumping ground for every control.

## `/admin/companies`

### Purpose

Manage company entities and recruiter rosters.

### Primary Goal

Inspect company records and manage recruiter membership.

### Responsibilities

- company list
- recruiter roster visibility
- company profile maintenance

### Out of Scope for This Page

- venue logistics
- public map publishing
- account role management

## `/admin/venue`

### Purpose

Manage operational logistics.

### Primary Goal

Control rooms, stands, placements, and venue-side event organization.

### Responsibilities

- room management
- stand context
- company placement
- venue-side logistical organization

### Notes

This is the right home for logistics, not `/admin/map`.

## `/admin/map`

### Purpose

Manage the public venue map artifact.

### Primary Goal

Publish the public map image and align room pins to the room registry.

### Responsibilities

- upload and replace public map image
- place and adjust room pins
- clear or republish the public map

### Notes

This page is about publication of the public map, not general logistics.

## `/admin/access`

### Purpose

Manage users and role assignment.

### Primary Goal

Inspect access records and change role-level permissions where allowed.

### Responsibilities

- user and access ledger views
- role assignment
- account access review

### Notes

This is the home for user management.

## `/admin/interviews`

### Purpose

Review interview history.

### Primary Goal

Inspect interview records and filter them after event activity begins.

### Responsibilities

- interview ledger
- filtering by relevant dimensions
- later operational review and reporting support

## Navigation Model

### Public Navigation

- Minimal header on `/` and `/map`
- Direct CTAs to `/auth/sign-in` and `/map`
- Clean back-links between public routes

### Auth Navigation

- Small auth shell with links between sign-in and sign-up
- Easy route back to `/`

### Student Navigation

- Very light navigation
- Primary route is `/student`
- Detail route for a selected profile

### Company Navigation

- Very light navigation
- Primary route is `/company`
- Interview route only appears when an interview is active

### Check-in Navigation

- Single operational route

### Admin Navigation

- Shared admin navigation across all admin routes
- Can be sidebar or top navigation, but must remain consistent
- Must prioritize module switching over decorative summaries

## User Stories

1. As a public visitor, I want the root page to explain the 16th edition of S2EE clearly, so that I immediately understand the event.
2. As a public visitor, I want a polished standalone public page, so that the product feels complete even if the broader brand site lives elsewhere.
3. As a public visitor, I want a clear CTA to authentication, so that I can enter the platform without confusion.
4. As a public visitor, I want a clear CTA to the public map, so that I can orient myself without signing in.
5. As a returning user, I want sign-in on its own route, so that I am not distracted by unrelated registration content.
6. As a new student, I want sign-up on its own route, so that I know this path is specifically for student participation.
7. As an admin, I want sign-in separated from student sign-up, so that the platform does not imply I should register through the same flow.
8. As a student, I want a blocking onboarding step on first login, so that the platform collects the minimum information needed before I proceed.
9. As a student, I want to upload an optional profile image, so that recruiters can identify me more easily.
10. As a student, I want to provide my phone number during onboarding, so that contact is easier after the event.
11. As a student, I want my academic year, major, and institution recorded, so that my academic context is visible across the platform.
12. As a student, I want the main student page to focus on my CV profiles, so that the product feels centered on what I actually present.
13. As a student, I want to add a CV profile directly from my profile library, so that I can prepare multiple variants.
14. As a student, I want to delete a CV profile, so that I can remove outdated versions.
15. As a student, I want to open a specific profile, so that I can present it intentionally.
16. As a student, I want each CV profile to have its own QR and manual code, so that I can choose which profile to present.
17. As a recruiter, I want the company home page to prioritize scanning, so that I can start interviews quickly.
18. As a recruiter, I want a manual code fallback under the scanner, so that I can proceed even if scanning is inconvenient.
19. As a recruiter, I want the student preview to show personal and academic context, so that I know who I am about to interview.
20. As a recruiter, I want to see the optional student image if available, so that candidate identification is easier.
21. As a recruiter, I want a single `Start interview` action after resolving a profile, so that the flow is unambiguous.
22. As a recruiter, I want the selected CV to remain fixed, so that the interview matches the exact profile the student presented.
23. As a recruiter, I want the active interview screen to show the PDF and the form side by side, so that I can review and evaluate without context switching.
24. As a recruiter, I want one unified tag system, so that the interview form stays simple.
25. As a recruiter, I want my recruiter identity to be auto-selected when possible, so that I do not waste time on repetitive setup.
26. As a recruiter, I want to grade with decimal precision from 1 to 5, so that candidate scoring can be more nuanced.
27. As an admin, I want overview and management pages split apart, so that each admin page has a clear purpose.
28. As an admin, I want a dedicated access page, so that user and role management are not mixed into other operations.
29. As an admin, I want a dedicated venue page, so that logistical setup is managed in one place.
30. As an admin, I want a dedicated map page, so that public map publishing and pin alignment have a focused home.
31. As an admin, I want a dedicated interviews page, so that interview review is separate from setup workflows.
32. As check-in staff, I want a single focused page, so that I can process arrivals without seeing unrelated controls.
33. As check-in staff, I want room filtering, so that I can narrow the queue quickly.
34. As check-in staff, I want to search directly by company name, so that I can respond fast at the desk.
35. As a public visitor, I want the map to stay public and read-only, so that orientation is easy and safe.

## Implementation Decisions

- The root route is a real public S2EE page, not an auth shell.
- Authentication is moved under `/auth`.
- Sign-in and sign-up are separate screens.
- Student onboarding is a first-login dialog, not a permanent dashboard block.
- A CV profile is the core student artifact.
- QR and manual code belong to a CV profile.
- Company flow is scan-first and code-second.
- Recruiters never choose the CV; students present one profile.
- The interview screen uses a PDF-left, form-right layout.
- Shared tags and company tags are merged into one tag experience.
- Admin is divided into dedicated routes rather than one broad workspace.
- `access` owns user and role management.
- `venue` owns logistical organization.
- `map` owns public map publishing and room pinning.
- The public map remains public and read-only.
- English is the product language for this interface pass.

## Testing Decisions

- Do not prioritize tests for purely presentational frontend structure, visual composition, spacing, or cosmetic UI behavior.
- Do not add shallow tests just to assert that a page renders headings, cards, buttons, or layout sections.
- Prefer testing extracted logic and complex behavior only when the behavior has meaningful risk or branching.
- Test route behavior and user-visible outcomes rather than implementation details.
- Focus tests on guards, transformations, filtering, workflow state changes, and role-based routing.
- Test auth redirects and role redirects.
- Test first-login onboarding gating for students.
- Test CV profile creation, deletion, and profile-specific QR/code behavior if the logic becomes non-trivial.
- Test company scan/code resolution into candidate preview.
- Test interview creation, completion, and cancellation flows.
- Test check-in filtering by room and search by company name.
- Test admin route separation and access boundaries.
- Test public map availability without authentication.
- If a behavior is simple, obvious, and mostly presentational, it does not need a dedicated test.

## Out of Scope

- The future fully branded marketing landing if it later lives on another URL.
- New business logic beyond what is required to support the new page model.
- Reworking role definitions beyond `student`, `company`, `admin`, and `check-in`.
- Public editing actions on the map.
- Additional actor types.

## Further Notes

- The next implementation session should treat this document as the source of truth for route responsibilities and page boundaries.
- The main redesign objective is not “make it prettier”. It is “make each page do one job clearly”.
- The current platform already contains the right product primitives; the redesign should mainly improve structure, copy, and flow separation.
