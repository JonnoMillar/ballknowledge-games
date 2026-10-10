import Library from '../../games/pin/components/Library';
import { library } from '../../games/pin/server';

/** The library. Rendered per request, so New is always current. */
export const dynamic = 'force-dynamic';

export default function PinLibrary() {
  return <Library shelves={library()} />;
}
