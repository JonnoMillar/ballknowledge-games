import { describe, it, expect } from 'vitest';
import { parseInfoboxPosition, positionClasses } from '../../scripts/fetch-careers';

describe('infobox position', () => {
  it('reads link labels, not targets', () => {
    expect(positionClasses('[[Midfielder#Attacking midfielder|Attacking midfielder]], [[Winger (association football)|winger]]'))
      .toEqual(['MID', 'FWD']);
    expect(positionClasses('[[Midfielder#Wide midfielder|Winger]]')).toEqual(['FWD']);
  });

  it('keeps midfield roles out of defence and attack', () => {
    expect(positionClasses('[[Midfielder#Defensive midfielder|Defensive midfielder]]')).toEqual(['MID']);
    expect(positionClasses('[[Half-back (association football)|Wing half]]')).toEqual(['MID']);
    expect(positionClasses('[[Defender (association football)#Full-back|Left-back]]')).toEqual(['DEF']);
    expect(positionClasses('[[Goalkeeper (association football)|Goalkeeper]]')).toEqual(['GK']);
    expect(positionClasses('[[Forward (association football)#Centre-forward|Striker]]')).toEqual(['FWD']);
  });

  it('finds the row inside an infobox, ignoring refs and comments', () => {
    const text = `{{Infobox football biography
| name = Pedri
| height = 1.74 m<ref>{{cite web|title=x}}</ref>
| position = [[Midfielder]]<!-- central -->
| currentclub = [[FC Barcelona|Barcelona]]
}}`;
    expect(parseInfoboxPosition(text)).toEqual(['MID']);
    expect(parseInfoboxPosition('{{Infobox football biography\n| name = X\n}}')).toEqual([]);
  });
});
