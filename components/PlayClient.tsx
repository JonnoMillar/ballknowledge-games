'use client';
import { useEffect, useState } from 'react';
import Chain from './Chain';
import type { BoardProps } from '../src/lib/chain/client';
import type { SealResponse } from '../src/lib/chain/client';
import { dayNumber, dayOfBoard, localDate } from '../src/lib/daily';
import { readProgress, recordPlay, streakOf, type Play } from '../src/lib/progress';
import { MARK_GLYPH, plateMarks } from '../src/lib/chain/share';

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

  useEffect(() => {
    const today = dayNumber(localDate());
    const d = dayOfBoard(board.puzzle.id, dailyIds, today);
    setDay(d);
    const progress = readProgress();
    setPlayed(progress.plays[board.puzzle.id] ?? null);
    setStreak(streakOf(progress, today).current);
  }, [board.puzzle.id, dailyIds]);

  const isToday = day !== null && day === dayNumber(localDate());
  const title = day !== null ? `Chain #${day}` : `Chain ${board.puzzle.id}`;

  function onSealed(sealed: SealResponse, hinted: number[]) {
    const r = sealed.result;
    const today = dayNumber(localDate());
    const progress = recordPlay(board.puzzle.id, {
      day: isToday ? day : null,
      held: r.perfect,
      links: [...r.links],
      plates: plateMarks(r.slots, hinted),
      date: localDate(),
    });
    setStreak(streakOf(progress, today).current);
  }

  const notice = played ? (
    <p className="replay">
      You have played this one: {(played.plates ?? []).map((m) => MARK_GLYPH[m]).join('')}. Another go is free, and your first one is the one that counts.
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
      />
    </>
  );
}
