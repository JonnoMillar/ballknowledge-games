'use client';
import { useState } from 'react';
import { MAX_LINEUP, type Settings } from '../../src/lib/slugger/match';
import Masthead from './Masthead';
import Rules from './Rules';

export interface SetupValue {
  settings: Settings;
  sides: readonly [{ name: string; lineup: readonly string[] }, { name: string; lineup: readonly string[] }];
}

const INNINGS = [3, 5, 9] as const;
const CLOCKS = [
  { value: 20, label: '20 s' },
  { value: 30, label: '30 s' },
  { value: 45, label: '45 s' },
  { value: 0, label: 'No clock' },
] as const;

/**
 * Two sides, a lineup each, how long, how quick. Then play ball.
 *
 * Home bats last, which is the advantage; the swap button is how a coin
 * toss happens at a table without a coin.
 */
export default function Setup({ value, onStart }: { value: SetupValue; onStart: (v: SetupValue) => void }) {
  const [v, setV] = useState<SetupValue>(value);

  const setSide = (i: 0 | 1, patch: Partial<{ name: string; lineup: readonly string[] }>) => {
    const sides = [...v.sides] as [SetupValue['sides'][0], SetupValue['sides'][1]];
    sides[i] = { ...sides[i], ...patch };
    setV({ ...v, sides });
  };
  const setBatter = (i: 0 | 1, j: number, name: string) => {
    const lineup = [...v.sides[i].lineup];
    lineup[j] = name;
    setSide(i, { lineup });
  };
  const addBatter = (i: 0 | 1) => {
    if (v.sides[i].lineup.length >= MAX_LINEUP) return;
    setSide(i, { lineup: [...v.sides[i].lineup, ''] });
  };
  const dropBatter = (i: 0 | 1, j: number) => {
    const lineup = v.sides[i].lineup.filter((_, k) => k !== j);
    setSide(i, { lineup: lineup.length ? lineup : [''] });
  };
  const swap = () => setV({ ...v, sides: [v.sides[1], v.sides[0]] });

  return (
    <div className="slug-shell">
      <Masthead />
      <main className="slug-main">
        <section className="slug-hero">
          <p className="slug-hero__eyebrow">Football, played as baseball</p>
          <h1 className="slug-hero__head display">Fancy a game?</h1>
          <p className="slug-hero__lede">
            The pitcher throws a club. The batter names someone who played for it. Throw Barcelona and they&rsquo;ll
            hit it, but it&rsquo;s only a single. Throw Bolton and it&rsquo;s a strikeout — or a home run.
          </p>
        </section>

        <form
          className="slug-setup"
          onSubmit={(e) => { e.preventDefault(); onStart(v); }}
        >
          <div className="slug-setup__sides">
            {([0, 1] as const).map((i) => (
              <fieldset key={i} className="slug-side">
                <legend className="slug-side__tag display">{i === 0 ? 'Away · bats first' : 'Home · bats last'}</legend>
                <input
                  className="slug-input slug-input--name display"
                  value={v.sides[i].name}
                  maxLength={18}
                  onChange={(e) => setSide(i, { name: e.target.value })}
                  aria-label={`${i === 0 ? 'Away' : 'Home'} side name`}
                />
                <div className="slug-lineup">
                  {v.sides[i].lineup.map((b, j) => (
                    <div key={j} className="slug-lineup__row">
                      <span className="slug-lineup__num display">{j + 1}</span>
                      <input
                        className="slug-input"
                        placeholder={j === 0 ? 'Batter (optional)' : 'Batter'}
                        value={b}
                        maxLength={18}
                        onChange={(e) => setBatter(i, j, e.target.value)}
                        aria-label={`${v.sides[i].name} batter ${j + 1}`}
                      />
                      {v.sides[i].lineup.length > 1 ? (
                        <button type="button" className="slug-x" onClick={() => dropBatter(i, j)} aria-label="Remove batter">×</button>
                      ) : null}
                    </div>
                  ))}
                  {v.sides[i].lineup.length < MAX_LINEUP ? (
                    <button type="button" className="slug-link" onClick={() => addBatter(i)}>+ Add a batter</button>
                  ) : null}
                </div>
              </fieldset>
            ))}
          </div>
          <button type="button" className="slug-link slug-setup__swap" onClick={swap}>⇄ Swap home and away</button>

          <div className="slug-setup__opts">
            <div className="slug-opt">
              <span className="slug-opt__label">Innings</span>
              <div className="slug-seg" role="radiogroup" aria-label="Innings">
                {INNINGS.map((n) => (
                  <button
                    type="button" key={n} role="radio" aria-checked={v.settings.innings === n}
                    className={`slug-seg__btn display${v.settings.innings === n ? ' is-on' : ''}`}
                    onClick={() => setV({ ...v, settings: { ...v.settings, innings: n } })}
                  >{n}</button>
                ))}
              </div>
              <span className="slug-opt__hint">{v.settings.innings === 3 ? 'About ten minutes.' : v.settings.innings === 5 ? 'A quarter of an hour.' : 'The full nine. Half an hour.'}</span>
            </div>
            <div className="slug-opt">
              <span className="slug-opt__label">Shot clock</span>
              <div className="slug-seg" role="radiogroup" aria-label="Shot clock">
                {CLOCKS.map((c) => (
                  <button
                    type="button" key={c.value} role="radio" aria-checked={v.settings.clock === c.value}
                    className={`slug-seg__btn${v.settings.clock === c.value ? ' is-on' : ''}`}
                    onClick={() => setV({ ...v, settings: { ...v.settings, clock: c.value } })}
                  >{c.label}</button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="slug-btn slug-btn--primary slug-setup__go display">Play ball</button>
        </form>

        <Rules />
      </main>
    </div>
  );
}
