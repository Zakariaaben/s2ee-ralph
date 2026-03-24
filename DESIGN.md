# Design System: S2EE Public, Auth, and Map

## 1. Visual Theme & Atmosphere
S2EE must feel like a sharp event operating surface with the discipline of Vercel, the restraint of Apple internal tools, and the confidence of a premium transit interface. It must not feel warm, editorial, cozy, or campaign-like. The work should read as product design, not as AI-generated web design.

Use these calibrated values:
- Density: 4/10
- Variance: 7/10
- Motion: 4/10

The atmosphere is:
- cold-neutral
- precise
- sparse but not empty
- technical
- mono-led
- calm under pressure

The atmosphere is not:
- friendly SaaS
- editorial luxury
- bento-card product marketing
- dashboard wallpaper
- startup landing page

Design sentence:
"A monochrome event system with strong typographic control, structural whitespace, and only real interface elements."

## 2. Core Visual Doctrine
This project must aggressively avoid AI slop. That means:
- fewer surfaces
- fewer boxes
- fewer ornamental badges
- fewer explanatory panels
- more real structure
- more direct hierarchy
- more meaningful interface objects

Meaningful interface objects include:
- room codes
- venue pins
- access rules
- event edition metadata
- route labels
- sign-in state
- map legend
- selected room manifest
- company arrival state
- public navigation controls

Do not create fake supporting content just to fill space.
Do not create decorative feature cards.
Do not create summary boxes if the same information can live in a list, rule, or rail.

## 3. Color Palette & Roles
One neutral palette. One accent. No drift.

- **Mist Canvas** (`#F8FAFC`) — main page background
- **Hard White** (`#FFFFFF`) — elevated form plane, map inspector plane, active content sheet
- **Steel Wash** (`#EEF2F7`) — muted strips, legends, dividers with light fill
- **Graphite 950** (`#0F172A`) — primary text and anchor contrast
- **Graphite 700** (`#334155`) — secondary hierarchy
- **Graphite 500** (`#64748B`) — tertiary labels and helper copy
- **Line 200** (`#E2E8F0`) — main structural borders
- **Line 300** (`#CBD5E1`) — stronger separators and active framing
- **Signal Blue** (`#2563EB`) — only accent, used for primary action, active state, selected pin, focus

Rules:
- No warm neutrals
- No beige
- No cream
- No black (`#000000`)
- No gradients as branding
- No second accent color
- No colored shadows
- No glassmorphism unless isolated and necessary

## 4. Typography Rules
Primary typographic system:
- **Display:** `Geist Mono`
- **Body:** `Geist Mono`
- **Meta / labels / codes:** `Geist Mono`

This is intentionally mono-led. The page should feel coded, signed, indexed, and operational.

Typography behavior:
- Headlines are large but controlled, never theatrical
- Use tracking and line breaks to create tone, not giant size alone
- Body copy is short and compact
- Labels are uppercase or coded where useful
- Room codes, route names, and status tokens must look machine-authored

Type sizing direction:
- Display: `clamp(2.75rem, 6vw, 5.5rem)`
- Section headers: `clamp(1.5rem, 3vw, 2.25rem)`
- Body: `0.95rem` to `1rem`
- Meta labels: `0.7rem` to `0.78rem`, uppercase, tracked

Banned:
- Inter
- Manrope
- all serif fonts
- oversized hero slogans
- gradient text
- mixed font systems

## 5. Layout Principles
### Global
- No centered hero compositions
- No three equal cards in a row
- No card grid as default layout
- Use split structures, rails, dividers, tables, index columns, and inspector patterns
- Prefer border lines and negative space over repeated containers
- Use CSS Grid, never percentage flex hacks
- Desktop can be asymmetric; mobile must collapse cleanly to one column
- Full-height sections use `min-h-[100dvh]`

### Structural Language
The interface should feel assembled from these patterns:
- editorial split
- command rail
- inspector pane
- pinned canvas
- indexed list
- ruled sheet
- status strip

Not from these patterns:
- hero card
- KPI row
- generic feature tiles
- testimonial-style blocks
- decorative marketing sections

## 6. Component Stylings
### Buttons
- Primary CTA: solid Signal Blue
- Secondary CTA: white fill with Line 200 border
- Shape: rounded but not soft, around `12px`
- Interaction: `scale(0.98)` or `translateY(1px)` on active
- If an arrow exists, nest it in a small internal mono-marked chip or rigid circular cell

### Surfaces
- Use surfaces only when the interface truly changes plane
- Default structure should be dividers and whitespace
- If a plane is needed, use a double-bezel construction:
  - outer shell: subtle line + minimal padding
  - inner core: white or steel wash fill
- Radius range: `14px` to `20px`

### Inputs
- Label above input
- Mono labels
- Error text directly below
- No floating labels
- No decorative helper copy unless it clarifies behavior

### Lists and Info Blocks
- Prefer ruled lists, definition rows, and manifest tables
- Use card treatment only when selection or focus requires elevation

### Map Pins
- Strong mono room code
- White fill by default
- Signal Blue fill when active
- Minimal hover label
- No cartoon pin shapes

## 7. Motion & Interaction
Motion must feel engineered, not animated for its own sake.

Allowed motion:
- fade-up reveals
- pin state interpolation
- active press feedback
- staggered list entrance
- subtle inspector transitions

Motion spec:
- duration: `500ms` to `750ms`
- easing: custom cubic-bezier only
- spring baseline: `stiffness: 100`, `damping: 20`
- animate only `transform` and `opacity`

Banned motion:
- bouncing cues
- scroll arrows
- ornamental perpetual loops
- floating blobs
- parallax gimmicks
- noisy background animation

## 8. Real Element Doctrine
Every page must contain elements that do real semantic work.

### `/`
Must include only real information:
- event edition label
- official event name
- one concise explanation of what S2EE is
- primary route into the platform
- public route into the venue map
- operational facts such as:
  - edition
  - host institution
  - public map availability

Do not add:
- fake feature cards
- made-up metrics
- fake testimonials
- company logo clouds
- vague product claims

### `/auth`
Must include:
- access model
- sign-in vs sign-up distinction
- organizer-managed roles note
- route back to public page
- route to public map

Useful real elements:
- access rules list
- route index
- account type policy strip
- compact state messaging

Do not add:
- auth tabs
- role marketing
- dashboard preview mocks
- promotional reasons to sign up

### `/map`
Must include:
- published venue image
- room pins
- selected room inspector
- company placement list
- arrival state
- lightweight legend if useful

Useful real elements:
- room code index
- selected room manifest
- room count
- company count in selected room
- arrived / pending markers

Do not add:
- KPI dashboard
- analytics summary strip
- decorative map widgets
- duplicate explanatory copy

## 9. Page-Specific Directives
### Homepage `/`
Composition:
- Left side: typographic hero with one primary CTA and one secondary CTA
- Right side: operational sheet or indexed event facts, not decorative content
- Below: one or two meaningful structural sections only

Allowed support section patterns:
- ruled fact sheet
- route index
- simple event access notes

The homepage should feel like:
"public terminal into the event"

It should not feel like:
"startup homepage"

### Auth `/auth/sign-in` and `/auth/sign-up`
Composition:
- strong two-plane split on desktop
- left plane = system framing
- right plane = active form
- the right plane must visually win

The auth pages should feel like:
"secure system access"

They should not feel like:
"marketing shell wrapped around a form"

Meaningful content on left plane:
- access policy
- route references
- role rules
- public map availability

### Map `/map`
Composition:
- top command bar, not hero
- dominant map plane
- right inspector plane
- optional room index strip if it improves navigation

The map should feel like:
"live public navigation board"

It should not feel like:
"admin dashboard shown to the public"

## 10. Anti-Patterns (Hard Bans)
- No emojis
- No Inter
- No serif fonts
- No warm tones
- No beige
- No purple
- No giant gradients
- No three-column equal cards
- No card mosaics
- No KPI strips on `/map`
- No hero cards
- No auth tabs
- No fake social proof
- No filler words like "elevate", "seamless", "next-gen", "unleash"
- No decorative numbers
- No centered hero
- No floating blobs
- No oversized shadows
- No thick iconography
- No overlapping headline/media tricks

## 11. Implementation Prompt For Stitch
Generate S2EE screens as a mono-led event operating system. Use `Geist Mono` as the main font across display, body, labels, codes, and metadata. Keep the canvas bright and cold-neutral. Use almost no cards. Build structure from split layouts, rails, dividers, inspector panes, and ruled lists. Every visible element must correspond to a real event object or real routing decision.

For `/`, create a left-aligned public entry page with a typographic hero and a right-side operational fact sheet. For `/auth`, create a two-plane access system where the form is dominant and the supporting content only explains real access rules. For `/map`, remove dashboard behavior entirely and make the map image, room pins, and selected room inspector the clear product.

Use only one accent color: `#2563EB`. Background: `#F8FAFC`. Surface: `#FFFFFF`. Muted surface: `#EEF2F7`. Primary text: `#0F172A`. Secondary text: `#334155` and `#64748B`. Borders: `#E2E8F0` and `#CBD5E1`.

Make the result feel expensive, technical, and disciplined. It must not look like generic AI SaaS design.
