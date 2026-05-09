# S2EE 17 Landing Design Notes

## Identity

S2EE means **Salon de l'emploi de l'ESI**. The event is organized by **ETIC Club**, so the ETIC logo must be visible in the navbar and can be reused in organizer-focused blocks. The app asset is available at:

```txt
/etic.svg
```

The landing page should feel artistic and event-led, not like a generic SaaS dashboard. The visual direction is based on motion lines, luminous points, soft layered panels, and the S2EE 17 identity mark.

## Palette

Use the visual identity colors as the base system:

- Navy: `#0B132B`
- Light gray: `#EAEAEA`
- Yellow accent: `#F4E87C`

Navy should carry the atmosphere. Light gray should be used for readable surfaces and cards. Yellow is an accent, not a dominant background.

## Typography

Use **Satoshi** across the interface.

The Figma S2EE 17 mark should be used as an image asset for major identity moments. When writing `S2EE`, `S2EE 17`, or related wordmarks as live text elsewhere, add positive tracking so the letters do not look stuck together.

Recommended class:

```css
.s2ee-small-wordmark {
  letter-spacing: 0.08em;
}
```

Avoid tight or negative letter spacing on the wordmark.

## Border Radius

The components should not look square, but they also should not become generic pills.

Current radius tokens:

```css
--radius: 0.875rem;
--s2ee-panel-radius: 1.05rem;
--s2ee-control-radius: 1rem;
```

Use:

- `--s2ee-panel-radius` for landing sections, company cards, and featured panels.
- `--s2ee-control-radius` for buttons, inputs, filters, and compact controls.
- `999px` only for circles, badges, logo containers, and true round marks.

## Landing Structure

The landing page must be divided into sections:

- Hero: S2EE 17 identity, event title, date, place, and ETIC organizer presence.
- Event atmosphere: a more editorial/artistic section explaining the salon as a staged meeting space.
- Featured companies: admin-managed company cards with logo, description, profiles searched, and opportunity counts.
- Salon plan: embedded as a section, not treated as the main page story.

Do not bring back landing facts about account creation, access model, or plan availability. Those are product mechanics, not hero content.

## Company Cards

The companies section is separate from the salon map. It is managed by the admin through the `featured_company` data model and should not be derived from plan placements.

Each card can show:

- Company name
- Logo or logo label
- Short description
- Profiles searched
- Opportunity counts: jobs, internships, practical internships, PFE

Use real admin-provided data. Do not invent fake company data in the landing page.

## Avoid

- Generic AI-looking bento blocks.
- Access/account/plan statistics in the hero.
- Companies pulled from map booths.
- Very square cards.
- Over-rounded pill-heavy layouts.
- One-color navy-only composition with no gray/yellow rhythm.
- Tight S2EE wordmarks as live text.
