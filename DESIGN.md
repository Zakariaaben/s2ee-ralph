# DESIGN.md

## Purpose
This file translates the S2EE visual identity Figma file into practical UI rules for this monorepo.

Use it when building or reviewing UI in `apps/web` and shared primitives in `packages/ui`. The Figma nodes listed below are the source references. The implementation should follow their intent, not invent a separate app look.

Design sentence:

> S2EE is a precise event operating surface: institutional, indexed, mono-led, and public-facing without becoming marketing.

## Figma Source Map
File: [Visual identity](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?m=dev)

The linked Figma nodes are the canonical references for the app visual identity. When implementing UI, use the nodes as follows.

| Figma node | Use in the app | Implementation responsibility |
| --- | --- | --- |
| [`93:454`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-454&m=dev) | Primary identity board | Overall brand mood, density, composition, and visual restraint. Start here before changing public or auth UI. |
| [`93:485`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-485&m=dev) | Main S2EE mark | Primary logo/wordmark behavior for headers, public home, auth shell, and compact app chrome. |
| [`93:488`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-488&m=dev) | Secondary mark system | Compact lockups, reduced-size marks, favicon-like usage, and mobile header treatment. |
| [`93:631`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-631&m=dev) | Color system | CSS variables, Tailwind token mapping, foreground/background contrast, active states, and status colors. |
| [`93:521`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-521&m=dev) | Typography system | Type scale, label style, mono usage, uppercase rules, tracking, and hierarchy. |
| [`93:535`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-535&m=dev) | Layout grid and spacing | Page rhythm, structural whitespace, split layouts, rails, section padding, and responsive collapse. |
| [`93:547`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-547&m=dev) | Graphic language | Rules, dividers, index marks, coded labels, and any non-illustrative brand motifs. |
| [`93:677`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-677&m=dev) | Surface language | Panels, sheets, border strength, radius, map inspector surfaces, and form planes. |
| [`93:650`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-650&m=dev) | Control language | Buttons, links, toolbar controls, segmented controls, active/pressed states, and focus treatment. |
| [`93:727`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-727&m=dev) | Public application pattern | Homepage, public event entry, route index, and public-facing content hierarchy. |
| [`93:737`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-737&m=dev) | Map application pattern | Venue map, room pins, room list, selected room inspector, and map legend behavior. |
| [`93:704`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=93-704&m=dev) | Status and icon pattern | Icons, status marks, bullets, state indicators, arrival/pending markers, and empty-state signals. |
| [`101:814`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=101-814&m=dev) | Workspace shell pattern | Authenticated admin, company, student, and check-in shells: navigation, sidebars, headers, and command bars. |
| [`101:836`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=101-836&m=dev) | Data and form pattern | Tables, forms, details pages, list rows, validation, empty states, and CRUD surfaces. |
| [`113:22`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=113-22&m=dev) | Mobile pattern | Mobile public pages, mobile auth shell, stacked map inspector, and touch target rhythm. |
| [`113:43`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=113-43&m=dev) | Component states | Hover, active, selected, disabled, loading, error, success, and focus states. |
| [`115:70`](https://www.figma.com/design/SSTjQLy3S5IVplllh3YMXU/Visual-identity?node-id=115-70&m=dev) | Final visual QA reference | Use as the final comparison board before shipping broad UI changes. Check for mood, density, rhythm, and token drift. |

If a Figma layer name conflicts with this table, the Figma layer name wins. Update this file after inspecting the node so the table stays exact.

## Identity Principles

### Atmosphere
S2EE should feel like an event system used by students, companies, organizers, and public visitors during a real employment fair.

The interface is:
- institutional
- precise
- mono-led
- operational
- bright and cold-neutral
- information-first
- sparse without feeling unfinished

The interface is not:
- startup SaaS
- warm editorial
- playful campus branding
- generic dashboard
- decorative landing page
- luxury portfolio

### Density, Variation, Motion
Use these calibration values:
- Density: 5/10 for public pages, 7/10 for authenticated workspaces.
- Variation: 6/10. Pages may differ structurally, but tokens and controls must stay consistent.
- Motion: 3/10. Motion clarifies state change only.

### Real Element Doctrine
Every visible object should correspond to a real event object or route decision.

Good UI content:
- event edition
- school or institution name
- access model
- role and account type
- company name
- student identity
- interview slot
- room code
- venue pin
- arrival state
- selected room manifest
- route label
- map legend
- admin command

Avoid filler:
- fake metrics
- testimonial-style blocks
- generic feature cards
- promotional claims
- decorative counters
- vague onboarding copy

## Token System

### Color Roles
Keep the app on one cold neutral system with one primary accent.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `--s2ee-canvas` | `#F8FAFC` | Main app/page background. |
| Canvas wash | `--s2ee-canvas-glow` | `#EEF4FB` | Subtle grid wash or secondary background. |
| Surface | `--s2ee-surface` | `#FFFFFF` | Forms, inspectors, active content planes. |
| Surface soft | `--s2ee-surface-soft` | `#EEF2F7` | Headers, side rails, inactive sheets, legends. |
| Primary text | `--foreground` / graphite | `#0F172A` target | Primary text and strong labels. |
| Secondary text | `--s2ee-soft-foreground` | `#334155` | Supporting hierarchy. |
| Muted text | `--s2ee-muted-foreground` | `#64748B` | Metadata and helper text. |
| Border | `--s2ee-border` | `#E2E8F0` | Default dividers and panels. |
| Strong border | `--s2ee-border-strong` | `#CBD5E1` | Active frames, selected rows, stronger separators. |
| Accent | `--color-primary` | project primary | Primary action, active route, selected pin, focus. |

Current implementation already defines these in `apps/web/src/index.css`. Keep Figma color changes mapped there before spreading hardcoded values through components.

### Color Rules
- Use the accent sparingly: active route, primary CTA, selected entity, focus, and essential status.
- Do not introduce purple, beige, cream, warm brown, or large blue gradients.
- Do not use colored shadows.
- Do not use black `#000000`; use graphite-like dark values.
- Status colors may exist for destructive, warning, success, and info states, but they should stay quiet and system-like.

## Typography

### Font Stack
Use Geist as the product family and Geist Mono as the identity voice.

In app CSS:
- `--font-heading`: Geist
- `--font-sans`: Geist
- `--font-mono`: Geist Mono

Public identity surfaces should lean mono. Dense workspace surfaces may use Geist for readability, with mono reserved for labels, codes, metadata, and command elements.

### Type Behavior
- Brand marks and edition labels: mono, heavy weight, tight tracking.
- Route labels: uppercase, mono, tracked.
- Room codes and status tokens: mono, compact, machine-readable.
- Form labels: mono or small sans, clear, never floating.
- Body copy: short and direct.

### Suggested Scale
- Display: `clamp(3rem, 10vw, 8rem)` for public identity moments.
- Page title: `clamp(2rem, 5vw, 4rem)`.
- Section heading: `1.25rem` to `2rem`.
- Body: `0.95rem` to `1rem`.
- Compact labels: `0.68rem` to `0.78rem`, uppercase, tracked.
- Data cells: `0.85rem` to `0.95rem`.

Do not use oversized slogans. The event name and edition are the hero, not invented copy.

## Layout Language

### Core Structures
Build pages from:
- split planes
- command bars
- side rails
- inspector panes
- ruled lists
- data tables
- map canvases
- route indexes
- definition rows

Avoid defaulting to:
- equal three-card rows
- nested cards
- card mosaics
- centered hero sections
- marketing feature grids
- decorative preview panels

### Page Rhythm
- Public pages can use large whitespace and strong asymmetric splits.
- Auth pages should use a two-plane split: system context on one side, active form on the other.
- Workspace pages should use dense, scannable chrome with command bars and tables.
- Map pages should make the map plane dominant and keep the inspector functional.

### Responsive Rules
- Mobile collapses to one column.
- Keep route controls reachable without introducing a marketing nav.
- Map inspector moves below or into a sheet on mobile.
- Buttons and row actions must keep stable dimensions and not resize on hover.
- Use `100dvh` where full-height behavior matters.

## Component Rules

### Buttons
Use the control language from node `93:650`.

Primary:
- solid accent
- uppercase or compact command label
- stable height, usually `44px` to `56px`
- active state may use `scale(0.98)` or `translateY(1px)`

Secondary:
- white or soft surface fill
- structural border
- same height as the primary button when paired

Icon buttons:
- use lucide icons where possible
- include accessible labels/tooltips
- do not replace familiar symbols with text pills

### Links and Navigation
- Active navigation should use accent color, underline, or strong border.
- Inactive navigation should use muted or secondary text.
- Keep labels literal: `Accueil`, `Plan`, `Connexion`, `Admin`, `Entreprises`, `Entretiens`.

### Surfaces
Use node `93:677` for surface decisions.

Surface hierarchy:
- Canvas: page-level background.
- Soft plane: rails, headers, inactive side panels.
- White plane: active forms, active table area, map inspector.
- Ruled area: facts, definitions, manifests, row groups.

Radius:
- Utility controls: `8px` to `12px`.
- Panels/sheets: `12px` to `20px`.
- Avoid soft pill-heavy UI unless the Figma control node explicitly calls for it.

### Forms
Use node `101:836`.

Rules:
- Label above input.
- Error below input.
- No floating labels.
- Keep helper text minimal.
- Group related fields with separators or fieldsets, not decorative cards.
- Submit action should be visually dominant only when it is the main page action.

### Tables and Lists
Use node `101:836`.

Rules:
- Prefer rows, separators, and definition pairs over cards.
- Row hover should be subtle and not shift layout.
- Selected rows use accent border, accent text, or soft accent wash.
- Empty states should state the missing real object and the next command.

### Status and Icons
Use node `93:704`.

Rules:
- Status marks must be small and consistent.
- Use text plus indicator when the state matters operationally.
- Avoid thick iconography.
- Avoid decorative badges with no state meaning.

## Page Directives

### Public Home `/`
Use nodes `93:727`, `93:454`, `93:485`, and `93:535`.

The public home is an event entry surface. It should provide:
- S2EE identity and edition.
- One sentence explaining the event.
- Primary route into sign-in.
- Secondary route to public map.
- Event facts such as institution, edition, access model, and map availability.

Composition:
- Desktop: asymmetric split, identity on one side, operational facts or route index on the other.
- Mobile: identity first, route actions immediately reachable, facts below.
- Use real event facts only.

Do not add:
- feature-card grids
- fake social proof
- company logo clouds unless the data is real
- generic marketing sections

### Auth `/auth/sign-in` and `/auth/sign-up`
Use nodes `93:650`, `93:677`, `101:836`, and `113:22`.

The auth pages are secure access surfaces. They should provide:
- clear distinction between sign-in and sign-up
- account policy
- role expectations
- route back to home
- public map route

Composition:
- Desktop: two planes, with the form plane visually dominant.
- Mobile: compact header, then form.
- Supporting content should explain real access rules only.

Do not add:
- auth tabs unless the flow actually needs them
- marketing panels
- fake dashboard previews
- promotional reasons to register

### Public Map `/map`
Use nodes `93:737`, `93:704`, `93:677`, and `113:22`.

The map page is a public navigation board. It should provide:
- venue image
- room pins
- selected room inspector
- company placement list
- arrival or availability state where relevant
- lightweight legend

Composition:
- Top command bar, not a hero.
- Dominant map plane.
- Inspector pane on desktop.
- Stacked inspector or sheet on mobile.

Do not add:
- analytics dashboards
- KPI strips
- decorative map widgets
- duplicate explanatory copy

### Admin Workspace `/admin/*`
Use nodes `101:814`, `101:836`, `93:650`, and `113:43`.

The admin workspace is a control surface. It should prioritize:
- command clarity
- data density
- fast scanning
- stable tables
- direct edit flows
- clear empty, loading, and error states

Use:
- sidebar or command rail
- top-level page title and route metadata
- tables and row actions
- modals or sheets for focused edits

Avoid:
- decorative dashboards
- large marketing headings
- cards when a table or ruled list is better

### Company Workspace `/company/*`
Use nodes `101:814`, `101:836`, and `113:43`.

The company workspace should feel like a focused interview operations desk.

Prioritize:
- upcoming interviews
- student profile access
- interview state
- room/time metadata
- action clarity

### Student Workspace `/student/*`
Use nodes `101:814`, `101:836`, and `113:22`.

The student workspace should feel calm and task-oriented.

Prioritize:
- profile completion
- available interview information
- uploaded CV state
- clear next action

### Check-In Workspace `/check-in`
Use nodes `101:814`, `93:704`, `101:836`, and `113:43`.

The check-in surface should feel operational and resilient.

Prioritize:
- scan/input area
- current attendee/company/student state
- success/failure signal
- fast recovery action
- large enough controls for live event use

## Motion
Use motion only to clarify state change.

Allowed:
- fade-up entrance for page sections
- subtle selected-row transition
- inspector open/close
- active press feedback
- map pin state interpolation

Rules:
- animate `opacity` and `transform`
- duration: `180ms` to `300ms` for controls
- duration: `500ms` to `750ms` for page entrance
- respect `prefers-reduced-motion`

Avoid:
- bouncing
- perpetual decorative motion
- scroll arrows
- parallax
- background blob animation

## Implementation Rules

### Where Tokens Live
Global identity tokens belong in:
- `apps/web/src/index.css` for S2EE app-level variables.
- `packages/ui/src/styles/globals.css` only for shared UI defaults that should apply across apps.

Do not hardcode identity values repeatedly in route components. Add or adjust a variable first.

### Component Ownership
- Shared generic primitives belong in `packages/ui`.
- S2EE-specific composition belongs in `apps/web/src/components`.
- Page-specific orchestration belongs near the route or route component.

### Review Checklist
Before shipping a UI change, check it against node `115:70` and this list:
- Does the screen still feel like S2EE?
- Are the visible elements real event objects or real route decisions?
- Are color, type, spacing, and controls drawn from the node map?
- Did any purple, beige, warm editorial, or generic SaaS pattern slip in?
- Are forms and tables stable at mobile and desktop sizes?
- Are interactive states covered: hover, active, selected, disabled, loading, error, focus?
- Is the map still a navigation board rather than a dashboard?

## Hard Bans
- No emojis in product UI.
- No decorative blobs or bokeh.
- No gradient hero backgrounds.
- No fake metrics.
- No fake testimonials.
- No generic feature cards.
- No nested cards.
- No centered marketing hero as the first screen.
- No Inter as a replacement for the identity fonts.
- No serif fonts.
- No beige, cream, warm brown, or purple-led palette.
- No large shadows or colored shadows.
- No vague copy such as `seamless`, `next-gen`, `elevate`, or `unleash`.

## Stitch / Agent Prompt
Use this prompt when generating S2EE UI from the visual identity:

> Build S2EE as a precise employment-fair operating surface. Use the Figma Visual identity file as the source of truth, especially nodes `93:454`, `93:631`, `93:521`, `93:535`, `93:650`, `93:677`, `93:727`, `93:737`, `101:814`, and `101:836`. The app should be bright, cold-neutral, institutional, mono-led, and information-first. Build structure from split planes, command bars, rails, inspector panes, ruled lists, tables, and map canvases. Avoid marketing cards, fake metrics, decorative gradients, warm tones, and generic SaaS styling. Every element must represent a real event object, route, state, or command.
