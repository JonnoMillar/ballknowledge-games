'use client';
import { useEffect, useState } from 'react';
import Chain from './Chain';
import type { BoardProps } from '../src/lib/chain/client';
import type { SealResponse } from '../src/lib/chain/client';
import { dayNumber, dayOfBoard, localDate } from '../src/lib/daily';
import { readProgress, recordPlay, streakOf, type Play } from '../src/lib/progress';
import { MARK_GLYPH, plateMarks } from '../src/lib/chain/share';
import { neighboursOf } from '../src/lib/chain/score';
import { recordCards, type Card, type CardNews } from '../src/lib/collection';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * The board, with a memory.
 *
 * Works out whether this board is (or was) a daily from the player's own
 * date, reads the streak, and writes the play when the board is sealed.
 * The first seal of a board counts; playing it again changes nothing.
 */
export default function PlayClient({ board, dailyIds }: { board: BoardProps; dailyIds: string[] }) {
  const [day, setDay] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [played, setPlayed] = useState<Play | null>(null);
  const [cardNews, setCardNews] = useState<Record<string, CardNews>>({});
  const deep = board.puzzle.deep ?? false;

  useEffect(() => {
    const today = dayNumber(localDate());
    const d = dayOfBoard(board.puzzle.id, dailyIds, today);
    setDay(d);
    const progress = readProgress();
    setPlayed(progress.plays[board.puzzle.id] ?? null);
    setStreak(streakOf(progress, today).current);
  }, [board.puzzle.id, dailyIds]);

  const isToday = day !== null && day === dayNumber(localDate());
  const title = deep ? `Deep Cuts ${board.puzzle.id}` : day !== null ? `Chain #${day}` : `Chain ${board.puzzle.id}`;

  function onSealed(sealed: SealResponse, hinted: number[], images: Record<string, PortraitImage>) {
    const r = sealed.result;
    // Only the first seal collects. A replay comes after the wall has shown
    // the Grail on each plate, so a card from it would be a card for reading.
    const first = !readProgress().plays[board.puzzle.id];
    if (deep && first) {
      // Every pick that held is a card: its grade, and the clubs it linked through.
      const names = new Map(sealed.players.map((p) => [p.id, p.name]));
      const cards: Card[] = r.slots.flatMap((s) => {
        if (!s.grade || !s.playerId) return [];
        const clubs = neighboursOf(s.index, board.puzzle.slots.length, board.puzzle.closed ?? false)
          .map(({ link }) => sealed.links[link])
          .map((l) => l?.required ?? l?.clubs[0])
          .filter((c): c is string => Boolean(c));
        return [{
          id: s.playerId, name: names.get(s.playerId) ?? s.playerId, grade: s.grade, board: board.puzzle.id,
          via: clubs.map((c) => sealed.clubs[c]?.name ?? c), clubs, date: localDate(), ...(images[s.playerId] ? { image: images[s.playerId] } : {}),
        }];
      });
      setCardNews(recordCards(cards));
    }
    const today = dayNumber(localDate());
    const progress = recordPlay(board.puzzle.id, {
      day: isToday ? day : null,
      held: r.perfect,
      links: [...r.links],
      plates: plateMarks(r.slots, hinted),
      grades: r.slots.map((s) => s.grade),
      date: localDate(),
    });
    setStreak(streakOf(progress, today).current);
  }

  const notice = played ? (
    <p className="replay">
      You have played this one: {(played.plates ?? []).map((m) => MARK_GLYPH[m]).join('')}. Another go is free, and your first one is the one that counts{deep ? ', and the only one that collects cards' : ''}.
    </p>
  ) : null;

  return (
    <>
      <Chain
        notice={notice}
        puzzle={board.puzzle}
        givens={board.givens}
        images={board.images}
        clubs={board.clubs}
        title={title}
        streak={isToday ? streak : null}
        onSealed={onSealed}
        cardNews={cardNews}
        collects={!played}
      />
    </>
  );
}
