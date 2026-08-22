# OK-Skills

A curated collection of production-ready skills for [Claude Code](https://claude.ai/code) and [Codex](https://openai.com/index/introducing-codex/) by [Osama Khalil](https://osama.me).

OK-Skills gives your AI coding assistant deep expertise in **Three.js game development**, **pixel-perfect website cloning**, **Tony Fadell-style product spec review**, **Google DESIGN.md design-system extraction from any live website**, **on-brand social media post generation**, and **Gauntlet Loop runs that keep building until the work beats a real quality bar**. Each skill is a self-contained knowledge base with guides, reference documentation, and (where applicable) executable scripts that the AI reads and follows to produce expert-level output.

---

## Installation

### Claude Code

```bash
claude plugins install --from github:byosamah/ok-skills
```

After installation, the skills appear in your skill list and can be invoked by name.

### Codex

```bash
codex install github:byosamah/ok-skills
```

### Manual Installation

```bash
git clone https://github.com/byosamah/ok-skills.git ~/.claude/plugins/ok-skills
```

Then register it in your Claude Code plugins configuration.

---

## Skills

### 🎮 threejs-master

**The definitive Three.js game-building skill.** Teaches your AI assistant to build production-grade 3D web experiences and games using modern Three.js (r170+ with ES module import maps).

#### What It Does

When you invoke `/threejs-master`, your AI gains comprehensive knowledge of Three.js scene setup, lighting, geometries, materials, animations, controls, GLTF model loading, game architecture, collision detection, input handling, audio systems, UI overlays, and performance optimization. It doesn't just know the API — it knows the *patterns* that make 3D apps work well.

#### What's Inside

**Main Guide (SKILL.md)** covers:
- Scene graph mental model and philosophy
- Quick-start HTML template with import maps (r170+)
- 7 geometry primitives (Box, Sphere, Cylinder, Torus, Plane, Cone, Icosahedron)
- 5 material types with full property reference (Basic, Standard, Physical, Lambert, Phong)
- 4 light types with shadow configuration (Ambient, Directional, Point, Spot)
- Camera controls setup (OrbitControls)
- Animation patterns (rotation, wave motion, mouse-driven interaction)
- Game architecture overview (7 core systems)
- Common scene patterns (rotating cube, particle field, parallax backgrounds)
- Hex color reference guide
- Anti-patterns to avoid
- Scenario-specific guidance (portfolio, game, data viz, background effect, product viewer)

**11 Deep-Dive Reference Guides:**

| Guide | What It Covers |
|-------|---------------|
| `coordinate-system.md` | Right-handed axes, GLTF default orientation (-Z forward), camera-relative movement, Object3D forward convention, rotation cheat sheet |
| `gltf-loading-guide.md` | 6 loading patterns from basic to advanced: simple load, promise-based, with fallback, batch loading, caching with `SkeletonUtils.clone()`, model normalization |
| `game-loop-and-state.md` | State machine pattern, delta-time with capping, time scaling, screen effects (shake, flash, zoom), parallax layers, object pooling, fixed game camera |
| `animation-guide.md` | Finding and playing animations, crossfading with guards (prevents frame freezing), safe animation selection, facing direction for side-scrollers, squash and stretch |
| `collision-and-physics.md` | AABB collision (Box3), sphere collision, raycasting for ground detection and mouse picking, trigger zones, collision layers/masks, spatial hashing, physics engine integration (Cannon-es, Rapier3D) |
| `input-handling.md` | Keyboard state tracking, input action mapping abstraction, Gamepad API, touch controls (virtual joystick pattern), touch buttons, pointer lock for FPS, preventing default browser behavior |
| `audio-guide.md` | AudioListener setup, non-positional audio (music, UI sounds), positional 3D audio (spatial SFX), SFX pool pattern for rapid fire, music crossfade, mute/volume controls, AudioContext resume |
| `ui-systems.md` | HTML overlay approach, HUD elements (score, timer, lives), health/progress bars, floating damage text with animation, menu screens (start, pause, game over), loading screens with progress, minimap |
| `scene-management.md` | `dispose()` contract for GPU cleanup, level loading/unloading, scene transitions (fade and crossfade), asset manifest and preloader pattern, memory cleanup checklist, leak detection |
| `advanced-rendering.md` | Post-processing (Bloom effect), custom shaders (ShaderMaterial), text sprites, raycasting techniques, environment maps, `InstancedMesh`, `BatchedMesh` (r170+), physics integration, TypeScript setup, debug helpers |
| `performance-guide.md` | Profiling with Stats.js and `renderer.info`, draw call reduction (merge geometry, InstancedMesh, BatchedMesh), LOD (Level of Detail), texture optimization (compression, atlasing), frustum culling, shadow optimization, mobile-specific tricks, object pooling, memory leak detection, performance budget, quick wins checklist |

**Calibration Scripts:**
- `gltf-calibration-helpers.mjs` — Drop-in module that visualizes axes, bounding boxes, forward direction arrows, and label sprites on any loaded GLTF model. Verify your model's reference frame in ~60 seconds.
- `install-gltf-calibration-helpers.py` — Copies the helper module into your project with a single command.

#### Usage

```
/threejs-master
```

**Example prompts after invoking:**
- "Build a 3D space shooter with WASD controls and particle explosions"
- "Create a product viewer with orbit controls and environment lighting"
- "Add collision detection and a health bar to my game"
- "Optimize my Three.js scene — it's running at 20fps on mobile"

#### Requirements

None. This is a pure knowledge skill — no API keys, no external dependencies. It works entirely by teaching your AI assistant Three.js patterns and best practices.

---

### 🌐 cloning

**Clone any website to 100% fidelity.** Not 90%. Not "close enough." 100%. Uses a 13-phase extraction pipeline powered by Gemini 3.1 Pro, with self-healing visual verification loops that push relentlessly until every section, every badge color, every animation, every pixel matches the original.

#### What It Does

When you invoke `/cloning`, your AI orchestrates a complete extraction-to-generation pipeline: it captures the target site from every angle (screenshots, videos, computed styles, assets, animations), feeds everything to Gemini 3.1 Pro for code generation, then enters a visual verification loop comparing the clone against the original until fidelity reaches 100%.

#### How It Works — The 13-Phase Pipeline

| Phase | Name | What Happens |
|-------|------|-------------|
| 0 | Framework Detection | Identifies CSS frameworks (Tailwind, Bootstrap), JS animation libs (GSAP, Framer Motion), icon libraries, and component systems |
| 0.5 | Interactive Exploration | Scrolls the page, hovers elements, clicks interactive components — records everything |
| 1 | Multi-Viewport Screenshots | Captures the full page at 4 viewport widths (mobile, tablet, desktop, wide) at 2x DPI |
| 2 | Asset Downloading | Downloads all images, SVGs, fonts, and media files |
| 3 | Design Token Extraction | Extracts colors, typography, spacing, and effects with confidence scoring (HIGH/MEDIUM/LOW) |
| 4 | Layout Analysis | Maps grid/flexbox structures, z-index layers, and responsive breakpoints |
| 5 | Component Mapping | Identifies ARIA landmarks, UI patterns, section structures |
| 6 | Animation Recording | Records scroll animations, hover state changes, and interaction videos |
| 6.5 | HTML & Measurements | Extracts section-level HTML content and exact pixel measurements via `getComputedStyle()` |
| 7 | Gemini Code Generation | Assembles all extracted data into a structured prompt, sends to Gemini 3.1 Pro with completeness gates |
| 8 | Post-Processing | Deploys downloaded assets, self-hosts fonts, enforces exact measurements, verifies content accuracy |
| 9 | Visual Verification Loop | Compares clone screenshots against originals using SSIM scoring — loops until match |
| 9.5 | Code Quality Gate | Hard checks (TypeScript, no placeholders) and soft checks (animation consistency, accessibility) |

#### What's Inside

**Main Guide (SKILL.md)** covers:
- Complete workflow documentation for all 13 phases
- Two operation modes: Full Clone (give it a URL) and Refine Mode (`--refine` flag for existing clones)
- Implementation quality rules and forbidden patterns
- Behavior rules: maximum effort, never declare done early, visual comparison is the source of truth

**5 Reference Files:**

| Reference | What It Covers |
|-----------|---------------|
| `extraction-phases.md` | Detailed procedures for Phases 0–6.5 with error handling and parameter tuning |
| `verification-phases.md` | Generation (Phase 7), post-processing (Phase 8), verification loop (Phase 9), and code quality gate (Phase 9.5) |
| `implementation-quality.md` | Forbidden patterns (anti-slop rules), animation tool selection matrix, performance guardrails, accessibility minimums, TypeScript gotchas, shared patterns |
| `gsap-patterns.md` | 5 production-ready GSAP + ScrollTrigger patterns for React/Next.js: word-by-word scroll reveal, auto-cycling tabs, sticky scroll timeline, entrance animations with stagger, horizontal scroll sections |
| `gemini-prompt-template-v4.md` | Complete v6.0 prompt structure for 98-100% fidelity, optimal Gemini parameters, multimodal content ordering, troubleshooting guide |

**19 Extraction & Generation Scripts:**

*JavaScript (11 scripts) — run in-browser via Playwright:*
- `detect_frameworks.js` — Identifies CSS/JS/icon/component libraries
- `extract_design_tokens_v4.js` — Confidence-scored color, typography, and effect tokens
- `analyze_layout.js` — Grid, flexbox, z-index, and responsive breakpoint extraction
- `analyze_components.js` — ARIA landmarks and component pattern detection
- `extract_svgs.js` — Inline SVG and icon sprite extraction
- `extract_html_content.js` — Section-level HTML with headings, links, images, buttons, cards
- `extract_computed_measurements.js` — Exact pixel measurements via `getComputedStyle()` and `getBoundingClientRect()`
- `extract_font_assets.js` — `@font-face` rules, variable font detection, text rendering properties
- `extract_js_animations.js` — JS bundle animation forensics (fallback when runtime recording fails)
- `map_animations_v4.js` — Legacy animation detection (Phase 6 fallback)
- `capture_hover_matrix.js` — Hover state capture across ~200 CSS selectors

*Python (8 scripts) — orchestration, recording, API:*
- `clone_orchestrator.py` — Master orchestrator that runs all extraction phases automatically
- `clone_website_v4.py` — Reference implementation of the full extraction workflow
- `capture_multi_viewport.py` — Multi-viewport screenshot capture at 2x DPI
- `record_scroll.py` — Video recording of scroll-triggered animations
- `record_interactions.py` — Video recording of interactive element states
- `stitch_screenshots.py` — Combines screenshots into composite images
- `gemini_api_v4.py` — Gemini 3.1 Pro API integration with optimal parameters
- `verify_clone.py` — SSIM-based verification scoring of clone vs original

#### Usage

```
/cloning
```

**Full clone:**
```
Clone https://example.com to 100% fidelity
```

**Refine an existing clone:**
```
/cloning --refine
The hero section animation timing is off — fix it to match the original
```

**Example prompts:**
- "Clone https://linear.app landing page pixel-for-pixel"
- "Clone this site but swap the color palette to my brand colors"
- "The footer layout doesn't match — run the verification loop again"

#### Requirements

| Requirement | Details |
|------------|---------|
| `GEMINI_API_KEY` | Environment variable — get one at [ai.google.dev](https://ai.google.dev) |
| Playwright | For browser automation during extraction (`npx playwright install`) |
| Python 3.12+ | For orchestration and recording scripts |
| Node.js | For in-browser extraction scripts |
| ImageMagick | *Optional* — for SSIM visual comparison scoring |

#### Known Limitations

- WebGL content (Canvas-rendered graphics can't be extracted)
- Custom cursors and pointer effects
- Sound and video playback behavior
- Server-side dynamic behavior (API-driven content)
- Authentication-gated pages
- Highly dynamic real-time data (stock tickers, live feeds)

---

### 🛠️ tony-fadell

**Spec/PRD reviewer in Tony Fadell's voice.** Reads a markdown spec, scores it 0 to 10 on each of the Core 5 pillars from his book *Build* (Story-first, Painkiller-vs-Vitamin, V1 Painted-Door, Heartbeats, Make-the-Invisible-Visible), and writes a sidecar review file with a composite score, per-pillar diagnoses citing specific spec lines, and Fadell-flavored rewrites of weak sections you can copy-paste.

#### What It Does

When you invoke `/tony-fadell` and pass a path to a markdown spec, your AI assistant becomes Tony Fadell for the duration of the review. It scores the spec on five pillars, anchors every observation to specific lines in the spec (no vague hand-waving), and produces a sidecar `.tony-fadell-review.md` file next to your spec with concrete rewrites you can drop straight into the next revision.

#### What's Inside

**Main Guide (SKILL.md)** covers:
- The Core 5 pillars from *Build* with operational rubrics for each
- Voice rules (first person, present tense, blunt but helpful)
- Scoring procedure with composite score weighting
- Structured review-writing workflow with required sections
- When to use this skill (and when not to: code review, UI review, copy review have other tools)

**2 Reference Files:**

| Reference | What It Covers |
|-----------|---------------|
| `pillar-rubrics.md` | Detailed 0 to 10 scoring rubrics for each Core 5 pillar with calibration anchors and disqualifying patterns |
| `source-canon.md` | Citation index pointing every Fadell quote and framing back to specific chapters of *Build*, podcast interviews, and posts. Keeps the persona grounded in real source material. |

**1 Asset:**

- `sidecar-template.md`: The exact markdown template the skill writes to disk. Composite score header, per-pillar sections, copy-pasteable rewrites of weak sections.

#### Usage

```
/tony-fadell path/to/SPEC.md
```

**Example prompts after invoking:**
- "Fadell-review this PRD before I take it to the team"
- "Is this a painkiller or a vitamin?"
- "Score this against the Build pillars and rewrite the weak sections"
- "Sharpen this spec before I run /superpowers:writing-plans on it"

#### Requirements

None. Pure knowledge skill, no API keys, no external dependencies. Operates entirely on a local markdown file you point it at.

---

### 🎨 designmd-ripper

**Generate a 100% spec-compliant Google DESIGN.md from any public website.** Deeply extracts the live design system via Playwright (colors, typography, spacing, components, layout, fonts, shadows), proposes subpages for review, then synthesizes a DESIGN.md conforming to the canonical Google design.md schema with zero lint errors. Output is portable to Stitch, Tailwind, and Figma.

#### What It Does

When you invoke `/designmd-ripper` with a URL, your AI extracts the site's design system from the live DOM (not guesses from screenshots), proposes which subpages to crawl for full coverage, then synthesizes a single markdown file with YAML frontmatter (design tokens) plus body-section rationale prose. The output must lint clean against the canonical linter: 0 errors, 0 warnings, 1 info (the unavoidable `token-summary`).

#### What's Inside

**Main Guide (SKILL.md)** covers:
- Reference-file reading order (spec, synthesis guide, linting rules, canonical example, CLI)
- The extraction pipeline: Playwright crawl, computed-style harvesting, asset capture
- Subpage proposal protocol (always confirm scope with the user before crawling)
- Synthesis workflow from raw signals to spec-correct fields
- Lint loop: run, parse findings, fix, repeat until clean
- When to use vs. `cloning` (for code) and `design-review` (for critique)

**5 Reference Files:**

| Reference | What It Covers |
|-----------|---------------|
| `spec.md` | The full canonical Google DESIGN.md specification. Frontmatter schema, section order, every accepted token shape. Read in full before writing any DESIGN.md. |
| `synthesis-guide.md` | Mapping layer from raw extraction signals to spec-correct fields, plus a 12-item strictness checklist. Read every time before composing the file. |
| `linting-rules.md` | All 8 lint rules with trigger conditions and fix patterns. Consult whenever a lint run reports findings. |
| `canonical-example.md` | The official "Atmospheric Glass" example. Read once to see what a complete, real DESIGN.md looks like: copy its structure and density, not its tokens. |
| `cli.md` | `@google/design.md` CLI reference for `init`, `lint`, `apply`, and stylesheet emission. |

**3 Scripts:**

- `extract.py`: Playwright-driven extraction pipeline. Captures computed styles, typography, spacing scales, color usage, shadows, radii, and motion signals from a URL.
- `render_brief.py`: Synthesizes the raw extraction signals into a spec-correct DESIGN.md draft, ready for the lint loop.
- `lint.sh`: Wraps the canonical linter and reports findings against the strictness checklist.

**1 Asset:**

- `template.md`: Starter skeleton matching the canonical frontmatter and section order.

#### Usage

```
/designmd-ripper https://example.com
```

**Example prompts after invoking:**
- "Extract the design system for stripe.com into a DESIGN.md"
- "Capture linear.app's visual identity as a spec file I can hand to Stitch"
- "Make a design.md from notion.so, include /pricing and /product as subpages"
- "What is this site's design system? Output as Google DESIGN.md."

#### Requirements

| Requirement | Details |
|------------|---------|
| Playwright | For DOM extraction (`npx playwright install`) |
| Python 3.12+ | For `extract.py` and `render_brief.py` |
| `@google/design.md` CLI | *Optional*. For local linting (skill can run lint via npx) |

---

### 🖼️ branded-design

**Generate on-brand social media posts with pixel-perfect brand fidelity.** Most AI image generators redraw your logo, invent your fonts, and approximate your brand elements. `branded-design` refuses to. It uses a two-step compositing pipeline: Nano Banana generates the base visual (a photo, illustration, or scene with no brand assets baked in), then a Pillow pipeline layers your *real* assets on top: actual logo PNGs, actual font TTF rendering, actual decorative element files. The output matches your brand because it literally uses your brand files.

#### What It Does

When you invoke `/branded-design`, your AI assistant turns the skill folder itself into a brand template. On first run it interviews you about your brand (name, colors, fonts, archetype, cultural rules, logo placement), bootstraps a `brand-kit/` directory, and calibrates layout proportions from your existing example posts. On every run after that, it generates a base visual, composites your real assets with calibrated positioning, then logs your feedback so the next post lands closer to your taste.

**The skill folder IS the brand.** Copy the skill, fill in your `brand-kit/`, optionally rename it to `{your-brand}-brain`, and you have a custom post generator scoped to one brand.

#### Brand Archetypes

Not every brand composites the same way. During setup the skill picks the archetype that fits, and the pipeline adapts:

| Archetype | Base Visual | Compositing |
|-----------|------------|-------------|
| `photo-person` | AI photo of a person on a solid background | Full z-ordering: elements bleed behind the person (background removed via rembg), logo and text on top |
| `photo-product` | AI product shot | Product on background, decorative elements plus logo and text layered on top (no background removal) |
| `illustration` | AI-generated illustration | Logo and text overlaid on the full-canvas illustration |
| `text-card` | None (no AI call) | Pillow renders everything: background, text blocks, logo, elements |
| `editorial` | Full-bleed AI scene | Contrast treatment (overlay, gradient, or bottom bar) plus light text and logo |
| `minimal` | Clean subject on a neutral background | Small subject, subtle logo, text, generous whitespace |

#### What's Inside

**Main Guide (SKILL.md)** covers:
- The two-step compositing philosophy (why AI-baked assets are not good enough for production brands)
- Six brand archetypes and how each one changes the pipeline
- First-run detection and an 8-step Setup Mode (dependency install, brand interview, config creation, font setup, asset placement, calibration from examples, validation, optional rename)
- The generation workflow (collect input, read config, generate base, composite real assets, iterate)
- A per-archetype layer stack plus calibration constants
- Latin and Arabic/RTL text rendering (with reshaping and bidi reordering)
- Deep Review Mode for refining calibration and learnings over time

**3 Reference Files:**

| Reference | What It Covers |
|-----------|---------------|
| `brand-yaml-schema.md` | Complete specification for `brand-kit/brand.yaml`: the required and optional fields that drive every generation |
| `prompt-patterns.md` | Optimized base-visual prompt templates per archetype, with `{variable}` placeholders filled from brand config and user input |
| `platform-formats.md` | Platform specs (aspect ratios, resolutions, considerations) for Instagram, LinkedIn, stories, and more |

**5 Scripts:**

- `setup_brand.py`: Creates `brand.yaml` and the `brand-kit/` directory structure from interview answers. Optionally renames the skill to `{brand-name}-brain`.
- `validate_brand_kit.py`: Verifies a `brand-kit/` is complete and ready (config fields, logo files, font TTFs, example posts, archetype-specific assets).
- `generate_post.py`: The core generator. Reads `brand.yaml`, selects reference assets, builds the prompt, and calls the Nano Banana backend to produce the base visual.
- `composite_post.py`: The compositing pipeline. Layers the real logo, text (rendered from the real font TTF), and decorative elements onto the base image with calibrated proportions.
- `log_and_learn.py`: Logs generation metadata and extracts reusable rules from iteration feedback so future posts improve.

**1 Asset:**

- `assets/brand-kit-template/`: A scaffold showing the expected `brand-kit/` layout (logo, fonts, examples, photography, characters, icons, moodboard, guidelines) plus a starter `brand.yaml`.

#### Usage

```
/branded-design
```

**Example prompts after invoking:**
- "Set up branded-design for my brand" (runs the first-run interview and calibration)
- "Make an Instagram post announcing our new feature"
- "Create a LinkedIn cover about our Q3 results"
- "Design a quote card in our brand style for a story"

#### Requirements

| Requirement | Details |
|------------|---------|
| Python 3.12+ | For all five scripts |
| Pillow | Required. The compositing engine (`pip3 install Pillow`) |
| Nano Banana backend | Required for every archetype except `text-card`. A separate image-generation script (where your `GEMINI_API_KEY` lives), resolved via the `NANO_BANANA_SCRIPT` environment variable. `text-card` runs with no backend at all. |
| `arabic-reshaper` + `python-bidi` | *Optional*. For Arabic or other RTL text rendering |
| `rembg` | *Optional*. For `photo-person` background removal (elements-behind-subject z-ordering) |
| Your brand assets | Real logo PNGs, font TTFs, and (where used) decorative element PNGs placed in `brand-kit/` |

---

### ⚔️ gauntlet-loop

**Build to a bar you cannot talk your way around.** An implementation of [Matt Shumer's Gauntlet Loop](https://somethingbig.ai/gauntlet-loop), the prompting method behind [Claude of Duty](https://github.com/mshumer/Claude-of-Duty): one prompt, many hours, roughly 55,000 lines, every texture and sound generated from scratch, no human steering. A model stops when nothing tells it that it isn't done, so "make it amazing" reliably produces one decent result and a bow. Hand it real Call of Duty screenshots plus an independent critic whose only job is to say "the reference won, here is the gap", and it can no longer declare victory.

#### What It Does

When you invoke `/gauntlet-loop` and describe something you want built, your AI runs the method end to end. It asks four questions, none of them about implementation. It finds what "great" actually looks like for your domain and saves it as real files on disk. It writes a short Shumer-style prompt. Then it hands you one command that launches a **clean-room** session where a lead agent splits the goal into the smallest independently judgeable pieces, pairs each with a builder and a separate harsh critic, and loops on blind A/B against the bar until you stop it.

#### The Clean Room

This part is not in the original article. It follows from the article's first rule, "give it the goal, not your implementation": every installed skill and MCP server in scope is a route already chosen for the agent, and persona or style rules in a global `CLAUDE.md` leak into every critic that gets spawned. A critic told to be entertaining is not a harsh critic.

The bundled launcher starts the run with **zero MCP servers, zero skills, and no global `CLAUDE.md`**, while leaving subagents, workflows, shell, file access, and web access fully intact. None of this can be stripped from a session already running, which is why the skill is two-phase: interview and capture the bar in your normal session, then hand off.

#### What's Inside

**Main Guide (SKILL.md)** covers:
- Why the method works, and the one instinct that kills it (writing a spec)
- The route/method split: architecture and decomposition belong to the model, the bar and the builder-critic separation belong to you
- Six phases: frame the goal, interview, materialize the bar, write the prompt, hand off, watch without interrupting

**3 Reference Files:**

| Reference | What It Covers |
|-----------|---------------|
| `bar-catalog.md` | How to source and capture a real, inspectable bar in seven domains (visual and 3D, web and product UI, writing, backend and systems, marketing, research, audio and video), what to do when the user has no bar, and the rule that a reference is a yardstick and never source material |
| `prompt-patterns.md` | Shumer's original prompt verbatim, the fill-in template, three worked adaptations (landing page, backend service, long-form essay), a table of the exact phrases that carry weight and what each one prevents, and the article's own meta-prompt for provenance |
| `clean-room.md` | Every launch flag and what it does, the command to re-verify isolation after a Claude Code update, what disabling skills costs you, why `--bare` is a trap, permission-mode tradeoffs, and troubleshooting for runs that stop early or produce passing critics |

**1 Script:**

- `launch-gauntlet.sh`: The clean-room launcher. Refuses to start without a prompt file, warns when the reference folder is empty (a bar the critic cannot open is not a bar), and gates `bypassPermissions` behind an explicit confirmation.

#### Usage

```
/gauntlet-loop
```

**Example prompts:**
- "Build a browser-playable kart racer as good as Mario Kart 8"
- "I want a landing page that holds up next to Linear and Stripe"
- "Write the launch essay, and it has to read as clearly as Paul Graham"
- "Build this API and don't stop until p99 is under 40ms under chaos testing"

#### Requirements

| Requirement | Details |
|------------|---------|
| Claude Code | Required for the launcher, which uses Claude Code CLI flags. The method itself works in Codex, but you would launch it by hand |
| Time and compute | Runs are measured in hours, not minutes, at `xhigh` effort with a fleet of subagents. This is the expensive skill in the collection, deliberately |
| A real reference | Screenshots, a test suite, a benchmark target, reference prose. The skill helps you find one, but a bar written in prose is not a bar |

Dynamic workflows must be enabled once in `/config`, since `ultracode` depends on them.

---

## Requirements Overview

| Requirement | threejs-master | cloning | tony-fadell | designmd-ripper | branded-design | gauntlet-loop |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Claude Code or Codex | ✅ | ✅ | ✅ | ✅ | ✅ | Claude Code |
| API Keys | (none) | `GEMINI_API_KEY` | (none) | (none) | via Nano Banana backend | (none) |
| Python 3.12+ | (none) | ✅ | (none) | ✅ | ✅ | (none) |
| Node.js | (none) | ✅ | (none) | Optional | (none) | (none) |
| Playwright | (none) | ✅ | (none) | ✅ | (none) | Optional (bar capture) |
| ImageMagick | (none) | Optional | (none) | (none) | (none) | (none) |
| Pillow | (none) | (none) | (none) | (none) | ✅ | (none) |
| Nano Banana backend | (none) | (none) | (none) | (none) | ✅ (non `text-card`) | (none) |

---

## Adding to Your Project

**Global install** (available in all projects):
```bash
claude plugins install --from github:byosamah/ok-skills
```

**Project-scoped** (available only in a specific project):
```bash
claude plugins install --from github:byosamah/ok-skills --scope project
```

After installation, skills appear in your skill list. Invoke them by name (`/threejs-master`, `/cloning`, `/tony-fadell`, `/designmd-ripper`, `/branded-design`, `/gauntlet-loop`) or let Claude auto-detect when they're relevant to your task.

---

## Contributing

Want to add a skill or improve an existing one? Contributions are welcome.

### Adding a New Skill

1. Create a directory under `skills/` with your skill name:
   ```
   skills/your-skill-name/
   ├── SKILL.md           # Required — main skill file
   ├── references/        # Optional — supporting documentation
   └── scripts/           # Optional — executable scripts
   ```

2. Write your `SKILL.md` with YAML frontmatter:
   ```markdown
   ---
   name: your-skill-name
   description: One-line description of what the skill does
   ---

   # Your Skill Name

   Skill content here...
   ```

3. Optional frontmatter fields:
   - `model: opus` — require a specific model
   - `context: fork` — run in a forked context
   - `effort: max` — set effort level

4. Open a PR with your skill. Include a description of what it does and example usage.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

**Osama Khalil** — Product designer and builder.

- Website: [osama.me](https://osama.me)
- GitHub: [@byosamah](https://github.com/byosamah)
- Skills: [skills.osama.me](https://skills.osama.me)
