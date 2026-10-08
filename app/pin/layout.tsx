import type { ReactNode } from 'react';
import '../../games/pin/pin.css';

export const metadata = {
  title: 'Pitch pin',
  description: 'Six famous goals. Pin where each was struck from.',
};

export default function PinLayout({ children }: { children: ReactNode }) {
  return children;
}
