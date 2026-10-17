# Next Huge Quake: video renderer

This package renders vertical earthquake news videos (1080×1920, 30 fps, H.264, about 35 s) with [Remotion](https://www.remotion.dev/) and [MapLibre GL JS](https://maplibre.org/).

The only input is a **VideoSpec**: validated USGS facts plus scene timing, with no free-form text. Every on-screen string comes from fixed, reviewed templates. The package does not depend on the M1 news agent (Output.ai and Temporal).

Decisions and evidence:
- [ADR 0002: map rendering](../docs/decisions/0002-m2-map-rendering.md)
- [ADR 0003: VideoSpec, copy and design](../docs/decisions/0003-m2-video-spec.md)

## Setup

Requires Node 24.3 or later, and a GPU for practical render times.

```bash
npm install
npm run build:geo
```

`build:geo` prepares the offline map data and the MapLibre worker in `public/` (gitignored). The fonts in `public/fonts/` are committed (SIL OFL 1.1).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Unit tests: schema, fixtures, copy and guard, design tokens and layout, cameras, scene timing, independence from M1 |
| `npm run typecheck` | TypeScript check |
| `npm run studio` | Remotion Studio (QuakeNews, MapSpike, DesignBoard) |
| `npm run copy:review` | Writes every on-screen string per fixture to `out/copy-review.md` |
| `npm run render:news` | Builds each fixture's VideoSpec (`out/news/<fixture>.spec.json`), renders `out/news/<fixture>.mp4` with the live map on GPU, and saves review stills |
| `npm run render:design` | DesignBoard stills, full size and phone size (`out/design/`) |
| `npm run render:contact-sheet` | One labeled sheet of the DesignBoard phone stills |
| `npm run verify -- --dir=news --frames=1050 --report=news-report noto kamchatka preliminaryTest` | Checks the stream, readiness, blank frames, pops and marker drift for each render (`out/news-report.md`) |

To render one video from any valid spec:

```bash
npx remotion render QuakeNews out/video.mp4 --gl=angle --props=path/to/spec.json
```

The props file is `{ "spec": <VideoSpec> }`. An invalid spec, or copy that fails the guard, fails the render before frame 0.

## Structure

```
src/
  spec/          VideoSpec v1 schema, builder (facts → spec), scene timeline
  fixtures/      Noto, Kamchatka (USGS data) and a preliminary TEST DATA fixture
  copy/          formatters, screen-copy templates, fixed caveats, focused guard
  design/        tokens, brand (channel name and tagline), layout and safe area, motion, fonts
  components/    chrome, lower third, data panel, context card, closing card, wordmark
  map/           LiveMap (M2.0 readiness gate), news camera, NewsMap, static backdrop
  scenes/        Hook, Facts, Context, Closing (presentational, given screen copy and a frame)
  compositions/  QuakeNews (the video), DesignBoard (review stills)
  spike/         M2.0 map spike, kept as a regression reference
scripts/         geo/font preparation, render and verification tools
```

## Not here yet

- **M2.2:** production map styling (terrain, labels).
- **M2.3:** narration, audio and subtitles.
- **M2.4:** M1 → VideoSpec integration and publishing.
