import { useState, useRef, useEffect } from 'react';
import { DEFAULT_BLANK_SYMBOL, EPSILON, normalizeEpsilon } from '@/models/epsilon';
import { AutomatonType } from '@/models/types';
import type { PdaStackMode, TmDirection } from '@/models/types';
import { useViewport } from '@/hooks/use-viewport';
import type { PdaRule, TmRule } from '@/models/automaton';
import './TransitionSymbolModal.css';

interface TransitionSymbolModalProps {
  position: { x: number; y: number };
  initialSymbols?: string[];
  initialPdaRules?: PdaRule[];
  initialTmRules?: TmRule[];
  automatonType: AutomatonType;
  pdaStackMode?: PdaStackMode;
  tmBlankSymbol?: string;
  onSubmit: (symbols: string[], pdaRules?: PdaRule[], tmRules?: TmRule[]) => void;
  onCancel: () => void;
}

/**
 * Parse a push-symbols string into an array of individual stack symbols.
 * - If commas or spaces are present: token-split (supports multi-char symbols like Z₀).
 * - Otherwise: char-by-char, grouping a letter followed by a subscript Unicode char (U+2080–U+2089)
 *   as one token so that Z₀ stays as a single symbol.
 */
function parsePushSymbols(val: string): string[] {
  if (val.includes(',')) return val.split(',').map((s) => s.trim()).filter(Boolean);
  if (val.includes(' ')) return val.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  // Char-by-char, grouping subscript characters with preceding char
  const result: string[] = [];
  let current = '';
  for (const ch of val) {
    const code = ch.codePointAt(0) ?? 0;
    const isSubscript = code >= 0x2080 && code <= 0x2089;
    if (isSubscript && current.length > 0) {
      current += ch;
    } else {
      if (current) result.push(current);
      current = ch;
    }
  }
  if (current) result.push(current);
  return result;
}

function createEmptyRule(): PdaRule {
  return { inputSymbol: '', stackPop: '', stackPush: [] };
}

/**
 * Editor-local shape: keeps the raw `readSymbolsText` so the user can type
 * `0, 1, Y, Z` without the parser splitting mid-keystroke. Parsed into
 * `readSymbols: string[]` at submit time.
 */
interface TmRuleDraft {
  readSymbolsText: string;
  writeSymbol: string;
  direction: TmDirection;
}

function createEmptyTmDraft(blank: string): TmRuleDraft {
  return { readSymbolsText: blank, writeSymbol: '', direction: 'R' };
}

function tmRuleToDraft(rule: TmRule): TmRuleDraft {
  return {
    readSymbolsText: rule.readSymbols.join(', '),
    writeSymbol: rule.writeSymbol ?? '',
    direction: rule.direction,
  };
}

function parseReadSymbols(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

export function TransitionSymbolModal({ position, initialSymbols, initialPdaRules, initialTmRules, automatonType, pdaStackMode, tmBlankSymbol, onSubmit, onCancel }: TransitionSymbolModalProps) {
  const isPDA = automatonType === AutomatonType.PDA;
  const isTM = automatonType === AutomatonType.TM;
  const isDFA = automatonType === AutomatonType.DFA;
  const isPeek = isPDA && pdaStackMode === 'peek';
  const blank = tmBlankSymbol && tmBlankSymbol.length > 0 ? tmBlankSymbol : DEFAULT_BLANK_SYMBOL;

  // DFA/NFA state
  const [value, setValue] = useState(initialSymbols?.join(', ') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useViewport();

  // PDA state
  const [pdaRules, setPdaRules] = useState<PdaRule[]>(
    initialPdaRules && initialPdaRules.length > 0
      ? initialPdaRules.map((r) => ({ ...r }))
      : [createEmptyRule()],
  );

  // TM state — keeps the raw read-symbols text per rule for free-form typing.
  const [tmRules, setTmRules] = useState<TmRuleDraft[]>(
    initialTmRules && initialTmRules.length > 0
      ? initialTmRules.map(tmRuleToDraft)
      : [createEmptyTmDraft(blank)],
  );

  useEffect(() => {
    if (!isPDA && !isTM) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isPDA, isTM]);

  const handleDfaNfaSubmit = () => {
    const symbols = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (symbols.length > 0) {
      onSubmit(symbols);
    }
  };

  const handlePdaSubmit = () => {
    const validRules = pdaRules.filter((r) => r.inputSymbol || r.stackPop || r.stackPush.length > 0);
    if (validRules.length > 0) {
      const normalized = validRules.map((r) => {
        const base = {
          inputSymbol: normalizeEpsilon(r.inputSymbol),
          stackPop: normalizeEpsilon(r.stackPop),
          stackPush: r.stackPush,
        };
        if (isPeek) {
          return { ...base, peekAction: r.peekAction ?? 'pop' } satisfies PdaRule;
        }
        return base;
      });
      onSubmit([], normalized);
    }
  };

  const handleTmSubmit = () => {
    const parsed: TmRule[] = tmRules
      .map((draft) => {
        const reads = parseReadSymbols(draft.readSymbolsText);
        if (reads.length === 0) return null;
        const rule: TmRule = { readSymbols: reads, direction: draft.direction };
        if (draft.writeSymbol.length > 0) rule.writeSymbol = draft.writeSymbol;
        return rule;
      })
      .filter((r): r is TmRule => r !== null);
    if (parsed.length > 0) {
      onSubmit([], undefined, parsed);
    }
  };

  const handleSubmit = isPDA ? handlePdaSubmit : isTM ? handleTmSubmit : handleDfaNfaSubmit;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // On mobile, center the modal; on desktop, clamp to viewport near the click
  const modalStyle: React.CSSProperties = isMobile
    ? { left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }
    : { left: Math.min(position.x, window.innerWidth - 260), top: Math.min(position.y, window.innerHeight - 120) };

  const updateRule = (index: number, field: keyof PdaRule, val: string) => {
    setPdaRules((prev) => prev.map((r, i) => {
      if (i !== index) return r;
      if (field === 'stackPush') {
        return { ...r, stackPush: parsePushSymbols(val) };
      }
      if (field === 'peekAction') {
        return { ...r, peekAction: val as 'nop' | 'push' | 'pop' };
      }
      return { ...r, [field]: val };
    }));
  };

  const addRule = () => {
    setPdaRules((prev) => [...prev, createEmptyRule()]);
  };

  const removeRule = (index: number) => {
    setPdaRules((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const setEpsilonField = (index: number, field: 'inputSymbol' | 'stackPop') => {
    updateRule(index, field, EPSILON);
  };

  const updateTmRule = (index: number, field: keyof TmRuleDraft, val: string) => {
    setTmRules((prev) => prev.map((r, i) => {
      if (i !== index) return r;
      if (field === 'direction') return { ...r, direction: val as TmDirection };
      return { ...r, [field]: val };
    }));
  };

  const appendToReadSymbols = (index: number, sym: string) => {
    setTmRules((prev) => prev.map((r, i) => {
      if (i !== index) return r;
      const existing = r.readSymbolsText.trim();
      const next = existing.length === 0 ? sym : `${existing}, ${sym}`;
      return { ...r, readSymbolsText: next };
    }));
  };

  const addTmRule = () => {
    setTmRules((prev) => [...prev, createEmptyTmDraft(blank)]);
  };

  const removeTmRule = (index: number) => {
    setTmRules((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  // Clamp position to viewport
  const modalWidth = isPDA || isTM ? 360 : 260;
  const x = Math.min(position.x, window.innerWidth - modalWidth - 20);
  const y = Math.min(position.y, window.innerHeight - (isPDA || isTM ? 300 : 120));

  if (isTM) {
    return (
      <div className="symbol-modal-overlay" onMouseDown={onCancel}>
        <div
          className="symbol-modal symbol-modal-tm"
          style={{ left: x, top: y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="symbol-modal-title">
            {initialTmRules ? 'Edit TM Transition Rules' : 'Enter TM Transition Rules'}
          </div>

          <div className="tm-rules-list">
            {tmRules.map((rule, i) => (
              <div key={i} className="tm-rule-row" onKeyDown={handleKeyDown}>
                <label className="tm-field">
                  <span className="tm-field-label">Read</span>
                  <div className="tm-field-input-row">
                    <input
                      type="text"
                      className="symbol-modal-input tm-input"
                      value={rule.readSymbolsText}
                      onChange={(e) => updateTmRule(i, 'readSymbolsText', e.target.value)}
                      placeholder="e.g. 0,1,Y"
                      autoFocus={i === 0}
                    />
                    <button
                      type="button"
                      className="symbol-modal-btn tm-blank-btn"
                      onClick={() => appendToReadSymbols(i, blank)}
                      title={`Append blank (${blank})`}
                    >{blank}</button>
                  </div>
                </label>
                <label className="tm-field">
                  <span className="tm-field-label">Write</span>
                  <div className="tm-field-input-row">
                    <input
                      type="text"
                      className="symbol-modal-input tm-input"
                      value={rule.writeSymbol}
                      onChange={(e) => updateTmRule(i, 'writeSymbol', e.target.value)}
                      placeholder="(no write)"
                    />
                    <button
                      type="button"
                      className="symbol-modal-btn tm-blank-btn"
                      onClick={() => updateTmRule(i, 'writeSymbol', blank)}
                      title={`Set to blank (${blank})`}
                    >{blank}</button>
                  </div>
                </label>
                <label className="tm-field tm-field-direction">
                  <span className="tm-field-label">Move</span>
                  <div className="tm-direction-radios">
                    {(['L', 'S', 'R'] as const).map((d) => (
                      <label key={d} className="tm-direction-radio">
                        <input
                          type="radio"
                          name={`tm-dir-${i}`}
                          value={d}
                          checked={rule.direction === d}
                          onChange={() => updateTmRule(i, 'direction', d)}
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                </label>
                {tmRules.length > 1 && (
                  <button
                    type="button"
                    className="symbol-modal-btn tm-remove-btn"
                    onClick={() => removeTmRule(i)}
                    title="Remove rule"
                  >{'✖'}</button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="symbol-modal-btn tm-add-rule" onClick={addTmRule}>
            + Add Rule
          </button>

          <div className="symbol-modal-hint">
            Multiple reads: comma-separated (e.g. <code>0,1,Y,Z</code>). Leave write blank for no-op
            ({' '}like <code>Y → R</code>). Use the {blank} button for the blank symbol.
          </div>

          <div className="symbol-modal-actions">
            <button className="symbol-modal-btn cancel" onClick={onCancel}>Cancel</button>
            <button className="symbol-modal-btn confirm" onClick={handleTmSubmit}>Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  if (isPDA) {
    const stackLabel = isPeek ? 'Peek' : 'Pop';
    const stackLabelTitle = isPeek
      ? `Must be at stack top (not consumed)`
      : `Must be at stack top (consumed)`;

    return (
      <div className="symbol-modal-overlay" onMouseDown={onCancel}>
        <div
          className="symbol-modal symbol-modal-pda"
          style={{ left: x, top: y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="symbol-modal-title">
            {initialPdaRules ? 'Edit PDA Transition Rules' : 'Enter PDA Transition Rules'}
          </div>

          <div className="pda-rules-list">
            {pdaRules.map((rule, i) => {
              const peekAction = rule.peekAction ?? 'pop';
              const showPush = !isPeek || peekAction !== 'nop';
              return (
                <div key={i} className="pda-rule-row" onKeyDown={handleKeyDown}>
                  {/* Condition row */}
                  <div className="pda-rule-condition">
                    <label className="pda-field">
                      <span className="pda-field-label">Input</span>
                      <div className="pda-field-input-row">
                        <input
                          type="text"
                          className="symbol-modal-input pda-input"
                          value={rule.inputSymbol}
                          onChange={(e) => updateRule(i, 'inputSymbol', e.target.value)}
                          placeholder={EPSILON}
                          autoFocus={i === 0}
                        />
                        <button
                          type="button"
                          className="symbol-modal-btn epsilon pda-eps-btn"
                          onClick={() => setEpsilonField(i, 'inputSymbol')}
                          title={`Set to ${EPSILON} (don't consume input)`}
                        >{EPSILON}</button>
                      </div>
                    </label>
                    <label className="pda-field" title={stackLabelTitle}>
                      <span className="pda-field-label">{stackLabel}</span>
                      <div className="pda-field-input-row">
                        <input
                          type="text"
                          className="symbol-modal-input pda-input"
                          value={rule.stackPop}
                          onChange={(e) => updateRule(i, 'stackPop', e.target.value)}
                          placeholder={EPSILON}
                        />
                        <button
                          type="button"
                          className="symbol-modal-btn epsilon pda-eps-btn"
                          onClick={() => setEpsilonField(i, 'stackPop')}
                          title={`Set to ${EPSILON}`}
                        >{EPSILON}</button>
                      </div>
                    </label>
                    {pdaRules.length > 1 && (
                      <button
                        type="button"
                        className="symbol-modal-btn pda-remove-btn"
                        onClick={() => removeRule(i)}
                        title="Remove rule"
                      >{'\u2716'}</button>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="pda-rule-action">
                    {isPeek ? (
                      <div className="pda-action-area">
                        <span className="pda-field-label">Action</span>
                        <div className="pda-action-radios">
                          {(['nop', 'push', 'pop'] as const).map((act) => (
                            <label key={act} className="pda-action-radio">
                              <input
                                type="radio"
                                name={`peek-action-${i}`}
                                value={act}
                                checked={peekAction === act}
                                onChange={() => updateRule(i, 'peekAction', act)}
                              />
                              {act === 'nop' ? 'No-op' : act === 'push' ? 'Push' : 'Pop'}
                            </label>
                          ))}
                        </div>
                        {showPush && (
                          <input
                            type="text"
                            className="symbol-modal-input pda-input pda-push-input"
                            value={rule.stackPush.join(', ')}
                            onChange={(e) => updateRule(i, 'stackPush', e.target.value)}
                            placeholder="symbols to push (leftmost = top)"
                          />
                        )}
                      </div>
                    ) : (
                      <label className="pda-field pda-field-push">
                        <span className="pda-field-label">Push</span>
                        <input
                          type="text"
                          className="symbol-modal-input pda-input"
                          value={rule.stackPush.join(', ')}
                          onChange={(e) => updateRule(i, 'stackPush', e.target.value)}
                          placeholder="symbols (leftmost = top)"
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="symbol-modal-btn pda-add-rule" onClick={addRule}>
            + Add Rule
          </button>

          <div className="symbol-modal-hint">
            {isPeek
              ? `Peek checks the stack top without consuming it. Choose No-op, Push (top stays), or Pop (top consumed).`
              : `Input + ${stackLabel} \u2192 Push. Use ${EPSILON} for no-op. Push: each char is a symbol (or comma-separated for multi-char tokens like Z\u2080).`}
          </div>

          <div className="symbol-modal-actions">
            <button className="symbol-modal-btn cancel" onClick={onCancel}>Cancel</button>
            <button className="symbol-modal-btn confirm" onClick={handlePdaSubmit}>Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  // DFA/NFA mode (unchanged)
  return (
    <div className="symbol-modal-overlay" onMouseDown={onCancel} onTouchStart={onCancel}>
      <div
        className="symbol-modal"
        style={modalStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="symbol-modal-title">
          {initialSymbols ? 'Edit Transition Symbols' : 'Enter Transition Symbols'}
        </div>
        <div className="symbol-modal-input-row">
          <input
            ref={inputRef}
            type="text"
            className="symbol-modal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'a, b, ' + EPSILON}
          />
          <button
            type="button"
            className="symbol-modal-btn epsilon"
            onClick={() => setValue((v) => v.trim() ? `${v}, ${EPSILON}` : EPSILON)}
            disabled={isDFA}
            title={isDFA ? 'Epsilon transitions are not allowed in DFA' : 'Add epsilon (' + EPSILON + ') transition'}
          >
            {'\u03B5'}
          </button>
        </div>
        <div className="symbol-modal-hint">{'Comma-separated. Use ' + EPSILON + ' for epsilon transitions. Enter to confirm.'}</div>
        <div className="symbol-modal-actions">
          <button className="symbol-modal-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="symbol-modal-btn confirm" onClick={handleDfaNfaSubmit}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
