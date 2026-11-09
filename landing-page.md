# DPX Labs — Dynamic ASCII Physics Matrix

The landing page for **DPX Labs (dpxlabs.ai)**. Its hero is a live animation of physics simulations drawn entirely in ASCII characters, inspired by the ASCII character illustrations of https://www.inceptionlabs.ai/.

The animation is the central feature of an ultra-minimal page.

## Critical visual requirement

A **real-time, continuously updating matrix of ASCII characters** that depicts recognizable, dynamic physics simulations.

The visual must NOT be:
- A static ASCII drawing with moving decorations.
- An image or video converted into ASCII.
- A conventional CFD visualization with ASCII characters overlaid.
- A random character animation.
- A particle animation with occasional letters.
- A fixed engineering diagram with only its interior animated.

**Every simulation is built and animated within the character matrix itself.**

Shapes, boundaries, flow fields, temperature gradients and turbulent structures all emerge from characters. Each cell changes its character and color from the evolving simulation fields.

## The nine simulations

Scenes run in this order. Each label maps to one scene class.

### 1. FLUIDS — pipe flow past a cylinder (`PipeFlowScene`)

A horizontal pipe with a cylinder obstacle; fluid moves left to right.

- Velocity = blunt turbulent pipe profile + potential flow around the cylinder + a Kármán vortex street of Lamb–Oseen vortices + curl-noise turbulence in the wake.
- A smoke-rake dye is advected through that field. Density follows dye and speed.
- Background flow uses the light `mist` blue ramp.
- Hovering stirs the flow locally.

### 2. REACTIONS — turbulent flame (`FlameScene`)

A buoyant turbulent diffusion flame above an ASCII burner.

- Temperature and smoke are advected by a buoyancy-driven velocity field with entrainment, a puffing instability and curl-noise turbulence.
- Spatially varying cooling tears the flame tip into rising pockets of hot gas.
- Restrained amber, orange and red (`heat` ramp).
- Hovering pushes the flame and plume around.

### 3. HEAT TRANSFER — shell-and-tube heat exchanger (`HeatExchangerScene`)

A single-pass shell-and-tube exchanger.

- Cold tube-side fluid flows left to right and warms up.
- Hot shell-side fluid enters top-left, snakes around segmental baffles and cools as it goes.
- Each stream carries a texture along its own path coordinate, so structures move with the flow. Color comes from local temperature on the blue-to-amber `thermal` ramp.

### 4. PROPULSION — rocket engine (`RocketEngineScene`)

A combustion chamber, converging–diverging nozzle and exhaust plume.

- Mach number along the nozzle comes from the isentropic area–Mach relation (γ = 1.2). Gas parcels follow a time-of-flight coordinate, so streaks speed up through the throat.
- The plume shows oblique shocks, Mach diamonds and a turbulent mixing layer that thickens downstream.

### 5. ENGINE — four-stroke car engine (`CarEngineScene`)

An inline engine in cross-section: four cylinders on wide screens, two on narrow ones.

- Exact slider–crank kinematics drive pistons and connecting rods from a rotating crankshaft (firing order 1-3-4-2).
- Cam-timed valves open the ports. Each cylinder's charge goes intake → compression → spark and flame-front propagation → power → exhaust.
- Hovering revs the engine.

### 6. POWER — gas turbine generator set (`GasTurbineScene`)

A complete power-plant gas turbine in side cross-section.

- Bellmouth intake → multi-stage axial compressor (8 stages, spinning blade rows, converging annulus, air heats as it is compressed) → two combustor cans with flames and dilution jets → 3 turbine stages (hot gas expands and cools) → exhaust diffuser.
- One shaft drives a generator. Its output travels as pulses along a cable to a transmission tower.
- Flow speeds up where the annulus narrows (time-of-flight coordinate built from annulus area).
- Hovering adds load.

### 7. WIND — wind farm wake (`WindTurbineScene`)

Two turbines in an atmospheric boundary layer.

- Sheared inflow and a momentum-theory wake deficit that widens downstream.
- Tip vortices shed each time a blade passes the top or bottom of the rotor.
- The downstream turbine sits in the first one's wake and turns visibly slower.
- Smoke-like dye is advected through the field. Hovering adds a gust.

### 8. MULTIPHASE — centrifugal pump cavitation (`PumpCavitationScene`)

A centrifugal pump in front view.

- A backward-curved, six-blade impeller spins inside a spiral volute that discharges into a pipe.
- Liquid is carried outward through the blade passages and around the volute.
- When suction pressure drops (on a slow cycle, or on hover), vapour bubbles form on the blades' suction side near the eye, grow, ride outward and collapse in sharp flashes where pressure recovers.

### 9. NUCLEAR — PWR primary loop (`NuclearLoopScene`)

A pressurised-water reactor primary loop.

- Coolant flows down the vessel downcomer, up through the fuel rods (with a Cherenkov-blue glow that follows reactor power), out the hot leg into the steam generator's U-tubes, and back through the cold leg and reactor coolant pump.
- On the secondary side, water boils around the tubes and steam leaves for the turbine.
- Control rods move with power demand. Hovering withdraws them and the whole loop runs hotter.

## The rendering engine

A custom Canvas 2D renderer (`AsciiRenderer`) on a regular monospaced grid (JetBrains Mono, line height 1.14, device pixel ratio capped at 2).

- Every (glyph, color) pair is rasterised once into an atlas canvas and then blitted, so a full frame of several thousand cells takes a few milliseconds.
- Cell (i, j) has physical centre `x = i + 0.5`, `y = (j + 0.5) · ar`, where `ar = cellHeight / cellWidth`, so geometry stays round on screen.

For each cell, a scene works out:

1. Whether the cell is equipment geometry or fluid/gas space.
2. The local field value (dye, speed, temperature, pressure, power…).
3. A glyph from that intensity.
4. A color from that field.
5. Its new state on the next frame.

### Glyphs

- **Equipment geometry** keeps literal line-art glyphs (`/ \ | _ ( ) [ ] < > - = o O …`) in ink tones, and can follow direction (`dirGlyph`).
- **Field cells** (fluid, flame, gas) are written as virtual density levels 1–10. Just before drawing, `resolveGlyphs` swaps each one for a random printable ASCII character of matching visual weight, from buckets running faint to dense:

  `` .,'` `` → `:;-_~^"` → `!il|/\()rcv?` → `+=<>tjf71{}[]` → `xzsounaeykLTYJ` → `*CZVXFPS2345` → `hdbpqwUOGEKA690` → `#$&HDRB8` → `NWMQ%` → `@`

- Each field cell re-rolls its character about once a second, at its own staggered moment. The matrix shimmers without flicker, and structure always comes from density, not from the random choice.

### Fields and motion

- Shared tools in `core.js`: seeded trilinear value noise, 3-octave fBm, and divergence-free 2D curl noise.
- `PhysicsScene` gives semi-Lagrangian advection with bilinear sampling, a Gaussian pointer-influence kernel, and a decaying displacement field that bends analytic flows around the cursor.
- Scenes mix analytic, physically informed velocity fields (potential flow, vortex models, isentropic nozzle flow, momentum-theory wakes, slider–crank kinematics) with lightweight advection. There is no real CFD solver. These are physically inspired visuals, not validated numerical simulations.
- Scenes that need a developed state at start (FLUIDS, REACTIONS, WIND) pre-run warm-up steps.

### Palette

Tuned for the warm off-white background `#F3F0E9`:

- `ink` — warm greys to near-black, for geometry and the transition lattice.
- `cold` — light-to-deep cyan blues, for cold fluid.
- `mist` — very light blues, for background flow (pipe, wind).
- `heat` — deep red → orange → amber, for flames and hot gas.
- `thermal` — blue → neutral → amber → red, for temperature gradients.

## Dynamic behavior

- Targets 60 FPS on desktop. **Adaptive quality:** if the average frame cost goes over ~13 ms, the glyph size grows in 1.5 px steps (up to +4 px), so there are fewer cells.
- Base font size depends on hero width: 7.5 px (< 480), 9 px (< 760), 10.5 px (< 1100), 12 px otherwise.
- The loop pauses when the hero is off-screen or the tab is hidden. Frame `dt` is capped at 1/20 s.
- The grid rebuilds (debounced, 120 ms) when the hero is resized.

## Scene transitions

Automatic cycle:

**PROPULSION → REACTIONS → HEAT TRANSFER → FLUIDS → ENGINE → POWER → WIND → MULTIPHASE → NUCLEAR → (repeat)**

- Each scene runs for **4 seconds**. A transition takes **1.9 seconds**.
- `SceneTransition` gives each cell a release time and a rebuild time from a smooth fBm noise field mixed with a left-to-right sweep, so the change moves as a coherent front.
- Cells of the old scene flash `+` as they release and dissolve into the underlying matrix: a quiet, slowly breathing lattice of `.` `·` `:` in ink tones. The next scene rebuilds out of that same lattice, with a `+` flash as each cell appears. Each transition uses a new random seed.
- Both scenes keep simulating during the overlap. No hard cuts.

## Interaction

- Nine understated mono labels below the matrix: **PROPULSION / REACTIONS / HEAT TRANSFER / FLUIDS / ENGINE / POWER / WIND / MULTIPHASE / NUCLEAR**. They wrap on narrow screens.
- Clicking a label switches to that scene (with a transition). The active label has `aria-pressed="true"` and a thin underline that fills as a progress bar over the scene's 4 seconds.
- `?scene=<id or label>` in the URL picks the starting scene. Scene ids stay stable (`flow`, `combustion`, `thermal`, `propulsion`, `engine`, `power`, `wind`, `pump`, `nuclear`); labels also work, with hyphens for spaces (e.g. `?scene=heat-transfer`, `?scene=multiphase`).
- Moving the cursor over the matrix (crosshair cursor) adds a localized disturbance. Its strength comes from pointer speed and fades over time. Each scene reacts in a physically sensible way: stirring flow, pushing the flame, revving the engine, adding load, adding a gust, triggering cavitation, withdrawing control rods.
- The canvas `aria-label` updates to describe the current scene.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, pointer disturbance is off, scenes don't auto-advance, simulations run at 30% speed and about 12 FPS, and clicking a label cuts straight to the scene with no transition.

## Landing page layout

- Warm off-white background `#F3F0E9`, ink `#1E1C19`, muted text `#8A8378`.
- Type: **Inter Tight** (headline) and **JetBrains Mono** (brand, subtitle, labels, footer), from Google Fonts.
- Header: Diphyx mark (`assets/diphyx-mark.svg`, also the favicon) + **DPX LABS** in spaced mono caps, linking home.
- Headline: **Intelligence for the Physical World.**
- The ASCII matrix fills about 60% of the viewport height (`clamp(320px, 60svh, 780px)`), inside a hero up to 1360 px wide.
- Footer: **© 2026 DPX Labs**
- Nothing else: no feature sections, product marketing or industry descriptions.

## Technical organization

Plain JavaScript with no build step and no dependencies. Scripts load in order from `index.html` and attach to a global `DPX` namespace. Boot waits for JetBrains Mono to load (1.2 s timeout) before starting the hero.

| File | Role |
| --- | --- |
| `js/core.js` | Math helpers, noise / fBm / curl noise, glyph table and random-ASCII buckets, color ramps |
| `js/ascii-renderer.js` | `AsciiRenderer` — atlas-based monospaced grid renderer |
| `js/physics-scene.js` | `PhysicsScene` — base class: grid, geometry layers, advection, pointer disturbance |
| `js/scenes/pipe-flow-scene.js` | `PipeFlowScene` — FLUIDS |
| `js/scenes/flame-scene.js` | `FlameScene` — REACTIONS |
| `js/scenes/heat-exchanger-scene.js` | `HeatExchangerScene` — HEAT TRANSFER |
| `js/scenes/rocket-engine-scene.js` | `RocketEngineScene` — PROPULSION |
| `js/scenes/car-engine-scene.js` | `CarEngineScene` — ENGINE |
| `js/scenes/gas-turbine-scene.js` | `GasTurbineScene` — POWER |
| `js/scenes/wind-turbine-scene.js` | `WindTurbineScene` — WIND |
| `js/scenes/pump-cavitation-scene.js` | `PumpCavitationScene` — MULTIPHASE |
| `js/scenes/nuclear-loop-scene.js` | `NuclearLoopScene` — NUCLEAR |
| `js/scene-transition.js` | `SceneTransition` — matrix dissolve and rebuild |
| `js/physics-hero.js` | `PhysicsHero` — main loop, scene cycling, labels, pointer, adaptive quality |
| `styles.css` | Page layout and typography |

### Scene interface

Each scene extends `PhysicsScene`, calling `super(id, LABEL, description)` and accepting an `opts` object for its parameters (e.g. `cylinderAt`, `strouhal`, `puffHz`, `baffles`, `expansion`, `rps`, `compressorStages`, `turbineStages`, `tsr`, `blades`). It implements:

- `setup()` — build geometry (`geoG` / `geoC`) and fields for the current grid size.
- `update(dt, pointer)` — evolve the fields.
- `compose()` — write one glyph id and one palette id per cell into `code` / `color`.
- optional `warmupSteps` — pre-run steps so the scene starts already developed.

To add a scene: create the class under `js/scenes/`, add a `<script>` tag before `scene-transition.js`, add it to the `scenes` array in `PhysicsHero`, and add a `data-scene` button to the nav.

## Quality requirement

The ASCII animation matters more than anything else on the page. Each scene must stay recognizable and convincingly animated. It should feel like watching a sophisticated scientific simulation through a constantly changing matrix of text.

**The characters ARE the simulation. They are not decorations on top of it.**
