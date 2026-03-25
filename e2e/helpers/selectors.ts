/** Centralized selectors for E2E tests — single place to update if testids change */
export const SEL = {
  canvas: '[data-testid="automata-canvas"]',
  toolbar: '[data-testid="toolbar"]',
  propertiesPanel: '[data-testid="properties-panel"]',

  // Automaton properties
  automatonProperties: '[data-testid="automaton-properties"]',
  automatonNameInput: '[data-testid="automaton-name-input"]',
  automatonTypeSelect: '[data-testid="automaton-type-select"]',
  automatonAlphabetInput: '[data-testid="automaton-alphabet-input"]',

  // State properties
  stateProperties: '[data-testid="state-properties"]',
  stateNameInput: '[data-testid="state-name-input"]',
  stateInitialCheckbox: '[data-testid="state-initial-checkbox"]',
  stateAcceptingCheckbox: '[data-testid="state-accepting-checkbox"]',

  // Transition properties
  transitionProperties: '[data-testid="transition-properties"]',
  transitionSymbolsInput: '[data-testid="transition-symbols-input"]',

  // Symbol modal
  symbolModalOverlay: '.symbol-modal-overlay',
  symbolModalInput: '.symbol-modal-input',
  symbolModalConfirm: '.symbol-modal-btn.confirm',
  symbolModalCancel: '.symbol-modal-btn.cancel',
  symbolModalEpsilon: '.symbol-modal-btn.epsilon',

  // Simulation panel
  simWordInput: '.sim-word-input',
  simRunBtn: '.sim-btn-primary',
  simResetBtn: '.sim-btn-secondary',
  simExitBtn: '.sim-btn-exit',
  simBatchInput: '.sim-batch-input',
  simStatus: '.sim-status',
  simModeToggle: '.sim-mode-toggle',

  // Toolbar buttons
  toolbarNewState: '.toolbar-new-state',
  toolbarSimulate: '.toolbar-simulate',
  toolbarSimulateActive: '.toolbar-simulate-active',
  toolbarUndo: 'button[title*="Undo"]',
  toolbarRedo: 'button[title*="Redo"]',
  toolbarZoomIn: 'button[title="Zoom In"]',
  toolbarZoomOut: 'button[title="Zoom Out"]',
  toolbarFit: 'button[title="Fit to Content"]',
  toolbarZoomDisplay: '.zoom-controls-display',

  // Canvas elements by dynamic ID
  stateById: (id: string) => `[data-testid="state-${id}"]`,
  transitionById: (id: string) => `[data-testid="transition-${id}"]`,

  // Help panel
  helpToggle: '.shortcuts-toggle',
  helpPanel: '.shortcuts-panel',
  helpClose: '.shortcuts-close',

  // Tab bar
  tabBar: '[data-testid="tab-bar"]',
  tabNewBtn: '[data-testid="tab-new-btn"]',
  tabById: (id: string) => `[data-testid="tab-${id}"]`,
  allTabs: '.tab-item',
  activeTab: '.tab-item.tab-active',
  tabCloseBtn: '.tab-close-btn',
  tabDirtyDot: '.tab-dirty-dot',

  // Wildcard selectors
  allStates: '[data-testid^="state-"]',
  allTransitions: '[data-testid^="transition-"]',
} as const;
