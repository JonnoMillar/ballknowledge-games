import { creditsFor } from '../../src/server/credits';
import Back from '../../components/Back';

export const metadata = { title: 'Credits · Chain' };

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

export default async function Credits({ searchParams }: { searchParams: Promise<{ l?: string }> }) {
  const asked = ((await searchParams).l ?? 'A').toUpperCase();
  const letter = LETTERS.includes(asked) ? asked : 'A';
  const { rows, counts, total } = await creditsFor(letter);

  return (
    <div className="app">
      <header className="masthead">
        <Back href="/" label="All games" />
        <a className="masthead__brand display" href="/chain">Chain</a>
        <div className="masthead__meta">Credits</div>
      </header>

      <main className="home credits">
        <section className="page credits__page">
          <h1 className="home__head display">Credits</h1>
          <p>
            Chain, Rondo, Slugger, Pitch pin and Odd Man Out are an unofficial fan project. They are not affiliated with or
            endorsed by any club, league or player.
          </p>

          <h2 className="credits__head display">Data</h2>
          <p>
            Players, clubs, nationalities and fame come from <a href="https://www.wikidata.org/">Wikidata</a>,
            released under <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Careers are
            completed from the infoboxes of the <a href="https://en.wikipedia.org/">English Wikipedia</a>, whose
            text is available under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.
          </p>
          <p>
            <img src="/credits/statsbomb.png" alt="StatsBomb" height={16} />{' '}
            Shot locations and expected goals in Pitch pin come from{' '}
            <a href="https://github.com/statsbomb/open-data">StatsBomb open data</a> for the classics and from{' '}
            <a href="https://understat.com/">Understat</a> for Premier League goals. The Goal of the Month
            shortlists are the <a href="https://www.premierleague.com/">Premier League</a>’s; past winners are
            from the <a href="https://en.wikipedia.org/wiki/Premier_League_Goal_of_the_Month">English Wikipedia</a>{' '}
            (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). Only the goals in a pack are used.
          </p>

          <p>
            The team sheets in Odd Man Out are read from the match reports of the{' '}
            <a href="https://en.wikipedia.org/">English Wikipedia</a> (finals, and World Cup and Euro knockout
            games), whose text is available under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.
          </p>

          <h2 className="credits__head display">Card cases</h2>
          <p>
            The sapphire and onyx textures on graded cards were generated for Chain with
            {' '}<a href="https://higgsfield.ai/">Higgsfield</a>. They are not photographs of real stones.
            The result art in Spoofed (the mascot, scarf, microphone, seat, briefcase and contract) was made
            with Higgsfield too, as were the game icons on the front page.
          </p>

          <h2 className="credits__head display">Club crests</h2>
          <p>
            Crests are trademarks of their clubs, shown as they are, only to identify the club. They are taken
            from <a href="https://commons.wikimedia.org/">Wikimedia Commons</a> and the English Wikipedia.
          </p>

          <h2 className="credits__head display">Player photos</h2>
          <p>
            {total.toLocaleString('en-GB')} photos from Wikimedia Commons, each under the licence its author
            chose. Every one is listed below with its author and licence; the file link has the full details.
          </p>

          <nav className="credits__letters" aria-label="Players by letter">
            {LETTERS.map((l) => counts[l] ? (
              <a key={l} href={`/credits?l=${encodeURIComponent(l)}`} aria-current={l === letter ? 'page' : undefined}>{l}</a>
            ) : (
              <span key={l} aria-hidden="true">{l}</span>
            ))}
          </nav>

          <table className="credits__table">
            <thead>
              <tr><th scope="col">Player</th><th scope="col">Photo by</th><th scope="col">Licence</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.player}|${r.file}`}>
                  <td><a href={commonsPage(r.file)}>{r.player}</a></td>
                  <td>{r.artist}</td>
                  <td>{r.licenceUrl ? <a href={r.licenceUrl}>{r.licence}</a> : r.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
