# Pages to add — dpxlabs.ai

Right now the site is a single page: hero, Vision, Direction, Research, About and Contact. The pages below follow the rules in `PRODUCT.md`: nothing is invented, research is described as in progress, the copy names no industries, and no Models, Platform or Hardware pages until there is something real to show.

Pages are in priority order. Every page should reuse the existing header and footer, the `#F3F0E9` background, Inter Tight / JetBrains Mono and the numbered section labels.

---

## 1. Team — `/team`

**Why:** Visitors evaluating a research lab look at the people first. Today the site has no names on it at all.

**Content:**
- Headline: *The people behind DPX Labs.*
- Founders, each with a portrait, name, role and one line on their background:
  - **Babak Goshayeshi, Ph.D.** — Founder & CEO. HPC, scientific computing, AI/ML pipelines, AI privacy and security.
  - **Ellie Hatami, Ph.D.** — Chief Scientist. Genomics, NGS, edge computing.
- Board: **Hal Stern** (former technology leadership at J&J and Merck), **Ron Najafi, Ph.D.** (serial entrepreneur).
- Optional links to Google Scholar, LinkedIn or GitHub.
- Portraits are already in `pitckdeck/DPXLabs_PitchDeck_live/images/`.

> Confirm roles and permission to list each person before publishing. The bios come from the investor deck.

---

## 2. Careers — `/careers`

**Why:** The deck already names the first hires. A careers page turns the site into a recruiting channel at no extra cost.

**Content:**
- Headline: *Help build physics-native AI.*
- Two or three lines on how the team works: small, research-first, rigorous about validation.
- Open roles. Describe them by discipline only, with no industry named:
  - **ML Research Lead — uncertainty & estimation.** Probabilistic models, calibration, conformal prediction.
  - **Computational Physics Engineer — CFD / heat transfer.** Simulation, verification, building datasets.
  - **Research Engineer — scientific ML.** Neural operators, surrogates, training infrastructure.
- How to apply: email `dpxlabs@diphyx.com` with the role in the subject line.
- If no roles are open, say: *"No open roles right now — we're always glad to hear from strong researchers."*

---

## 3. Research — `/research`

**Why:** The Research section on the homepage lists four areas but has no depth. A dedicated page gives each area a home now, and gives future papers a place to appear.

**Content:**
- One short block per area, saying what the question is and why it matters. No results.
  - **Neural Operators** — learning mappings between function spaces so a model generalizes across geometries and conditions.
  - **Physics-Informed Learning** — building conservation laws and constraints into training.
  - **Generative Physical Models** — sampling plausible physical states, not just point predictions.
  - **Scientific Computing** — data generation, verification and the compute stack beneath it all.
- A **Principles** strip: validate against physics; quantify uncertainty; simple baselines first; be honest about stage.
  - All four come from the roadmap: conformal UQ, "diffusion waits until it beats simpler methods", mass/energy-balance checks.
- **Publications** list: move the existing "Nothing published yet" block here, and keep a short teaser on the homepage.

---

## 4. Notes / Blog — `/notes`

**Why:** This is the cheapest honest way to show progress before any papers exist. It also gives people something to share and helps search ranking.

**Content:**
- A short list of dated technical notes. Possible first posts:
  - *How the ASCII physics hero works.* Character-matrix rendering, curl noise, the diffusion-style transitions. `landing-page.md` is already most of this post.
  - *Why uncertainty matters for physics AI.*
  - *What we mean by "physics-native."*
- Each post uses the same typography, with a mono date label and an estimated reading time.

---

## 5. Contact / Collaborate — `/contact` (or extend the existing section)

**Why:** The page currently ends with only an email address. Collaborators, students and investors each need a different next step.

**Content:**
- Headline: *Let's explore what's possible.* (existing)
- Three short routes, each a pre-filled `mailto:` subject line:
  - **Research collaboration** — academic labs, shared problems, datasets.
  - **Careers** — links to `/careers`.
  - **Investors & press** — general enquiries.
- An optional GitHub or LinkedIn link, once those accounts exist.

---

## 6. Legal — `/privacy` (small)

**Why:** You'll need it as soon as you add analytics, forms or a newsletter. It's cheap to add now.

**Content:** A one-screen privacy notice: what is collected (currently nothing beyond standard hosting logs), the contact email, and the date. Link it from the footer.

---

## Not yet

- **Models / Platform / Demos** — wait until something has actually been released (blocked by `PRODUCT.md`).
- **Partners / Case studies** — the Efficiency Signal data work is in the deck, but it is industrial (condensers). Naming it would break the "no industries" rule and needs the partner's consent. Revisit after a pilot.
- **Press / Media kit** — not useful until there is coverage. A logo download in the footer is enough for now.

## Navigation once added

`RESEARCH · NOTES · TEAM · CAREERS · CONTACT`. Keep the homepage anchors as short teasers that link to the full pages.
