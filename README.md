# Automata Simulator

A web-based visual editor and simulator for finite automata (DFA and NFA). Build automata with an interactive diagram editor, simulate words step-by-step, save/load your work, and edit states and transitions with a professional interface.

## Features

- **Interactive diagram editor** — drag states to reposition, scroll to zoom, drag canvas to pan
- **Word simulation** — step-by-step DFA/NFA simulation with visual state/transition highlighting; Run auto-plays the animation and shows the final result
- **Batch simulation** — test multiple words at once, see accept/reject results for each
- **Pre-simulation validation** — detects DFA symbol conflicts, missing transitions, no initial state
- **Auto-run & speed control** — auto-step through simulation at configurable speed (100ms–2s)
- **DFA & NFA support** — toggle between deterministic and nondeterministic modes
- **Textbook-quality diagrams** — double circles for accepting states, curved arrows, self-loops
- **Smart self-loop placement** — self-loops automatically position away from connected edges
- **Snap-to-alignment** — states snap to horizontal/vertical alignment when dragged near other states, with visual guide lines
- **New diagram with q0** — new automata start with an initial state already placed
- **Hover "+" hint** — hover on empty canvas to see a placement hint; click to add a state
- **Random word generator** — generate a random word from the alphabet for quick testing
- **Zoom controls** — scroll to zoom + toolbar +/- buttons with percentage display + fit-to-content
- **Dark mode** — toggle between light and dark themes; respects system preference
- **PNG export** — export the diagram as a high-resolution PNG image
- **Save/Load** — export to JSON, import with exact visual state restoration (positions, zoom, viewport)
- **Auto-save** — current state automatically saved to browser storage; restored on page reload
- **Unsaved changes warning** — browser warns before closing tab with unsaved work
- **Undo/Redo** — full undo/redo history (Ctrl+Z / Ctrl+Shift+Z)
- **Properties panel** — edit state names, toggle initial/accepting, modify transition symbols
- **Styled transition editor** — custom modal for entering/editing transition symbols (no browser prompts)
- **Intuitive interactions** — click two states to create a transition; double-click for self-loop; drag handle on hover
- **Help tooltip** — `?` button at bottom-right shows all keyboard shortcuts and instructions; auto-opens on first visit

## How to Use

1. **Add states** — click "+ New State" in the toolbar (or press N), then click on the canvas to place
2. **Create transitions** — click a source state, then click a target state within 3 seconds
3. **Create self-loops** — double-click a state
4. **Drag-to-connect** — hover over a state to reveal the arrow handle, drag it to another state
5. **Edit transition symbols** — double-click any transition to edit its symbols
6. **Edit properties** — click any state or transition to see its properties in the right panel
7. **Move states** — drag states to reposition (they snap to alignment with other states)
8. **Delete** — select an element and press Delete or Backspace
9. **Undo/Redo** — Ctrl+Z to undo, Ctrl+Shift+Z to redo
10. **Save** — click "Save" or press Ctrl+S
11. **Load** — click "Load" or press Ctrl+O and select a JSON file

## Simulation

1. Click **Simulate** in the toolbar (or build your automaton first)
2. Enter a word (e.g., `a,b,a` or `aba`), or click **Random** to generate one, then click **Run** — the animation auto-plays and shows the final accept/reject result
3. Use step controls or keyboard shortcuts to replay the trace
4. Active states glow green; traversed transitions are highlighted
5. Switch to **Batch** mode to test multiple words at once (one per line)
6. Press **Escape** or click **Exit Sim** to return to editing

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| N | New State (click canvas to place) |
| Delete / Backspace | Delete selected element |
| Escape | Cancel / Exit simulation |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+S | Save to file |
| Ctrl+O | Load from file |
| Ctrl+N | New automaton |

### During Simulation

| Key | Action |
|-----|--------|
| Space | Step forward / Run |
| Enter | Toggle auto-run |
| Left / Right arrow | Step backward / forward |
| Escape | Exit simulation |

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose

### Development Server
```bash
docker compose up dev
```
Open http://localhost:5173 in your browser. Changes in `src/` will hot-reload.

### Run Tests
```bash
docker compose run --rm test
```

### Production Build
```bash
docker compose up prod
```
Serves the optimized build at http://localhost:8080.

## Project Structure

```
src/
├── models/        # Data types: Automaton, State, Transition, Zod schemas
├── stores/        # Zustand stores: automaton data, editor UI, undo/redo history, simulation
├── components/
│   ├── canvas/    # SVG rendering: states, transitions, arrows, grid, symbol modal
│   ├── toolbar/   # File operations, new state button, undo/redo
│   ├── panels/    # Properties panel for editing selected elements
│   └── help/      # Keyboard shortcuts tooltip
├── services/
│   ├── serialization/  # JSON save & load with Zod validation
│   ├── layout/         # Edge routing, Bezier curves, label overlap avoidance, self-loop placement
│   ├── simulation/     # DFA/NFA trace engine, pre-simulation validator
│   └── export/         # PNG image export
├── hooks/         # Keyboard shortcuts, auto-save, unsaved warning, theme
└── utils/         # Math, Bezier, ID generation, snap-to-alignment, random word, fit viewport
tests/
├── unit/          # 193 tests covering simulation, stores, serializers, edge-routing, utils
```

## Auto-save

The current automaton is automatically saved to browser localStorage every 500ms after changes. When you reopen the page, your work is restored automatically. Creating a new automaton clears the auto-save.

## Tech Stack

- React 18 + TypeScript + Vite 6
- Custom SVG rendering (no graph library dependency)
- Zustand for state management
- Zod for save/load schema validation
- Vitest for tests (193 unit tests)
- Docker + Express for deployment
