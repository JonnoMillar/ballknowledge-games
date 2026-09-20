'use client';

/** How to play, as the page states it. Four rules and the grades. */
export default function Rules() {
  return (
    <section className="slug-rules">
      <h2 className="slug-rules__head display">How it works</h2>
      <ol className="slug-rules__list">
        <li><b>The pitcher picks a pitch</b> — a club. The batter names a player who played for it.</li>
        <li><b>A hit is graded by how deep the cut is.</b> Single, double, triple, home run. Runners move that many bases; cross home to score.</li>
        <li><b>Never played there? Strike.</b> Three strikes, you&rsquo;re out. Three outs, the other side bats. No name twice in a match — that&rsquo;s a foul ball.</li>
        <li><b>Three innings, most runs wins.</b> Tied at the end, play on till it isn&rsquo;t.</li>
      </ol>
      <div className="slug-rules__grades">
        <div className="slug-grade"><span className="slug-grade__tag display">Fastball</span><span>A giant. It&rsquo;ll get hit — the question is how far.</span></div>
        <div className="slug-grade"><span className="slug-grade__tag display">Curveball</span><span>A club with a shelf of names. Doubles, mostly.</span></div>
        <div className="slug-grade"><span className="slug-grade__tag display">Knuckleball</span><span>A small club. A strikeout, or a triple that hangs there.</span></div>
      </div>
      <p className="slug-rules__note">
        The umpire is an album of 11,741 players with careers from 1992 on. If a name isn&rsquo;t in it, it can&rsquo;t be ruled on — pick another.
      </p>
    </section>
  );
}
