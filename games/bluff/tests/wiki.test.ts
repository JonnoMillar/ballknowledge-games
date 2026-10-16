import { describe, expect, it } from 'vitest';
import { parseDate, parseMatches } from '../lib/wiki';
import { bucketsFor, formation, toLines } from '../lib/lineup';
import sides from '../data/sides.json';
import type { Side } from '../lib/types';

/** Trimmed from the 2022 World Cup final and a stage page: both box styles, a multi-line footnote, `{{abbr}}` codes. */
const rows = (codes: string[], names: string[]) => codes.map((c, i) => `|-\n|${c} ||'''${i + 1}'''||{{flagicon|XXX}} [[${names[i]}]]`).join('\n');
const A = ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RF', 'CF', 'LF'];
const page = `
==Final==
{{#invoke:football box|main
|date={{Start date|2022|12|18}}
|team1={{#invoke:flag|fb-rt|ARG}}
|score={{score link|2022 FIFA World Cup final|3–3}}
|team2={{#invoke:flag|fb|FRA}}
}}
{| width=92%
|{{Football kit
 |title      = Argentina
}}
|{{Football kit
 |title      = {{nowrap|France}}<ref name="x"/>
}}
|}
{| width="100%"
{| style="font-size:90%"
${rows(A, ['Emiliano Martínez', 'Nahuel Molina', 'Cristian Romero (footballer, born 1998)|Cristian Romero', 'Nicolás Otamendi', 'Nicolás Tagliafico', 'Enzo Fernández', 'Alexis Mac Allister', 'Rodrigo De Paul', 'Lionel Messi', 'Julián Alvarez', 'Ángel Di María'])}
|-
|colspan=3|'''Substitutions:'''
|-
|MF ||'''8''' ||[[Marcos Acuña]]
|}
{| style="font-size:90%"
|-
|GK ||'''1''' ||[[Hugo Lloris]]
|-
|RB ||'''5''' ||[[Jules Koundé]]
|-
|CB ||'''4''' ||[[Raphaël Varane]]
|-
|CB ||'''18'''||[[Dayot Upamecano]]
|-
|LB ||'''22'''||[[Théo Hernandez]]
|-
|CM ||'''14'''||[[Adrien Rabiot]] || {{suboff|96}}{{refn|group=note|Rabiot was hurt.
His substitution came later.}}
|-
|CM ||'''8''' ||[[Aurélien Tchouaméni]]
|-
|{{abbr|RW|Right winger}} ||'''7''' ||[[Antoine Griezmann]]
|-
|AM ||'''11'''||[[Ousmane Dembélé]]
|-
|LW ||'''10'''||{{nowrap|{{flagicon|FRA}} [[Kylian Mbappé]] ([[Captain (association football)|c]])}}
|-
|CF ||'''9''' ||[[Olivier Giroud]]
|-
|colspan=3|'''Substitutions:'''
|}
|}
===Brazil vs Chile===
{{Football box
|date=28 June 2014
|team1={{fb-rt|BRA}}
|score=1–1
|team2={{fb|CHI}}
}}
`;

describe('reading a page', () => {
  const [m] = parseMatches(page);

  it('reads the box: date, score, the sides from the kits', () => {
    expect(m).toMatchObject({ stage: 'Final', date: '2022-12-18', team1: 'Argentina', team2: 'France', score: '3–3' });
  });

  it('reads both XIs past a multi-line footnote, abbr codes and a nowrap', () => {
    expect(m!.xis[0]!.map((p) => p.text)).toContain('Cristian Romero');
    expect(m!.xis[0]![2]!.title).toBe('Cristian Romero (footballer, born 1998)');
    expect(m!.xis[1]!.map((p) => p.pos)).toEqual(['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'AM', 'LW', 'CF']);
    expect(m!.xis[1]![9]!.title).toBe('Kylian Mbappé');
  });

  it('skips a box with no lineups', () => {
    expect(parseMatches(page)).toHaveLength(1);
  });

  it('reads dates in each style', () => {
    expect(parseDate('{{Start date|2005|5|25|df=y}}')).toBe('2005-05-25');
    expect(parseDate('28 June 2014')).toBe('2014-06-28');
    expect(parseDate('June 28, 2014')).toBe('2014-06-28');
  });
});

describe('lines on the pitch', () => {
  const xi = (codes: string[]) => codes.map((pos, i) => ({ pos, player: i }));

  it('puts wingers with an attacking midfielder, else up front', () => {
    expect(formation(toLines(xi(['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'AM', 'LW', 'CF']))!)).toBe('4-2-3-1');
    expect(formation(toLines(xi(['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RW', 'CF', 'LW']))!)).toBe('4-1-2-3');
  });

  it('puts wing-backs in midfield behind a back three', () => {
    expect(formation(toLines(xi(['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'LWB', 'AM', 'CF', 'CF']))!)).toBe('3-4-1-2');
  });

  it('draws left on the left', () => {
    const lines = toLines([{ pos: 'GK', player: 'gk' }, ...['RB', 'CB', 'CB', 'LB', 'RM', 'LM', 'CM', 'CM', 'CF', 'CF'].map((pos) => ({ pos, player: pos }))])!;
    expect(lines[1]!.map((p) => p.pos)).toEqual(['LB', 'CB', 'CB', 'RB']);
    expect(lines[2]!.map((p) => p.pos)).toEqual(['LM', 'CM', 'CM', 'RM']);
  });

  it('refuses an XI without exactly one keeper or with unknown codes', () => {
    expect(toLines(xi(['CB', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'AM', 'LW', 'CF']))).toBeNull();
    expect(toLines(xi(['GK', 'XX', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'AM', 'LW', 'CF']))).toBeNull();
  });

  it('maps slots to pool positions', () => {
    expect(bucketsFor('RW')).toEqual(['MID', 'FWD']);
    expect(bucketsFor('CB')).toEqual(['DEF']);
  });
});

describe('the shipped sides', () => {
  const all = sides as Side[];

  it('are all eleven, one keeper, unique keys, from 1995', () => {
    expect(all.length).toBeGreaterThan(300);
    expect(new Set(all.map((s) => s.key)).size).toBe(all.length);
    for (const s of all) {
      expect(s.lines.flat()).toHaveLength(11);
      expect(s.lines[0]!.map((p) => p.pos)).toEqual(['GK']);
      expect(+s.date.slice(0, 4)).toBeGreaterThanOrEqual(1995);
    }
  });

  it('carry nothing that would mark the fake: names and positions only', () => {
    for (const s of all) for (const p of s.lines.flat()) expect(Object.keys(p).sort()).toEqual(['id', 'name', 'pos']);
  });
});
