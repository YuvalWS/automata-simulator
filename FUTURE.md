# Future Features (Phase 3+)

Deferred from Phase 2 — implement after word simulation is working.

## Zoom UI Controls
- Add fit-to-content button (auto-zoom to show all states with padding)
- Add zoom percentage display in toolbar (click to reset to 100%)
- Keyboard shortcuts: +/= zoom in, - zoom out, Ctrl+0 fit to content
- Viewport utility: `computeFitViewport(states, canvasWidth, canvasHeight)`

## Image Export / Share Button
- "Export PNG" button in toolbar
- Clone SVG, remove grid/guides/selection, compute tight bounding box
- Inline CSS variables, serialize to canvas at 2x resolution, export as PNG
- Web Share API support (fallback to file download via file-saver)

## UX Improvements
- Show help popup automatically on first visit to the site (localStorage flag)

## Other Ideas
- Tab support for multiple automata
- NFA to DFA conversion (subset construction)
- Epsilon transitions for NFA
- PDA (pushdown automata) support
- Turing Machine simulation
- Moore/Mealy machines
- Regex to NFA conversion


## Maintenance Note For Claude
- Before finishing any code change, run the project build and clear all TypeScript `TS6133` unused symbol errors instead of assuming deploy can ignore them.
- Be careful with unused imports, store selectors, and function parameters because `tsc -b` treats them as build failures in this repo.
