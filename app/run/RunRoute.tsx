'use client';
import Run from '../../components/run/Run';
import SpoofedRunTask from '../../games/itk/run/RunTask';
import StepRunTask from '../../games/step/run/RunTask';
import PinRunTask from '../../games/pin/run/RunTask';
import MoleRunTask from '../../games/bluff/run/RunTask';
import OrderRunTask from '../../games/tunnel/run/RunTask';
import SeasonRunTask from '../../games/season-line/run/RunTask';

/**
 * Where the games meet: each game's RunTask handed to the shared shell. A
 * client module, because components cannot cross from the server as props.
 */
export default function RunRoute() {
  return <Run tasks={{ spoofed: SpoofedRunTask, step: StepRunTask, pin: PinRunTask, mole: MoleRunTask, order: OrderRunTask, season: SeasonRunTask }} />;
}
