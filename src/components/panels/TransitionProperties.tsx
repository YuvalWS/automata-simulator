import { useState, useEffect, useRef } from 'react';
import type { Transition, PdaRule, TmRule } from '@/models/automaton';
import { useAutomatonStore } from '@/stores/automaton-store';
import { AutomatonType } from '@/models/types';
import type { TmDirection } from '@/models/types';
import { DEFAULT_BLANK_SYMBOL, EPSILON, toDisplayBlank, fromDisplayBlank } from '@/models/epsilon';

interface TransitionPropertiesProps {
  transition: Transition;
}

export function TransitionProperties({ transition }: TransitionPropertiesProps) {
  const updateTransition = useAutomatonStore((s) => s.updateTransition);
  const automaton = useAutomatonStore((s) => s.automaton);
  const [symbolsText, setSymbolsText] = useState(transition.symbols.join(', '));

  const source = automaton.states.find((s) => s.id === transition.sourceId);
  const target = automaton.states.find((s) => s.id === transition.targetId);
  const isDFA = automaton.type === AutomatonType.DFA;
  const isPDA = automaton.type === AutomatonType.PDA;
  const isTM = automaton.type === AutomatonType.TM;
  const blank = automaton.tmBlankSymbol && automaton.tmBlankSymbol.length > 0
    ? automaton.tmBlankSymbol
    : DEFAULT_BLANK_SYMBOL;

  const tmReadRefs = useRef<(HTMLInputElement | null)[]>([]);

  const appendBlankToTmRead = (index: number) => {
    const input = tmReadRefs.current[index];
    const current = input ? input.value : (transition.tmRules?.[index]?.readSymbols.join(', ') ?? '');
    const next = current.trim() ? `${current.trim()}, ${blank}` : blank;
    if (input) input.value = next;
    handleTmRuleChange(index, 'readSymbolsText', next);
  };

  useEffect(() => {
    setSymbolsText(transition.symbols.join(', '));
  }, [transition.symbols, transition.id]);

  const handleSymbolsBlur = () => {
    const symbols = symbolsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (symbols.length > 0) {
      updateTransition(transition.id, { symbols });
    } else {
      setSymbolsText(transition.symbols.join(', '));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePdaRuleChange = (index: number, field: keyof PdaRule, value: string) => {
    const rules = [...(transition.pdaRules ?? [])];
    const rule = { ...rules[index]! };
    if (field === 'stackPush') {
      rule.stackPush = value.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      (rule as Record<string, unknown>)[field] = value;
    }
    rules[index] = rule;
    updateTransition(transition.id, { pdaRules: rules });
  };

  const addPdaRule = () => {
    const rules = [...(transition.pdaRules ?? []), { inputSymbol: EPSILON, stackPop: EPSILON, stackPush: [] }];
    updateTransition(transition.id, { pdaRules: rules });
  };

  const removePdaRule = (index: number) => {
    const rules = (transition.pdaRules ?? []).filter((_, i) => i !== index);
    if (rules.length > 0) {
      updateTransition(transition.id, { pdaRules: rules });
    }
  };

  const handleTmRuleChange = (index: number, field: 'readSymbolsText' | 'writeSymbol' | 'direction', value: string) => {
    const rules = [...(transition.tmRules ?? [])];
    const rule: TmRule = { ...rules[index]! };
    if (field === 'direction') {
      rule.direction = value as TmDirection;
    } else if (field === 'readSymbolsText') {
      rule.readSymbols = value.split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => fromDisplayBlank(s, blank));
    } else if (field === 'writeSymbol') {
      if (value.length > 0) rule.writeSymbol = fromDisplayBlank(value, blank);
      else delete rule.writeSymbol;
    }
    rules[index] = rule;
    updateTransition(transition.id, { tmRules: rules });
  };

  const addTmRule = () => {
    const rules: TmRule[] = [...(transition.tmRules ?? []), { readSymbols: [DEFAULT_BLANK_SYMBOL], direction: 'R' }];
    updateTransition(transition.id, { tmRules: rules });
  };

  const removeTmRule = (index: number) => {
    const rules = (transition.tmRules ?? []).filter((_, i) => i !== index);
    if (rules.length > 0) {
      updateTransition(transition.id, { tmRules: rules });
    }
  };

  return (
    <div className="panel-section" data-testid="transition-properties">
      <h3 className="panel-title">Transition Properties</h3>

      <div className="panel-field">
        <span className="panel-label">From</span>
        <span className="panel-value">{source?.name ?? 'unknown'}</span>
      </div>

      <div className="panel-field">
        <span className="panel-label">To</span>
        <span className="panel-value">{target?.name ?? 'unknown'}</span>
      </div>

      {!isPDA && !isTM && (
        <label className="panel-field">
          <span className="panel-label">Symbols (comma-separated)</span>
          <div className="prop-input-row">
            <input
              type="text"
              className="panel-input"
              value={symbolsText}
              onChange={(e) => setSymbolsText(e.target.value)}
              onBlur={handleSymbolsBlur}
              onKeyDown={handleKeyDown}
              data-testid="transition-symbols-input"
            />
            <button
              type="button"
              className="prop-sym-btn"
              disabled={isDFA}
              title={isDFA ? 'Epsilon transitions not allowed in DFA' : `Add ε transition`}
              onClick={() => setSymbolsText((v) => v.trim() ? `${v.trim()}, ${EPSILON}` : EPSILON)}
            >{EPSILON}</button>
          </div>
        </label>
      )}

      {isPDA && (
        <div className="panel-field">
          <span className="panel-label">PDA Rules</span>
          {(transition.pdaRules ?? []).map((rule, i) => (
            <div key={i} className="pda-prop-rule" data-testid={`pda-rule-${i}`}>
              <div className="pda-prop-rule-fields">
                <input
                  type="text"
                  className="panel-input pda-prop-input"
                  value={rule.inputSymbol}
                  onChange={(e) => handlePdaRuleChange(i, 'inputSymbol', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="in"
                  title="Input symbol"
                />
                <button
                  type="button"
                  className="prop-sym-btn"
                  onClick={() => handlePdaRuleChange(i, 'inputSymbol', EPSILON)}
                  title={`Set input to ε`}
                >{EPSILON}</button>
                <span className="pda-prop-sep">,</span>
                <input
                  type="text"
                  className="panel-input pda-prop-input"
                  value={rule.stackPop}
                  onChange={(e) => handlePdaRuleChange(i, 'stackPop', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="pop"
                  title="Stack pop"
                />
                <button
                  type="button"
                  className="prop-sym-btn"
                  onClick={() => handlePdaRuleChange(i, 'stackPop', EPSILON)}
                  title={`Set pop to ε`}
                >{EPSILON}</button>
                <span className="pda-prop-sep">{'\u2192'}</span>
                <input
                  type="text"
                  className="panel-input pda-prop-input"
                  value={rule.stackPush.join(', ')}
                  onChange={(e) => handlePdaRuleChange(i, 'stackPush', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="push"
                  title="Stack push (comma-separated)"
                />
                {(transition.pdaRules ?? []).length > 1 && (
                  <button
                    className="pda-prop-remove"
                    onClick={() => removePdaRule(i)}
                    title="Remove rule"
                  >{'\u2716'}</button>
                )}
              </div>
            </div>
          ))}
          <button className="pda-prop-add" onClick={addPdaRule}>+ Add Rule</button>
        </div>
      )}

      {isTM && (
        <div className="panel-field">
          <span className="panel-label">TM Rules</span>
          {(transition.tmRules ?? []).map((rule, i) => (
            <div key={i} className="pda-prop-rule" data-testid={`tm-rule-${i}`}>
              <div className="pda-prop-rule-fields">
                <input
                  ref={(el) => { tmReadRefs.current[i] = el; }}
                  type="text"
                  className="panel-input pda-prop-input"
                  defaultValue={toDisplayBlank(rule.readSymbols.join(', '), blank)}
                  onBlur={(e) => handleTmRuleChange(i, 'readSymbolsText', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="read"
                  title="Read symbols (comma-separated)"
                />
                <button
                  type="button"
                  className="prop-sym-btn"
                  onClick={() => appendBlankToTmRead(i)}
                  title={`Append blank (${blank})`}
                >{blank}</button>
                <span className="pda-prop-sep">{'→'}</span>
                <input
                  type="text"
                  className="panel-input pda-prop-input"
                  value={rule.writeSymbol ? toDisplayBlank(rule.writeSymbol, blank) : ''}
                  onChange={(e) => handleTmRuleChange(i, 'writeSymbol', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="write"
                  title="Write symbol (leave blank for no-op)"
                />
                <button
                  type="button"
                  className="prop-sym-btn"
                  onClick={() => handleTmRuleChange(i, 'writeSymbol', blank)}
                  title={`Set write to blank (${blank})`}
                >{blank}</button>
                <select
                  className="panel-select pda-prop-input"
                  value={rule.direction}
                  onChange={(e) => handleTmRuleChange(i, 'direction', e.target.value)}
                  title="Head movement"
                >
                  <option value="L">L</option>
                  <option value="S">S</option>
                  <option value="R">R</option>
                </select>
                {(transition.tmRules ?? []).length > 1 && (
                  <button
                    className="pda-prop-remove"
                    onClick={() => removeTmRule(i)}
                    title="Remove rule"
                  >{'✖'}</button>
                )}
              </div>
            </div>
          ))}
          <button className="pda-prop-add" onClick={addTmRule}>+ Add Rule</button>
        </div>
      )}

      {transition.sourceId === transition.targetId && (
        <div className="panel-field">
          <span className="panel-label panel-note">Self-loop</span>
        </div>
      )}
    </div>
  );
}
