# Future Features

## Planned
- Web Share API support for image export (share sheet on mobile)
- NFA to DFA conversion (subset construction)
- Tab support for multiple automata
- Hebrew support (RTL text, right-aligned labels)

## Other Ideas
- Epsilon transitions for NFA
- PDA (pushdown automata) support
- Turing Machine simulation
- Moore/Mealy machines
- Regex to NFA conversion

## Maintenance Note For Claude
- Before finishing any code change, run the project build and clear all TypeScript `TS6133` unused symbol errors instead of assuming deploy can ignore them.
- Be careful with unused imports, store selectors, and function parameters because `tsc -b` treats them as build failures in this repo.
