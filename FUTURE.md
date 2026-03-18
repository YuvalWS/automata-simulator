# Future Features

## Planned
- Tab support for multiple automata
- Hebrew UI support (RTL text, right-aligned labels)
- SEO improvements (meta tags, server-side rendering), SEO description, whatsapp preview image, etc.
- AI Readme, to allow LLMs to understand the json file format and generate/read automata from files, or explain automata in natural language.
- Demo pictures and videos for the README and website, showing off features and how to use the app.

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
