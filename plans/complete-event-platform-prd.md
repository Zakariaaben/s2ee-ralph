# PRD: Complete S2EE Event Platform

## Problem Statement

The platform already has meaningful backend foundations for students, companies, interviews, venue placement, and admin ledgers, but the product is not yet implemented as a complete end-to-end experience. The current app UI is still mostly placeholder, critical role-based journeys are incomplete, and several operational details needed for a real event are missing.

The platform only makes sense if it is implemented as a coherent whole:

- Students need a clear way to register, finish onboarding, upload CVs, access their QR identity, and present themselves during event interviews.
- Company users need a single sign-in entry point, a company workspace that works well on desktop, recruiter management, a fast scan-to-interview workflow, interview rating and notes, and the ability to complete or cancel interviews.
- Check-in staff need an operational interface to mark company arrival state.
- Admins need operational monitoring plus data-management interfaces for accounts, rooms, stands, placements, and company assignment.
- The public needs a venue map that reflects the real event layout and current company placement and status.

Without these connected experiences, the existing backend capabilities do not translate into a usable event platform.

## Solution

Build the platform as one role-aware application with a shared authentication entry point for sign-in, student-only self-registration, role-based post-auth routing, and focused interfaces for each actor.

The product should support four primary operational surfaces plus one public surface:

- Student surface: mobile-first workspace where students land directly on CV management, complete required onboarding information, manage CV variants, access their QR identity, and prepare for interviews.
- Company surface: responsive interface with strong desktop support where company users sign in to pre-created accounts, manage recruiters, scan student QR codes, preview the student before starting an interview, select or reuse a recruiter, rate the interview, add notes, and complete or cancel the interview.
- Check-in surface: lightweight operational interface for event staff to update company arrival state and support venue operations.
- Admin surface: operational monitoring plus data-management pages for companies, user roles, rooms, stands, room placement, map pinning, and related event configuration.
- Public venue surface: a public-facing map page based on one uploaded venue image, with room pins that reveal company placement details and live-ish company status information.

The implementation should prioritize information architecture and core workflows first, then fill in the remaining surfaces and polish. All interfaces should use the shared design system and token-based styling from the UI package.

## User Stories

1. As a visitor, I want a single sign-in page, so that every actor enters the platform from one clear authentication entry point.
2. As a student, I want to self-register from that same auth entry, so that I can create my own account without admin intervention.
3. As a company user, I want to sign in from that same entry point, so that I can access my pre-created company account without a separate portal.
4. As an admin, I want to sign in from that same entry point, so that administration still uses the same authentication flow as the rest of the platform.
5. As check-in staff, I want to sign in from that same entry point, so that operational staff do not need a separate login system.
6. As the platform, I want student registration to default to the student role, so that self-service registration does not create privileged accounts.
7. As the platform, I want company, admin, and check-in accounts to be provisioned in advance, so that privileged access remains controlled by operations.
8. As a newly signed-in student, I want to be routed directly to my CV workspace, so that I can act immediately instead of landing on an empty dashboard.
9. As a student, I want onboarding completion to be required before my profile is treated as ready, so that companies and operators see usable student information.
10. As a student, I want to edit the onboarding information that is required by the event, so that my profile stays current.
11. As a student, I want to upload CVs from my main landing area, so that CV management is my primary task and not hidden behind analytics or dashboard chrome.
12. As a student, I want to manage multiple CV variants, so that I can present the right version for different company conversations.
13. As a student, I want my QR identity to be available after onboarding, so that recruiters can quickly identify me on site.
14. As a company user, I want to land in a workspace designed for active interviewing, so that the product matches the event reality instead of looking like a generic back office.
15. As a company user, I want to manage the recruiters attached to my company account, so that interviews can be attributed to the correct recruiter.
16. As a recruiter, I want the previously used recruiter to be remembered locally on the device, so that repetitive interview setup is faster during the event.
17. As a recruiter on a fresh device, I want to choose from the company’s recruiter list before starting an interview, so that attribution is still correct without local state.
18. As a recruiter, I want to scan a student QR code, so that I can start the interview flow from the student’s badge or phone.
19. As a recruiter, I want to see a preview of the student after scanning, so that I can confirm I scanned the right person before starting the interview.
20. As a recruiter, I want to explicitly confirm interview start after preview, so that scanning alone does not accidentally create interview state.
21. As a recruiter, I want to see the student’s available CV profiles, so that I can associate the interview with the right CV.
22. As a recruiter, I want to rate the interview, so that the company can keep structured post-interview signal.
23. As a recruiter, I want to add interview notes, so that qualitative context is preserved alongside tags and score.
24. As a recruiter, I want to apply shared global interview tags, so that evaluation stays consistent across companies where needed.
25. As a recruiter, I want to apply company-specific tags, so that our company can keep custom evaluation language.
26. As a recruiter, I want to complete an interview, so that successful interview outcomes are persisted in the ledger.
27. As a recruiter, I want to cancel an interview, so that abandoned or invalid interview attempts are still tracked accurately.
28. As a company user, I want to review completed interviews later, so that I can follow up after the event.
29. As a company user, I want interview exports to include structured interview data and optionally CV files, so that my team can continue reviewing outside the platform.
30. As check-in staff, I want a focused operational view for company arrival handling, so that I can quickly mark companies as arrived without navigating admin-heavy pages.
31. As an admin, I want an operational monitoring page, so that I can understand event readiness and execution status at a glance.
32. As an admin, I want to manage user access and roles, so that the platform’s privileged accounts stay aligned with event staffing.
33. As an admin, I want to manage company accounts, so that organizer-owned company records remain correct before and during the event.
34. As an admin, I want to manage rooms, so that the venue structure can be edited without code changes.
35. As an admin, I want to assign companies to rooms and stands, so that the venue map and operational ledgers reflect the real event layout.
36. As an admin, I want to upload one large venue map image, so that the public map matches the actual physical venue.
37. As an admin, I want to pin rooms onto the uploaded map, so that map interactions are based on the real floor plan.
38. As an admin, I want room pins to carry room details and linked company placement, so that the public map becomes useful navigation, not just decoration.
39. As a visitor, I want to open the public map and click room pins, so that I can discover which companies are located in each area.
40. As a visitor, I want company placement details to include current operational status, so that I can tell whether a company is active or has arrived.
41. As the product team, I want all role-based interfaces to be built with the shared design system and tokens, so that the platform stays visually coherent and easy to rebrand.
42. As a mobile student user, I want the product to work well on my phone, so that my core event interactions are reliable on-site.
43. As a company user, I want the workspace to work well on desktop in addition to responsive layouts, so that recruiters can operate comfortably from laptops or booth devices.
44. As an admin, I want desktop-friendly data-management screens, so that high-density operational tasks remain efficient.
45. As the engineering team, I want the implementation sliced into deep, stable modules, so that core event workflows remain testable and easier to evolve.

## Implementation Decisions

- Authentication will use one shared sign-in entry point for all roles.
- Self-service registration will be available only for students and will create accounts with the student role.
- Company, admin, and check-in users will use pre-created accounts rather than self-registration.
- Post-auth navigation will be role-aware and route users directly to their primary working surface instead of a generic dashboard.
- The student experience will be mobile-first and centered on onboarding completion, CV management, and QR access rather than analytics.
- Student onboarding will move from a simple profile upsert into an explicit readiness flow with required information and a notion of completion.
- Company workflows will be centered on recruiter operations and active interviewing rather than passive reporting.
- The company interview flow will be modeled as scan QR -> preview student -> confirm start -> choose or reuse recruiter -> choose CV -> rate -> add notes -> complete or cancel.
- Recruiter selection will support persisted local device preference while remaining correct when local state is missing.
- Interview notes will be added as first-class persisted interview data in the backend and exposed in contracts, ledgers, and exports where appropriate.
- Existing interview tagging will be retained, with global tags remaining organizer-controlled and company tags remaining company-scoped.
- Completed and cancelled interviews will continue to be represented explicitly rather than inferred from missing data.
- Check-in remains a separate operational role with a narrowly scoped surface focused on company arrival handling.
- Admin capabilities will include both operational monitoring and configuration/data-management pages.
- Venue management will continue to separate room definition from company placement, while expanding to support map publishing concerns.
- The venue map will be modeled as one uploaded image plus admin-managed room pin metadata, rather than as a vector drawing system.
- Public map interactions will resolve from room pins to room details, linked companies, and company status.
- Company status shown publicly will be derived from the existing operational state that tracks arrival and placement.
- Shared RPC contracts should remain the source of truth for role-facing APIs; app routes and components should stay thin.
- Business rules should continue to live in server services and repositories rather than in route components.
- New deep modules should be introduced around auth entry/routing, student readiness, interview session orchestration, venue map publishing, and admin operations so the interfaces remain simple while hiding event-specific workflow logic.
- Schema evolution will likely include at least interview notes and venue map metadata, and may include additional onboarding completeness fields if the required student profile grows.
- UI implementation should use the shared design system primitives and tokenized styling rather than introducing ad hoc component systems.
- The first delivery focus should be information architecture and core role journeys, followed by remaining pages and visual refinement.

## Testing Decisions

- Good tests should verify externally visible behavior, permissions, state transitions, and contract outcomes rather than implementation details.
- RPC handler integration tests should continue to be the main proof that role permissions, service orchestration, and repository behavior are wired correctly.
- Schema/input tests should continue to protect payload validation boundaries for onboarding, interview actions, placement management, and map-management payloads.
- The student readiness module should be tested for required-field rules, readiness transitions, and post-auth routing decisions.
- The interview workflow module should be tested for scan resolution, recruiter selection behavior, start confirmation, completion, cancellation, score persistence, notes persistence, and export behavior.
- The venue map publishing module should be tested for admin-only mutation access, pin-to-room consistency, and public map projection behavior.
- The admin operations module should be tested for role restrictions, ledger correctness, placement management, and map-management side effects.
- The company operational interface should be tested for remembered recruiter behavior where local preference exists and fallback selection behavior where it does not.
- Prior art already exists in the codebase for RPC handler integration tests and request/input validation tests; new tests should follow those patterns instead of introducing a separate test style.
- Tests should favor deep-module boundaries and transport contracts, not component internals.

## Out of Scope

- A student statistics dashboard or analytics-heavy student home.
- Separate authentication portals per role.
- Self-service company, admin, or check-in account registration.
- Real-time live collaboration or websocket-heavy event control features unless later required.
- Advanced vector map editing, CAD-like floor planning, or multi-image map composition.
- General-purpose CMS features beyond the event map and event operations data needed for this platform.
- Non-essential reporting dashboards beyond the operational monitoring needed by admins and company interview review/export needs.

## Further Notes

- The current backend already covers meaningful parts of student, company, interview, venue, and admin behavior, so this PRD is partly a completion and productization effort rather than a greenfield build.
- Existing role values already include `admin`, `student`, `company`, and `check-in`, which aligns well with the requested product shape.
- Existing interview storage already supports completion, cancellation, scoring, recruiter attribution, and tag capture, but not interview notes yet.
- Existing venue behavior already supports rooms, stand placement, and company arrival tracking, which should be extended into public map publishing.
- The home route is still placeholder UI, so most user-facing surfaces described here remain to be designed and implemented.
