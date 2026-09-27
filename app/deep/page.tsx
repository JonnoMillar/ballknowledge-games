import DeepIndex from '../../components/DeepIndex';
import { listBoards } from '../../src/server/board';

export const metadata = { title: 'Deep Cuts · Chain' };

/** The Deep Cuts boards. What has been played is read in the browser. */
export default async function DeepPage() {
  const boards = (await listBoards()).filter((b) => b.deep);
  return <DeepIndex boards={boards} />;
}
