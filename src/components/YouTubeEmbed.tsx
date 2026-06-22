import { useState } from 'react';

export default function YouTubeEmbed({ ytId }: { ytId: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-black">
      {playing ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button className="group relative h-full w-full" onClick={() => setPlaying(true)} aria-label="Play tutorial">
          <img
            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
            alt="Tutorial thumbnail"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <svg viewBox="0 0 68 48" className="h-14 w-20">
              <path
                d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                fill="#ff0000"
              />
              <path d="M 45,24 27,14 27,34" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
