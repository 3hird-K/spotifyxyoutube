import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Music, Disc3, Radio } from "lucide-react";
import { useState, useEffect } from "react";

const musicLoaderVariants = cva(
  "relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl",
  {
    variants: {
      variant: {
        wave: "flex-col gap-6 p-8",
        circular: "w-48 h-48",
      },
      size: {
        sm: "gap-4 p-6",
        md: "",
        lg: "gap-8 p-10",
      },
    },
    compoundVariants: [
      {
        variant: "circular",
        size: "sm",
        className: "w-36 h-36",
      },
      {
        variant: "circular",
        size: "lg",
        className: "w-64 h-64",
      },
    ],
    defaultVariants: {
      variant: "wave",
      size: "md",
    },
  }
);

interface MusicLoaderProps extends VariantProps<typeof musicLoaderVariants> {
  className?: string;
  trackName?: string;
  artistName?: string;
  showTrackInfo?: boolean;
  cycleTracks?: boolean;
}

const sampleTracks = [
  { name: "Electric Dreams", artist: "Synthwave Master" },
  { name: "Midnight City", artist: "Luna Echo" },
  { name: "Neon Lights", artist: "Cyber Punk" },
  { name: "Digital Love", artist: "Retro Future" },
  { name: "Starlight", artist: "Cosmic Drifter" },
];

export function MusicLoader({
  variant = "wave",
  size = "md",
  className,
  trackName: initialTrackName = "Loading...",
  artistName: initialArtistName,
  showTrackInfo = true,
  cycleTracks = false,
}: MusicLoaderProps) {
  const [trackInfo, setTrackInfo] = useState({
    name: initialTrackName,
    artist: initialArtistName ?? "Unknown Artist",
  });
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Cycle through sample tracks (optional)
  useEffect(() => {
    if (!cycleTracks) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % sampleTracks.length;
      const track = sampleTracks[index];
      setTrackInfo({ name: track.name, artist: track.artist });
    }, 4000);

    return () => clearInterval(interval);
  }, [cycleTracks]);

  // Handle ripple effect
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  if (variant === "circular") {
    return (
      <div
        className={cn(musicLoaderVariants({ variant, size, className }))}
        onClick={handleClick}
        aria-label="Loading music"
      >
        {/* Concentric circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Disc3 className="absolute text-cyan-400/20" size={180} strokeWidth={1.5} />
          <Radio className="absolute text-emerald-400/20" size={140} strokeWidth={1.5} />
          <Music className="absolute text-cyan-400/20" size={100} strokeWidth={1.5} />
        </div>
        
        {/* Spinning borders */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin shadow-lg shadow-cyan-500/20" />
        <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin [animation-duration:1.5s] [animation-direction:reverse] shadow-lg shadow-emerald-500/20" />
        <div className="absolute inset-8 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin [animation-duration:1s] shadow-lg shadow-cyan-500/20" />

        {/* Center icon */}
        <Music className="text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" size={48} />

        {/* Loading text */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium tracking-wider animate-pulse whitespace-nowrap">
          LOADING
        </div>

        {/* Ripples */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="pointer-events-none absolute rounded-full bg-cyan-400/30 animate-[ripple_0.6s_linear]"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: "20px",
              height: "20px",
              transform: "translate(-50%, -50%) scale(0)",
            }}
          />
        ))}
      </div>
    );
  }

  // Wave variant
  return (
    <div
      className={cn(musicLoaderVariants({ variant, size, className }))}
      onClick={handleClick}
      aria-label="Loading music"
    >
      {/* Floating music notes */}
      <Music
        className="absolute top-5 left-5 text-cyan-400/70 animate-[float_3s_ease-in-out_infinite] opacity-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
        size={24}
      />
      <Radio
        className="absolute top-10 right-8 text-emerald-400/70 animate-[float_3s_ease-in-out_infinite] [animation-delay:1s] opacity-0 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"
        size={28}
      />
      <Disc3
        className="absolute bottom-8 left-10 text-cyan-400/70 animate-[float_3s_ease-in-out_infinite] [animation-delay:2s] opacity-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
        size={22}
      />

      {/* Wave bars */}
      <div className="flex items-end gap-2 h-16">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-2 rounded-full bg-gradient-to-t from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-wave"
            style={{
              height: [20, 35, 50, 40, 30, 45, 35, 25][i] + "px",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Loading text */}
      <div className="text-white/80 text-lg font-medium tracking-wider animate-pulse">
        LOADING TRACK
      </div>

      {/* Track info */}
      {showTrackInfo && (
        <div className="text-center mt-2">
          <div className="text-white font-semibold">{trackInfo.name}</div>
          <div className="text-white/60 text-sm">{trackInfo.artist}</div>
        </div>
      )}

      {/* Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-cyan-400/30 animate-[ripple_0.6s_linear]"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: "20px",
            height: "20px",
            transform: "translate(-50%, -50%) scale(0)",
          }}
        />
      ))}
    </div>
  );
}