import type { ClubView } from '../clubs';
import type { Carrier } from './match';
import type { LossReason } from './rules';

/** What a judged pass sends back. On a loss, what was open is the reveal. */
export type PassResponse =
  | { ok: true; via: string[]; burnt: string[]; carrier: Carrier; clubs: Record<string, ClubView> }
  | { ok: false; reason: LossReason; open: string[]; via?: string[]; target?: Carrier; clubs: Record<string, ClubView> };
