import { redirect } from 'next/navigation';

/** The archive lives on the lobby now. */
export default function ArchivePage() {
  redirect('/spoofed');
}
