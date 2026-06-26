import { useEffect, useState } from 'react';
import { slugify } from '../lib/muscleMap';

export default function ExerciseDemoLoop({ name }: { name: string }) {
  const slug = slugify(name);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFrame(0);
    setFailed(false);
    const interval = setInterval(() => setFrame((f) => 1 - f), 700);
    return () => clearInterval(interval);
  }, [name]);

  if (failed) return null;

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl bg-surface2">
      <img
        src={`${import.meta.env.BASE_URL}img/exercises/${slug}-${frame}.jpg`}
        alt={`${name} demo`}
        className="max-h-80 w-full object-contain bg-black"
        onError={() => setFailed(true)}
      />
      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-bg">
        Demo Loop
      </span>
    </div>
  );
}
