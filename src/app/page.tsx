import TreeCanvas from '@/components/TreeCanvas';

export const metadata = {
  title: 'Ancestree | Interactive Family Tree',
  description: 'A beautiful, local-first interactive family tree application.',
};

export default function Home() {
  return (
    <main className="w-screen h-screen m-0 p-0 overflow-hidden bg-[#0B0F19]">
      <TreeCanvas />
    </main>
  );
}
