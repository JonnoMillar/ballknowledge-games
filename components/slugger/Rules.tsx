'use client';

/** How to play, as the page states it. Four rules and the pitches. */
export default function Rules() {
  return (
    <section className="slug-rules">
      <h2 className="slug-rules__head display">How it works</h2>
      <ol className="slug-rules__list">
        <li><b>The pitcher picks a pitch</b> — a club. The batter names a player who played for it. One swing: a hit, or an out.</li>
        <li><b>A hit is worth what the pitch was worth.</b> Fastball single, curveball double, slider triple, knuckleball home run. Runners move up; anyone on second or third comes home.</li>
        <li><b>Three batters a half.</b> Then the other side bats, and anyone left on base is stranded. No name twice in a match — that&rsquo;s a foul, swing again.</li>
        <li><b>Three innings, most runs wins.</b> Tied at the end, play on till it isn&rsquo;t.</li>
      </ol>
      <div className="slug-rules__grades">
        <div className="slug-grade"><span className="slug-grade__tag display">Fastball</span><span>A giant. They&rsquo;ll hit it — but it&rsquo;s only a single.</span></div>
        <div className="slug-grade"><span className="slug-grade__tag display">Curveball</span><span>A club with a shelf of names. A double.</span></div>
        <div className="slug-grade"><span className="slug-grade__tag display">Slider</span><span>A club you have to think about. A triple.</span></div>
        <div className="slug-grade"><span className="slug-grade__tag display">Knuckleball</span><span>A small club. Miss it, out; hit it, home run. Three a game — spend them well.</span></div>
      </div>
      <p className="slug-rules__note">
        The umpire is an album of 11,741 players with careers from 1992 on. If a name isn&rsquo;t in it, it can&rsquo;t be ruled on — pick another.
      </p>
    </section>
  );
}
