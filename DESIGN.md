---
name: DPX Labs
description: Intelligence for the Physical World. Editorial spreads on warm paper, with physics simulated in live ASCII characters.
colors:
  paper: "#F3F0E9"
  ink: "#1E1C19"
  ink-soft: "#4A453E"
  graphite-muted: "#6E685E"
  hairline: "#DCD6CA"
typography:
  display:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "clamp(40px, 6.6vw, 96px)"
    fontWeight: 300
    lineHeight: 1.0
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "clamp(28px, 4.1vw, 56px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.028em"
  title:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 64px)"
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  lede:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "clamp(19px, 1.7vw, 24px)"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  item:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "clamp(22px, 1.9vw, 27px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, sans-serif"
    fontSize: "16.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.22em"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  gap: "clamp(16px, 2.2vw, 32px)"
  section: "clamp(112px, 17vh, 208px)"
  rule-inset: "clamp(28px, 4vh, 44px)"
  page: "1360px"
components:
  nav-link:
    textColor: "{colors.graphite-muted}"
    typography: "{typography.label}"
    padding: "10px 0"
  nav-link-active:
    textColor: "{colors.ink}"
  scene-tab:
    textColor: "{colors.graphite-muted}"
    typography: "{typography.label}"
    padding: "10px 2px 12px"
  scene-tab-active:
    textColor: "{colors.ink}"
  rail:
    textColor: "{colors.graphite-muted}"
    typography: "{typography.label}"
  topic-row:
    textColor: "{colors.ink}"
    padding: "clamp(16px, 2.2vh, 22px) 0"
  mail-link:
    textColor: "{colors.ink}"
    padding: "0 0 10px"
  skip-link:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "10px 14px"
---

# Design System: DPX Labs

## Overview

**Creative North Star: "The Live Folio"**

A quiet scientific folio printed on warm paper, in which the only thing that moves is the physics. Every section is a spread on one 12-column grid: a numbered index sits in a left margin rail, one idea is set large in light Inter Tight, and hairline rules divide the page the way a journal divides its articles. The characters are the simulation. Colour, density and motion live only inside the ASCII fields (the hero matrix and the small micro-fields below it); the typographic page around them stays ink on paper.

Density is low and deliberate: one claim per section, short copy, generous vertical air between spreads (section padding up to 208px). The register is understated and premium: light display weights with tight negative tracking, small widely tracked mono labels, no fills, no shadows, no rounded corners. The hero engine (nine scenes, glyph buckets, transitions, pointer interaction) is documented in `landing-page.md` and is part of this world, not decoration on top of it.

Confirmed rejections from the direction contract: the feature-card grid, the stats band, and section labels set as kickers above headings.

**Key Characteristics:**
- Warm paper ground, near-black ink, one muted graphite for secondary voice; no brand accent colour on the page itself.
- Light (300) Inter Tight display type with tight tracking; JetBrains Mono only for labels, indices, navigation, the wordmark and the ASCII.
- Editorial spreads on a 12-column grid with a margin rail and hairline rules.
- Live ASCII character fields as the only imagery and the only place colour appears.
- Flat, square, line-drawn: depth comes from rules and value contrast, never from shadow.

## Colors

A warm, nearly monochrome paper-and-ink palette; hue is reserved for the character fields.

### Neutral
- **Warm Paper** (paper): the page ground everywhere, including header, canvases and `theme-color`. Brief-pinned; do not tint or swap it.
- **Lamp-Black Ink** (ink): headlines, primary text, the active nav underline, top rules on lists that open a group (directions, topics), the status square, focus outlines and the selection fill.
- **Soft Ink** (ink-soft): lede and supporting prose; the second paragraph of a two-column prose pair.
- **Graphite Muted** (graphite-muted): rail labels, resting nav and scene tabs, mono sub-labels, empty-state text, the footer, and the turned second clause of a display headline. Darkened from the hero's original #8A8378 to reach 4.86:1 on paper (WCAG AA); never lighten it back.
- **Hairline** (hairline): section-top rules, row dividers, the scrolled header rule, the inactive scene progress track, and the scrollbar thumb.

### Field ramps (canvas only)
The ASCII renderer draws from named ramps defined in `js/core.js`, tuned for the paper ground: **ink** (paper-grey to ink), **cold** (pale glacier to deep teal-blue), **mist** (faint blue haze), **heat** (oxide red to amber) and **thermal** (blue through sand to ember). These are the only blues and ambers in the system.

### Named Rules
**The Colour-Lives-in-the-Field Rule.** Blues and ambers appear only inside live character fields, drawn from the `core.js` ramps. Type, rules, links and controls are ink, soft ink, graphite or hairline.

**The Ink-Opens, Hairline-Divides Rule.** Ink-weight rules (1px ink) open a group of items; hairline rules (1px hairline) separate sections and rows. No other border colours.

## Typography

**Display Font:** Inter Tight 300/400/500 (with ui-sans-serif, system-ui, Helvetica Neue)
**Label/Mono Font:** JetBrains Mono 400/500 (with ui-monospace, SF Mono, Menlo)

**Character:** A light, tightly tracked grotesque for single large ideas, against a small, wide-tracked monospace that reads as instrument labelling. The mono is the same face the ASCII is drawn in, so labels and simulation share one voice.

### Hierarchy
- **Display** (300, clamp(40px, 6.6vw, 96px), 1.0, -0.04em): the opening claim of the Vision spread and the Contact sign-off. One per spread at most. A second clause may turn to graphite muted.
- **Headline** (400, clamp(28px, 4.1vw, 56px), 1.06, -0.028em): the fixed hero headline only, centred above the matrix.
- **Title** (300, clamp(34px, 4.6vw, 64px), 1.04, -0.035em, max 16ch): the heading of every other spread.
- **Lede** (400, clamp(19px, 1.7vw, 24px), 1.4, max 34ch): one supporting sentence under a display or title, in soft ink. About prose runs a step smaller (clamp(18px, 1.45vw, 21px), 1.5, max 36ch).
- **Item** (400, clamp(22px, 1.9vw, 27px), 1.15): direction names; topic rows run clamp(20px, 2vw, 28px) at 1.2.
- **Body** (400, 16.5px, 1.5, max 30–52ch): direction descriptions and empty-state text.
- **Label** (mono 500, 11px, 0.22em, uppercase): rail index and label, nav, scene tabs, sub-section labels, status. Metadata and footer use mono 400 at 11px, 0.18em. The wordmark is mono 500 13px at 0.24em.

### Named Rules
**The Eleven-Pixel Floor Rule.** No functional text below 11px. Labels gain legibility from tracking and case, not from size.

**The One-Idea Rule.** Each spread carries one display or title-scale statement. Everything else in the spread steps down to lede, item or body scale; a spread never carries a second title-scale heading.

## Layout

One 12-column grid (column gap clamp(16px, 2.2vw, 32px)) inside a 1360px page with side gutters of clamp(16px, 4vw, 48px). Columns 1–3 are the **rail**: the section index in ink, its label in graphite muted, and on Research the status line. Columns 4–12 hold the content. Spreads are separated by clamp(112px, 17vh, 208px); the Vision spread takes 1.15 times that, and Contact spans all 12 columns with its own bottom padding.

From the second spread on, both rail and content carry a hairline top rule with clamp(28px, 4vh, 44px) of inset above the first line. Directions sit in a two-column list; topics are full-width rows; About prose is a two-column pair.

Responsive behaviour:
- **≤ 900px:** the rail becomes a right-aligned folio on the section's top rule: the index stays, the label hides, and the research status moves to the left end of the same line. Content spans all columns.
- **≤ 640px:** directions and prose collapse to one column; the hero matrix drops from 60svh (clamp 320–780px) to 42svh (clamp 260–400px).

The hero is the one centred composition: brand left and nav right in the header, then the centred headline, the matrix and the nine scene tabs, filling the first viewport.

## Elevation & Depth

The system is flat. There are no shadows, no fills behind content, and no layered surfaces; the sticky header uses the same paper as the page and only gains a hairline bottom rule once the hero headline scrolls away. Depth is carried by value contrast (ink against graphite against hairline) and by the density of the ASCII fields.

### Named Rules
**The Paper-Is-One-Sheet Rule.** Nothing sits above the page. If something needs separation, give it a rule, not a shadow or a tinted panel.

## Shapes

Square and line-drawn. Every corner is 0px. Form is made of 1px rules: hairline section tops, ink group openers, underline states on nav and the mail link, the 1px focus outline offset 4px. The only solid shape is the 7px ink status square. Icons are drawn as inline SVG strokes at 1.5px (the mail arrow is the one instance).

## Components

### Navigation
Precise and quiet. Mono 500 11px uppercase at 0.22em, graphite muted at rest. Hover turns the link to ink; the section in view is marked with `aria-current` and a 1px ink underline that wipes in from the left (0.5s, cubic-bezier(0.16, 1, 0.3, 1)). The header is sticky at 66px. On narrow screens tracking tightens to fit three links beside the wordmark; the links never collapse into a menu.

### Scene Tabs (hero)
The same label voice as navigation, centred under the matrix. The pressed tab is ink with a hairline track under it, filled by a 1px ink bar that grows with scene progress. Behaviour and timing are defined in `landing-page.md`.

### Spread Rail
Index (ink) over label (graphite muted), mono 11px uppercase. It is the only place section numbers appear. It is never moved above a heading.

### Directions List
Four items in a two-column grid, each opened by a 1px ink rule, then a live micro-field (clamp(104px, 11vw, 136px) tall), an item-scale name and one line of body copy in soft ink. Each item's field is matched to its idea: wave (ink ramp), flow (cold ramp), sense (thermal ramp with `[o]` sensor markers), lattice (ink and cold).

### Topics List
Full-width rows of item-scale text, opened by an ink rule and separated by hairlines. Plain text, no links, no icons.

### Papers List and Empty State
Rows of date, title, kind: mono 11px metadata either side of the title, ink rule on top, hairlines between. With nothing published, a hairline-topped paragraph in graphite muted says so plainly. On the Research page, `pub-list--lead` holds DPX Labs' own work at item scale (27px); `pub-list--prior` holds the founders' prior work at 18px, with an author/venue line in soft ink under each title, the year set once per group and a short kind tag (JOURNAL, PROCEEDINGS, WORKSHOP, THESIS). Linked titles carry the stroked arrow at rest.

### Research page components
- **Intro spread** (`spread--intro`): display-scale h1, rail with label and status but no index; numbering starts at 01 below it.
- **Page index** (`page-index`): a sticky row under the header, the scene-tab pattern; the active item's 1px bar fills with reading progress through its spread. Scrolls sideways on narrow screens.
- **Field figure** (`field-figure`): a wide micro-field on the subgrid with real-text zone labels in columns 1–3 and a "FIG. n" caption (11px mono label, 15px soft-ink text) under a hairline. Zone heights: `--odt-field-h`, `--odt-strip-h`.
- **`odt` field**: dim ink turbulence with one line of sight in `thermal`, unrolled below as its temperature profile; triplet-map events fold it. Thermal appears only on the line and profile.
- **Architecture** (`arch` + `conduit` field): stage labels are HTML on a 5-column grid with no boxes; a thin ASCII canvas behind them carries ink packets, about one in five returning through the reference solver in `cold`. Stacks vertically at ≤640px.
- **More link** (`more-link`): 11px mono caps with the 1.5px stroked arrow and the mail link's wipe underline; the small secondary link. The mail link stays the only large call to action.
- **Spacing token** `--block`: clamp(48px, 7vh, 80px), the gap between groups within a spread.

### Mail Link (signature)
The contact address at clamp(26px, 3.4vw, 46px), weight 300, with a 1px ink underline and a stroked SVG arrow. On hover the underline wipes away to the right and the arrow lifts toward its corner (0.6s, same ease). It is the page's only call to action.

### Micro-Field and Calm Band (signature)
Small ASCII canvases that share the hero's renderer, glyph buckets and ramps. On first view each field rebuilds out of the quiet `.·:` lattice over 1.6s, then runs only while it is on screen. Under `prefers-reduced-motion` each draws one static frame. A 56px calm lattice band in pale ink closes the page above the footer.

## Do's and Don'ts

### Do:
- **Do** set section indices in the margin rail (columns 1–3), or on the top-rule folio below 900px.
- **Do** keep one display or title statement per spread, weight 300 with tracking between -0.035em and -0.04em.
- **Do** use JetBrains Mono at 11px uppercase with 0.18–0.22em tracking for every label, index, nav item and metadata line.
- **Do** divide with 1px rules: ink to open a group, hairline between sections and rows.
- **Do** draw any new imagery as a live ASCII field using the `core.js` ramps and the shared renderer, with a static reduced-motion frame and rendering paused off screen.
- **Do** keep the single authored entrance (lattice rebuild, 1.6s); state changes use cubic-bezier(0.16, 1, 0.3, 1) at 0.3–0.6s.
- **Do** keep graphite muted at #6E685E or darker for any text.

### Don't:
- **Don't** put a numbered or uppercase label above a heading as a kicker; the rail holds it.
- **Don't** build feature-card grids, stat bands, tinted panels, shadows or rounded corners.
- **Don't** use blue or amber outside a character field.
- **Don't** add pulses, looping indicators or text reveal animations; the status square is static.
- **Don't** set functional text below 11px.
- **Don't** list papers, models, partners or metrics that do not exist; use the empty state. Founders' prior work may be listed, kept separate from DPX Labs' own.
