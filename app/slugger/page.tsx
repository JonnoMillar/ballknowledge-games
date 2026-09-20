import Slugger from '../../components/slugger/Slugger';
import './slugger.css';

export const metadata = {
  title: 'Slugger',
  description: 'Football, played as baseball. The pitcher throws a club; the batter names someone who played for it.',
};

/**
 * Slugger. Everything happens in the browser and against two small routes;
 * the page ships nothing of the pool.
 */
export default function SluggerPage() {
  return <Slugger />;
}
