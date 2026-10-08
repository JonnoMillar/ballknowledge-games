import Itk from '../../components/itk/Itk';
import { loadItkSets } from '../../src/server/itk';
import './itk.css';

export const metadata = {
  title: 'ITK',
  description: 'Five careers. One move in each never happened. Find it.',
};

/** ITK, prototype: the example sets, for critique before the generator is written. */
export default async function ItkPage() {
  const sets = await loadItkSets();
  return <Itk sets={sets} />;
}
