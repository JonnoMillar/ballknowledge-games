import type { CSSProperties } from 'react';
import { TIERS } from '../lib/score';

/** The five tiers as one bar, each as wide as its band of scores, with a marker at a score when given. */
export default function Scale({ score }: { score?: number }) {
  const widths = TIERS.map((t, i) => (TIERS[i + 1]?.floor ?? 100) - t.floor);
  const cols = { gridTemplateColumns: widths.map((w) => `${w}fr`).join(' ') };
  return (
    <div className="pin__scale">
      <div className="pin__scalebar" style={cols} aria-hidden>
        {TIERS.map((t) => <span key={t.tier} className={`pin__seg pin__seg--${t.tier}`} />)}
        {score === undefined ? null : <span className="pin__marker" style={{ '--at': `${score}%` } as CSSProperties} />}
      </div>
      <div className="pin__scalenames display" style={cols}>
        {TIERS.map((t) => <span key={t.tier}>{t.name}</span>)}
      </div>
    </div>
  );
}
