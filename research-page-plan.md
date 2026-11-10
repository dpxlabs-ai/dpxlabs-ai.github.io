# Research page — plan

Source material:
- `research-page.md`, the user's brief;
- `../model1/dpxLabs_Physics_AI_Digital_Twin_Strategy_v2.md` and `../model1/dpxLabs_HPIM_Open_Source_Technology_Stack_v2.md`;
- the site rules in `PRODUCT.md` and `DESIGN.md`.

---

## 1. Format: one page, built as long-form spreads

**Recommendation:** a single new page, `research.html`, made of numbered spreads like the homepage, with a sticky in-page index. **No accordions.**

- **Why not accordions:** the site is designed as a folio, one idea per spread, set large. Collapsed panels hide the content people come to read and look like a FAQ. They also hide content from search engines and screen-reader skimming.
- **Why not several pages yet:** there isn't enough material to fill them. One page that is complete beats four thin ones. Split later: ODT can become `research/odt.html` once there is a paper or a demo to show.
- **Homepage:** keep the existing Research spread as a teaser. Add a "Read the research →" link and point the `RESEARCH` nav item at `research.html`.

### Page outline

| # | Spread | Purpose |
|---|---|---|
| 00 | Intro | Headline and a one-line lede |
| 01 | Where we come from | The founders' background in simulation |
| 02 | One-Dimensional Turbulence | The team's core technical lineage, with a live ASCII visual |
| 03 | How we build | A high-level architecture diagram that names no proprietary parts |
| 04 | Areas we are exploring | The four areas, a short block each |
| 05 | Principles | Four rules the work follows |
| 06 | Publications | The upcoming SC26 paper and the team's prior work |
| — | Contact strip | "Working on similar problems? dpxlabs@diphyx.com" |

---

## 2. Content by spread

### 00 · Intro
- Title: *Beyond pattern recognition.* (Keep the homepage line so the two pages connect.)
- Lede: *We build AI models that respect the physics they predict — and know when they're wrong.*
  - The second clause comes from the strategy headline: "Predictions that know when they're wrong."
- Rail status: keep the existing **Research in progress** marker.

### 01 · Where we come from
- One short paragraph: *Our founders have spent more than a decade in computational fluid dynamics, reacting flows and high-performance simulation — building the models and the solvers. DPX Labs carries that experience into machine learning.*
- **⚠ Wording conflict:** the brief asks to say "simulation in the Energy field", but `PRODUCT.md` says copy must not mention energy, power generation or industrial plants.
  - **Option A (recommended):** say "combustion, turbulent reacting flows and multiphysics simulation". This is accurate, says the same thing and keeps the rule.
  - **Option B:** if you want "energy" stated, update the rule in `PRODUCT.md` first so the site stays consistent.
- Possibly a small mono fact line, e.g. `CFD · COMBUSTION · HPC · MULTIPHYSICS DSLs`. Use field names only, no numbers.

### 02 · One-Dimensional Turbulence (ODT)
The centrepiece. The brief's draft needs two fixes before publishing:

- **⚠ Attribution:** ODT was not proposed by our team. Alan Kerstein at Sandia developed it in the late 1990s. Babak's work *applied and extended* ODT to coal and oxy-coal combustion, as in the 2014 PROCI paper and the 2014 Utah dissertation. Say "our team has developed and applied ODT-based methods". Do not say "suggested by our team". A reviewer would catch the wrong claim immediately.
- **⚠ Overclaim:** "maintains the accuracy and fidelity of the 3D world" is too strong. Accurate version: ODT resolves every scale along a single line of sight and models 3D turbulent mixing with stochastic eddy events. That way it captures the small-scale physics a coarse 3D simulation can't afford to resolve, at a fraction of the cost.

Draft copy:
> **One line through a turbulent world.**
> One-Dimensional Turbulence follows a single line of sight through a turbulent flow and resolves every scale along it — down to where mixing, heat release and chemistry actually happen. Three-dimensional eddies are represented by stochastic rearrangements of that line. The result keeps the physics that matter at a small fraction of a full 3D simulation's cost.
>
> **Why it matters for AI.** A compact representation that still respects the physics is exactly what a learning system needs: cheaper training data, sharper inductive bias, and a model whose predictions can be checked against the equations.

**Visual: a new micro-field, `odt`, in `js/micro-field.js`.**
- A full ASCII turbulent field, dimmed in `ink`.
- One horizontal line of sight drawn in full density with the `thermal` ramp.
- At intervals, a *triplet map* fires on a random segment of the line: the segment is compressed into three copies and the middle one is flipped. This is the actual ODT eddy event, so the visual demonstrates rather than decorates.
- It follows the existing micro-field contract: it builds itself out of the lattice when scrolled into view, and draws a static frame under reduced motion.

**Link out:** "Selected papers ↓", which jumps to spread 06.

### 03 · How we build
The brief asks to cover the architecture briefly, with visuals, without revealing the proprietary design. Show the *shape* of the system only, in generic terms, with no industry, equipment or market named.

**Diagram:** inline SVG in the house style: ink on paper, hairline boxes, JetBrains Mono labels, square corners, no fills. Five stages and one feedback loop:

```
 DATA ──► PHYSICS MODEL ──► LEARNED SURROGATE ──► TRUST CHECK ──► ANSWER
 sensors   reduced-order,      geometry-aware        physics residual   with calibrated
 + sims    differentiable      neural operator       · OOD · conformal  uncertainty
                                                          │
                                         out of trust ────┘
                                                ▼
                                      REFERENCE SOLVER ──► verified data ──► (retrain)
```

The diagram needs a short caption, plus three one-line callouts:
1. **Physics first.** A differentiable physics model sits underneath, and learning corrects it rather than replacing it.
2. **Every prediction carries a certificate.** Each one comes with a physics residual, a calibrated interval and an out-of-distribution flag. Anything outside the trusted region is sent to a full solver.
3. **Every fallback teaches the model.** Solver results become verified training data.

**Built on open source.** The brief's heading "Using open-source" becomes one line plus a row of mono names:
`PYTORCH · OPENFOAM · NVIDIA PHYSICSNEMO · NEURALOPERATOR · PYRO · MAPIE`
- These are public, widely used tools, so naming them reveals nothing proprietary and shows credibility.
- **Keep off the page:**
  - the specific surrogate architectures (Transolver++, AB-UPT);
  - the estimator design;
  - the fallback-router logic;
  - the data-factory validators;
  - anything about the LLM layer.
  - The stack doc lists these under "Proprietary IP boundaries" (§5).

**Explicitly excluded** from the strategy doc: data centers, condensers, CDUs, fouling, pilots, KPIs, timelines and gates. They are market positioning, they break the no-industries rule, and the gates are targets, not results.

### 04 · Areas we are exploring
Keep the existing four. Give each a question and a reason it matters (from `pages-to-add.md`), with the existing homepage micro-field next to it:
- **Neural Operators:** learning mappings between functions, so one model generalizes across geometries and conditions.
- **Physics-Informed Learning:** conservation laws as hard constraints, not just penalty terms.
  - This follows the stack doc's v2 change: "PINN-style losses do not guarantee conservation."
- **Generative Physical Models:** sampling plausible physical states, not only point predictions.
  - Note from the roadmap: generative models have to *earn* their place against simpler baselines.
- **Scientific Computing:** reduced-order models, solvers, verified data generation and HPC.
  - The ODT and Nebo work belongs to this lineage.

### 05 · Principles
A four-item strip in the topic-row style, not cards:
1. **Validate against physics.** Mass and energy must close. "Plausible-looking" doesn't count.
2. **Quantify uncertainty.** A prediction without calibrated error bars is unfinished.
3. **Simple baselines first.** A complex model ships only when it beats the simple ones.
4. **Honest about stage.** Results are published when they exist, not before.

### 06 · Publications
Two lists, kept clearly apart, so the "nothing published yet" honesty rule still holds for DPX Labs itself.

**DPX Labs:**
- *A Physics-Informed AI Architecture for One-Dimensional Turbulence Modeling*, B. Goshayeshi, SC '26 (Supercomputing 2026).
- **⚠ Confirm status first:** SC26 is in mid-November 2026 and today is Nov 9. Is the paper accepted, a poster, or a workshop paper? Use the precise label, e.g. "Accepted · SC26 workshop", and link a preprint if one exists.
- This becomes the first entry in the existing `.pub-list` markup, which replaces the `.empty` message.

**Prior work by our team** (selected, newest first):

| Year | Title | Venue |
|---|---|---|
| 2017 | Progress with Nebo: a portable, performant EDSL for multiphysics applications (Ravichandran, Brown, Goshayeshi, Sutherland) | WOLFHPC 2017 |
| 2016 | An evaluation of the efficacy of various coal combustion models for predicting char burnout (McConnell, Goshayeshi, Sutherland) | Fuel |
| 2016 | An improved model for heat transfer at particle surfaces during heterogeneous char combustion (Goshayeshi, McConnell, Sutherland) | WSSCI |
| 2015 | A comparative study of thermochemistry models for oxy-coal combustion simulation (Goshayeshi, Sutherland) | Combustion and Flame 162(10) |
| 2014 | Prediction of oxy-coal flame stand-off using high-fidelity thermochemical models and the one-dimensional turbulence model (Goshayeshi, Sutherland) | Proc. Combustion Institute 35(3) |
| 2014 | A comparison of various models in predicting ignition delay in single-particle coal combustion (Goshayeshi, Sutherland) | Combustion and Flame 161(7) |
| 2014 | Coal combustion simulation using one-dimensional turbulence model (Goshayeshi) | Ph.D. dissertation, University of Utah |

Notes:
- **Leave out citation counts.** They go stale and make the list read like a résumé. Link the Google Scholar profile instead. The URL is needed: please provide it.
- Link each title to its DOI. The DOIs still need to be collected.
- Fix the typo "McConnelll" → "McConnell".
- **⚠ Wording rule:** the titles say "coal" and "oxy-coal". Paper titles are citations and can't be reworded, so the no-energy rule should allow them. Recommend adding this exception to `PRODUCT.md`: *"Citations of published papers are shown verbatim."*
- Only Babak's papers are listed. If Ellie or others want work included, add it as well, or label the section "Selected work by our founders".

---

## 3. Build notes

**Files**
- New: `research.html`. It copies the header, footer, fonts and scripts from `index.html`.
- Edit: `index.html`. Point the nav at `research.html`, add the "Read the research →" link, and replace the publications block with a one-line teaser.
- Edit: `js/micro-field.js`. Add the `odt` field program.
- Edit: `styles.css`. Add:
  - an `.arch` diagram block, whose SVG uses `currentColor` and the hairline token;
  - a `.pub-list--prior` variant with a year column;
  - a sticky `.page-index` for the in-page sub-nav, which collapses to a horizontal row on mobile.

**Navigation**
- `js/site.js` currently resolves every nav `href` with `querySelector`. Make it skip links that aren't `#hash` links, so a `research.html` link doesn't break the active-link tracking.
- On `research.html`, set `aria-current="page"` on RESEARCH.

**Other**
- **Metadata:** title `Research — DPX Labs`. Add a meta description and Open Graph tags.
- **Accessibility:**
  - The diagram SVG gets `role="img"` and a `<title>`/`<desc>`, plus a text version underneath for screen readers.
  - The ODT canvas stays `aria-hidden`, because its meaning is already in the copy.
- **No build step, no dependencies.** This follows the existing constraint.

---

## 4. Decisions needed before building

1. **"Energy" wording:** keep the rule (Option A) or relax it (Option B)? See spread 01.
2. **Citation exception:** OK to add "paper titles shown verbatim" to `PRODUCT.md`?
3. **SC26 paper:** its exact status and title, and whether a preprint link exists.
4. **Links:** the Google Scholar URL, and whether to collect DOIs for each paper.
5. **Open-source names:** OK to list the tool names publicly (spread 03)?
6. **Other team publications:** should Ellie's or anyone else's be included?

## 5. Suggested order of work

1. Write the page skeleton and copy for spreads 00, 01, 04 and 05. These need no decisions.
2. Add the Publications spread once items 2–4 are answered.
3. Draw the architecture SVG.
4. Build the `odt` micro-field. It's the biggest single piece of work, and the page works without it in the meantime.
5. Update the homepage teaser and nav, check reduced motion and mobile, and publish.

---

## 6. Design review (graphic designer)

Scope: layout and visuals only. Content decisions and the open questions in §4 stay as written. Priorities: **MUST** (it breaks DESIGN.md or the page fails without it), **SHOULD** (a clear improvement), **COULD** (polish).

### 6.1 Rhythm, hierarchy, order

The page has one visual moment and it has to be the ODT figure. Everything else is type, rules and one quiet diagram. The current order puts the two heavy visuals (ODT, architecture) back to back. They compete, and then three text-only spreads in a row (Areas, Principles, Publications) end the page flat.

- **SHOULD: merge 00 and 01 into one opening spread.** Spread 01 is one paragraph plus a mono line. Giving it a full 208px spread makes it look like filler. Same content, set in one spread: display title, lede, then the founders paragraph and fact line as an About-style prose pair.
- **SHOULD: alternate visual and text spreads.** Swap "How we build" and "Areas":

```
 INTRO + LINEAGE   type only, display scale ............ quiet, sets the voice
 01 ODT            wide field figure ................... THE MOMENT (largest, only colour)
 02 AREAS          four text rows ...................... rest
 03 HOW WE BUILD   character diagram, ink only ......... second, smaller visual
 04 PRINCIPLES     compact rows ........................ follows the diagram it explains
 05 PUBLICATIONS   densest typography .................. reference material, scanned not read
    CONTACT        display + mail link ................. same sign-off as the homepage
```

- **MUST: no index number on the intro.** The rail gets the label `RESEARCH` and the existing status line (square + "Research in progress"). Numbering starts at 01 on ODT. "00" reads as a code listing, and the homepage starts at 01.
- **MUST: the intro title is set at display scale** (`.display`, 300, up to 96px) with `spread--vision`'s 1.15× top padding. It is the page's h1. The page then has exactly two display lines, top and bottom, the same as the homepage.
- **MUST: one title per spread.** In ODT, "Why it matters for AI." must not be a second heading. Set it as a bold run-in at the start of the second paragraph (Inter Tight 500, same size as the paragraph), or as an item-scale h3 (27px). Never at title scale.

### 6.2 The ODT figure (`data-field="odt"`)

Problem with the plan's version: one coloured line in a dim field shows *where* the line is, but a triplet map on a 1-cell-high line is a few characters shuffling. Non-experts won't see it. The figure needs a second register: the line **unrolled and magnified** under the field, where the fold is large enough to read.

**Composition: one canvas, two zones, sharing columns** (column i of the strip is column i of the line).

```
 cols 1–3 (labels, HTML)  cols 4–12 (canvas, or 1–12 at ≤900px)
 ───────────────────────  ─────────────────────────────────────────────────────────
 TURBULENT FIELD          .:·;~-..:;~~=+:·..-~;:..·:;-~~:..   <- ink ramp, 0.10–0.38
                          ;:~-..·:;=+~-..:;·.  (  )  .·:;~-   <- eddy ring during an event
 LINE OF SIGHT  ───────►  ━━━━━━━━━━━━━━━━[━━━━━━━━━]━━━━━━━   <- thermal, full density
                                          :         :          <- drop ticks (event only)
 THE LINE, RESOLVED       ___..--~~**##@@@[@#*~-_-~*#@#*~]@@@  <- profile T(x), 7 rows
                          cold  ─────────────────────────► hot
 ─────────────────────────────────────────────────────────────────────────────────
 FIG. 1   A line of sight through a turbulent field, resolved at every scale. Each
          eddy is a triplet map: a segment is compressed into three copies and the
          middle copy is reversed. Illustration, not simulation output.
```

- **State (SHOULD, so the figure is honest and readable).** One `Float32Array T[cols]`, starting as a smooth `tanh` mixing layer: cold on the left, hot on the right, steepest at 45% of the width. Between events: explicit 1D diffusion, plus a weak relaxation (τ ≈ 12s) back to the starting profile so the figure never mixes out to grey.
- **Triplet map.** Segment length L = 3k cells, k chosen so L is 18–40% of `cols` (minimum 12 cells). For an output cell at offset s in [0, L), the source offset is `3s` for s < L/3, `2L − 3s` for the middle third (reversed), and `3s − 2L` for the last third. On the mixing layer this turns one ramp into a visible cold-hot-cold zigzag. That zigzag is the whole point of the figure: an eddy folds the profile and sharpens its gradients.
- **Event choreography** (one event at a time; the next fires at a random interval of 1.8–2.6s):
  1. 0–0.25s: `[` `]` brackets appear in ink at the segment ends, on both the line and the strip. Faint `:` drop ticks join them across the gap rows.
  2. 0.25–0.95s: each strip cell slides from its source position to its mapped position, so the characters visibly travel and the middle third visibly runs backwards. Ease is the house curve cubic-bezier(0.16, 1, 0.3, 1). At the same time, an ink ring (`( )` / `·` glyphs, diameter = L, aspect-corrected with `ar`) turns once in the field above. This is the 3D eddy acting on the line.
  3. 0.95–1.8s: brackets and ticks fade out, and diffusion softens the folds.
- **Profile rendering.** 7 rows. Column i draws its glyph at row `round((1 − T[i]) · 6)`, density bucket 8–9, coloured `thermal(T[i])`. The cell directly under it gets bucket 3, which gives the curve a body. A curve reads as a graph to anyone. A colour-only barcode would not. The field line uses the same `thermal(T[i])`, so line and strip are one object.
- **Colour (MUST).** Thermal is the only ramp in the figure, used only on the line and the strip. The field stays ink at 0.10–0.38, dimmer than the homepage `flow` field, so the eye goes straight to the line. Brackets, ring and ticks are ink.
- **Field motion.** The `flow` program in the ink ramp, advected at about half its speed. The line of sight sits at 55% of the field zone's height.
- **Sizing (SHOULD).** Width = content columns 4–12. Height = field `clamp(180px, 20vw, 280px)` + gap of 3 rows + strip of 7 rows, at the 11px micro-field font. Expose the zone heights as CSS custom properties (`--odt-field-h`, `--odt-strip-h`) and pass them to the canvas through `data-split`, so the HTML labels in cols 1–3 line up with the zones. This is the tallest canvas below the hero, and that is deliberate.
- **≤900px:** the labels move out of the rail and sit above each zone as 11px mono lines in graphite. The canvas spans all 12 columns. **≤640px:** field `clamp(140px, 40vw, 180px)`, strip 7 rows. At 11px that is about 50 columns, so L stays 12–18 cells. Don't shrink the font below 11px.
- **Reduced motion (MUST).** One deterministic frame: a fixed seed, one triplet map already applied at the centre of the profile, brackets and drop ticks drawn, no diffusion. Since the static frame shows the result, the caption still holds.
- **Reveal.** Keep the standard 1.6s lattice rebuild. The first event fires 0.6s after the reveal completes, never during it.
- **Accessibility.** The canvas stays `aria-hidden`. The `<figcaption>` carries the meaning, and the zone labels are real text.
- **COULD.** Tapping or clicking the strip fires a triplet map centred on the pointer. Pointer only, with no keyboard trap. Because the canvas is aria-hidden, this is an enhancement, not content.

### 6.3 Architecture: a character diagram, not a flowchart

The plan's SVG has five hairline boxes, arrows and a feedback loop drawn underneath. That is the generic SaaS flowchart. Hairline boxes also turn the system's divider into a container, which breaks the Ink-Opens/Hairline-Divides rule. The loop also ends in "(retrain)" with nowhere to go.

**MUST: no boxes, and close the loop.** "Verified data" has to return visibly to LEARNED SURROGATE.

**SHOULD: a hybrid.** Stage names and descriptions stay real HTML text set on the grid, so they are crisp, selectable and readable by screen readers. One thin ASCII canvas, a new `conduit` micro-field, is the wiring between them. Information visibly moves, so the diagram is demonstrated rather than drawn.

```
 desktop, content cols 4–12, five stage columns
 DATA            PHYSICS MODEL     LEARNED SURROGATE    TRUST CHECK         ANSWER
 ·-·=·-·-=-·-·-=-·-·=·-·-=-·-·=-·-·=·-·-=·-·-=·-·=·-·-=-·-·=·-·-=-·-·=-·-·=·-·->   conduit (2 rows)
 sensors +       reduced-order,    geometry-aware       physics residual    with calibrated
 simulations     differentiable    neural operator      · OOD · conformal   uncertainty
                                         ^                    :
                                         '-·-=- verified data -·-=-  REFERENCE SOLVER
 ──────────────  (1)  ─────────────────────────────  (2)  ──────────  (3)  ───────────
 Physics first.         Every prediction carries     Every fallback teaches the model.
                        a certificate.
```

- **Conduit motion.** Packets (short runs of `=` or `#`) travel left to right along the spine at a steady rate. At TRUST CHECK, about 1 in 5 packets drops through the `:` branch and returns right to left along the lower conduit, turning `cold` on the way back. Everything else stays ink. Packets pause for about 0.3s under each stage name, as if processed.
- **Type.** Stage names are 11px mono label caps in ink. Descriptions are 15px Inter Tight in soft ink, max 18ch, two lines. With no boxes, the alignment of the columns is the structure.
- **Callouts.** The three callouts sit in a row under the diagram, each opened by a 1px ink rule and aligned under the part it explains: (1) under PHYSICS MODEL, (2) under TRUST CHECK, (3) under the return loop. Small mono markers `(1)` `(2)` `(3)` appear in the diagram at the same places. These are not section numbers, so they don't compete with the rail.
- **≤640px.** The diagram turns vertical. The conduit becomes a 3-column canvas strip down the left edge with packets moving downwards. The stages stack beside it as rows. The fallback is an indented sub-row under TRUST CHECK, labelled `↳ REFERENCE SOLVER → verified data → back to LEARNED SURROGATE`. Each callout follows its stage.
- **Reduced motion.** Packets frozen in place, with one sitting in the return loop so the branch reads as used.
- **Accessibility.** The text is already in the DOM. Wrap it in an `<ol>` in reading order so no separate text version is needed. The conduit canvas is aria-hidden.
- **Open-source row (SHOULD).** One line of body text, then the names as a single 11px mono run in graphite, separated by `·`, with a hairline above. No logos, no "Built with" band. It closes the spread quietly.

### 6.4 Areas and Principles

- **MUST: drop the homepage micro-fields from Areas.** The homepage's wave/flow/sense/lattice fields belong to Physics Models/Simulation/Physical Intelligence/Computing. Pairing them with four different topics breaks "each field matched to its idea", and it surrounds the ODT moment with four more animations. Set Areas as rows instead: name at item scale in cols 4–8, question and reason in body text in cols 9–12, opened by an ink rule and divided by hairlines. This is the `topics` component with a second column.
- **SHOULD: make Principles visibly different from Areas.** Don't use a four-across strip, which reads as a stat band or card row. Use a two-column definition list: principle name in 500-weight Inter Tight at 20px, the sentence in soft-ink body text, hairline between pairs. It should be denser and smaller than Areas, so the two lists of four don't look like the same block twice. Mark the items with mono `—`, not 1–4.

### 6.5 Publications and lineage typography

```
 DPX LABS                                                          (.minor label)
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ink rule
 2026   A Physics-Informed AI Architecture for One-Dimensional      ACCEPTED · SC26
        Turbulence Modeling ↗                                       (exact label, §4.3)
        B. Goshayeshi
 PRIOR WORK BY OUR TEAM
 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 2017   Progress with Nebo: a portable, performant EDSL for …  ↗    WORKSHOP
        Ravichandran, Brown, Goshayeshi, Sutherland — WOLFHPC 2017
 ──────────────────────────────────────────────────────────────────  hairline
 2016   An evaluation of the efficacy of various coal …  ↗          JOURNAL
 ...
 2014   Coal combustion simulation using one-dimensional …  ↗       THESIS
        Goshayeshi — Ph.D. dissertation, University of Utah
                                          ALL WORK ON GOOGLE SCHOLAR ↗
```

- **SHOULD: the DPX entry is larger than the prior work.** Title at item scale (27px). Prior titles at 18px, the existing `.pub-list a` minus 2px, because there are seven of them. The page's own paper should never look like a line in a CV.
- **SHOULD: authors and venue on one line under the title**, in 15px soft ink. The right-hand column carries only a short mono kind tag: JOURNAL / PROCEEDINGS / WORKSHOP / THESIS. Long venue names in an `auto` column make the grid ragged.
- **SHOULD: set each year once.** Leave the year cell empty on following rows of the same year (2014 ×3, 2016 ×2). This is the standard bibliography convention, and it lets the year column scan as a timeline.
- **COULD:** set "Goshayeshi" in Inter Tight 500 in the author lines. It is the only emphasis allowed in the list.
- **MUST: links need an affordance at rest.** Underline-on-hover alone fails on touch. Put the stroked 1.5px arrow (the mail arrow at 0.55em, graphite, ink on hover) inside each title link, at the end of the title.
- **≤640px:** year and kind tag share one mono line above the title. The grid becomes one column.
- **Lineage fact line:** 11px mono graphite, with `·` separators and a hairline above. Write `MULTIPHYSICS DSL`: a lowercase plural "s" breaks the uppercase label voice.

### 6.6 Index, teaser, links

- **MUST: don't put the sticky index in the rail.** Each spread's rail already holds its own index and label, so the two would collide. Make `.page-index` a second row on the sticky header. It appears once the intro title scrolls away, which is when the header gets its hairline today. It reuses the scene-tab component: labels at 11px mono, active label in ink, and the 1px `.bar` under the active item filling with reading progress through that spread. The pattern is already in the system and it does real work here. **≤640px:** a single row that scrolls sideways, with the active item kept in view. No hamburger, no dropdown.
- **SHOULD: one link component.** Plan copy uses typed "→" and "↓". Add a `more-link`: 11px mono caps, ink, 1px underline that wipes away on hover like the mail link, and the stroked SVG arrow rotated for ↓. Use it for "READ THE RESEARCH", "SELECTED PAPERS" and "ALL WORK ON GOOGLE SCHOLAR". The mail link stays the only large call to action.
- **SHOULD: homepage teaser.** Once the SC26 status is confirmed, show that single entry as one `.pub-list` row instead of a sentence, then the `more-link`. A real entry beats a description of one. Until then, keep the `.empty` line.
- **COULD:** the intro can also hold a static contents list (index + label rows, hairlines) in cols 9–12, an editorial table of contents that the sticky row then echoes.

### 6.7 DESIGN.md conflicts and new tokens / components

Conflicts in the plan as written:

- Hairline boxes in the diagram.
- A second heading in ODT.
- Reused micro-fields with mismatched meaning in Areas.
- A four-item strip for Principles.
- The sticky index in the rail.
- Typed arrows instead of stroked SVG.
- Index "00".
- DESIGN.md's "use the empty state" rule. It needs a line saying prior work by the founders may be listed, kept separate from DPX Labs work.

Add to DESIGN.md when building:

| Name | Kind | Spec |
|---|---|---|
| `spread--intro` | layout | Display h1, 1.15× top padding, rail label + status, no index |
| `field-figure` | component | `<figure>` with a wide micro-field, zone labels in cols 1–3, caption below |
| `typography.caption` | token | "FIG. n" in 11px mono, 0.18em, graphite; text in Inter Tight 15px/1.45, soft ink, max 60ch |
| `--odt-field-h`, `--odt-strip-h` | tokens | Zone heights from §6.2, shared by the CSS and the canvas |
| `odt`, `conduit` | field programs | As specified in §6.2 and §6.3. Thermal on `odt` only; ink + `cold` on `conduit` |
| `page-index` | component | Scene-tab variant on the sticky header, with a reading-progress bar |
| `more-link` | component | 11px mono link with a wipe underline and the 1.5px stroked arrow |
| `pub-list--prior` | component | Year (set once per year), title + author/venue line, kind tag |
| `pub-list--lead` | component | One entry with an item-scale title, for DPX Labs' own work |
| `--block` | token | clamp(48px, 7vh, 80px), the gap within a spread. Already used ad hoc in `.directions` and `#research .minor` |

**Disagreement with §5.** "The page works without [the ODT field] in the meantime" is true for the content, but visually it is the page's only moment. Without it the page is six text spreads. Ship the figure with the page. If it slips, leave the figure out entirely rather than ship an empty or placeholder box.
