# Future Features

## Planned
- Tab support for multiple automata
- Hebrew UI support (RTL text, right-aligned labels)
- Demo pictures and videos for the README and website, showing off features and how to use the app.

## Done
- ~~SEO improvements~~ — meta tags, Open Graph, Twitter Cards, robots.txt, sitemap.xml, manifest.json, OG preview image
- ~~AI Readme~~ — llms.txt and llms-full.txt with JSON schema docs, examples, and LLM instructions

## Other Ideas
- Image export to clipboard
- PDA (pushdown automata) support
- NFA to DFA conversion (subset construction)
- Turing Machine simulation
- Moore/Mealy machines
- Regex to NFA conversion
- mobile support with a redesigned UI for touch interactions

## Maintenance Note For Claude
- Before finishing any code change, run the project build and clear all TypeScript `TS6133` unused symbol errors instead of assuming deploy can ignore them.
- Be careful with unused imports, store selectors, and function parameters because `tsc -b` treats them as build failures in this repo.
