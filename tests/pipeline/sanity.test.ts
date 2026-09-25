import { describe, it, expect } from 'vitest';
import { suspiciousName } from '../../src/pipeline/sanity';

describe('suspiciousName', () => {
  it('flags the live vandalism found in the pool', () => {
    expect(suspiciousName('Guido Carrillo EL GOAT')).not.toBeNull();
  });

  it('flags meme words and shouting', () => {
    expect(suspiciousName('Some Player LEGEND')).not.toBeNull();
    expect(suspiciousName('Player!!!')).not.toBeNull();
    expect(suspiciousName('Player 123')).not.toBeNull();
  });

  it('does NOT flag ordinary football names', () => {
    const legit = [
      'Kylian Mbappé', 'David Beckham', 'Vinícius Júnior', 'Ronaldinho',
      'Kaká', 'Hulk', 'Pelé', 'Zé Roberto', 'Son Heung-min', 'Martin Ødegaard',
      'Erling Haaland', 'Rodrigo Hernández', "N'Golo Kanté", 'Xabi Alonso',
      'Andy Townsend', 'Shefki Kuqi', 'Aki Riihilahti', 'Jobi McAnuff',
      'Peter van Vossen', 'Giorgi Demetradze', 'Jean-Pierre Papin',
    ];
    for (const name of legit) {
      expect(suspiciousName(name), `false positive on "${name}"`).toBeNull();
    }
  });

  it('flags a Latin name with a Greek or Cyrillic lookalike letter in it', () => {
    // Live in the pool until 2026-09-25: "Αrda Güler" with a Greek capital
    // alpha, which reads correctly and makes "Arda" find nothing.
    expect(suspiciousName('Αrda Güler')).toBe('mixed-script');
    expect(suspiciousName('Mesut Оzil')).toBe('mixed-script');
  });

  it('does not flag legitimate short uppercase particles', () => {
    // Roman numerals and initials appear in real names.
    expect(suspiciousName('Vitor Silva')).toBeNull();
  });
});

describe('suspiciousName — false-positive regressions', () => {
  it('does not flag real surnames that double as praise words', () => {
    // All five are real players in the pool. George Best is the cautionary case.
    for (const n of ['Ledley King', 'Joshua King', 'Andy King', 'Joel King',
                     'Leon Best', 'George Best']) {
      expect(suspiciousName(n), `false positive on "${n}"`).toBeNull();
    }
  });

  it('still catches digit-substitution defacement', () => {
    // Found live in the pool: a zero standing in for the letter o.
    expect(suspiciousName('João Moutinh0')).toBe('digits');
    expect(suspiciousName('Robert0 Arboleda')).toBe('digits');
  });

  it('still catches the shouting case', () => {
    expect(suspiciousName('Guido Carrillo EL GOAT')).not.toBeNull();
  });
});
