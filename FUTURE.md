# Future Features

## Planned
- Hebrew UI support (RTL text, right-aligned labels)
- Demo pictures and videos for the README and website, showing off features and how to use the app.

## Done
- ~~PDA (pushdown automata) support~~ — PDA type with stack operations, PDA transition rules (input/pop/push), final-state and empty-stack acceptance modes, stack visualization during simulation, nondeterministic configuration tracking
- ~~Tab support for multiple automata~~ — tab bar UI, per-tab state isolation, per-tab file handles, multi-tab autosave, keyboard shortcuts (Ctrl+T/W/PgDn/PgUp)
- ~~SEO improvements~~ — meta tags, Open Graph, Twitter Cards, robots.txt, sitemap.xml, manifest.json, OG preview image
- ~~AI Readme~~ — llms.txt and llms-full.txt with JSON schema docs, examples, and LLM instructions
- ~~Mobile support~~ — full touch UI for phone (<640px) and tablet (640-1024px): bottom sheet panel, top+bottom bar, tap-tap transitions, pinch zoom, long-press context menu, hamburger menu, tab dropdown, localStorage-only on phone
- ~~Mobile file save/load/export on phone~~ — enabled Save/Load/Export PNG in phone hamburger menu; existing fallback chain handles iOS Safari (file-saver download) and Android Chrome (File System Access API)

## Other Ideas
- Image export to clipboard (currently only to file) + make the export ignore selection highlights (but keep simulation trace highlights if in simulation mode)
- NFA to DFA conversion (subset construction)
- Turing Machine simulation
- Moore/Mealy machines
- Regex to NFA conversion
- equality testing between automata (using known algorithms)
- Mobile: first-use gesture tutorial overlay
- Mobile: multi-select on phone (currently tablet+ only)
- hide epsilon button when in DFA mode, since it has no meaning there

## Maintenance Note For Claude
- Before finishing any code change, run the project build and clear all TypeScript `TS6133` unused symbol errors instead of assuming deploy can ignore them.
- Be careful with unused imports, store selectors, and function parameters because `tsc -b` treats them as build failures in this repo.
