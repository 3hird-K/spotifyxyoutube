import { cn } from "../utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Music, Disc3, Radio } from "lucide-react";
import { useState, useEffect } from "react";

const musicLoaderVariants = cva("relative flex items-center justify-center", {
  variants: {
    variant: {
      wave: "flex-col gap-6",
      circular: "w-48 h-48",
    },
    size: {
      sm: "gap-4",
      md: "",
      lg: "gap-8",
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
});

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

export function MusicLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Deep Spotify-style black */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Subtle dark overlay (gives depth, NOT blur-heavy) */}
      <div className="absolute inset-0 bg-black/60" />

      {/* VERY subtle green ambient glow (Spotify feel) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.06),transparent_70%)]" />

      <FullscreenLoader variant="circular" size="lg" />
    </div>
  );
}

export function FullscreenLoader({
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

  const [trackIndex, setTrackIndex] = useState(0);

  useEffect(() => {
    if (!cycleTracks) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % sampleTracks.length;
      const track = sampleTracks[index];
      setTrackInfo({ name: track.name, artist: track.artist });
      setTrackIndex(index);
    }, 4000);

    return () => clearInterval(interval);
  }, [cycleTracks]);

  if (variant === "circular") {
    return (
      <div
        className={cn(musicLoaderVariants({ variant, size, className }))}
        aria-label="Loading music"
      >
        {/* Background icons (SUBTLE Spotify green, no neon) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Disc3
            className="absolute text-[#1DB954]/10 animate-[breathe_3s_ease-in-out_infinite]"
            size={180}
            strokeWidth={1}
          />
          <Radio
            className="absolute text-[#1DB954]/8 animate-[breathe_3s_ease-in-out_infinite_0.5s]"
            size={140}
            strokeWidth={1}
          />
          <Music
            className="absolute text-[#1DB954]/6 animate-[breathe_3s_ease-in-out_infinite_1s]"
            size={100}
            strokeWidth={1}
          />
        </div>

        {/* Orbiting dots (Spotify green only) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-[orbit_3s_linear_infinite]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1DB954] shadow-[0_0_6px_rgba(29,185,84,0.4)]" />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-[orbit-reverse_2.5s_linear_infinite]">
            <div className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_4px_rgba(29,185,84,0.3)]" />
          </div>
        </div>

        {/* Rings (clean, no glow overload) */}
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#1DB954]/35 animate-spin" />
        <div className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-[#1DB954]/25 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
        <div className="absolute inset-8 rounded-full border-[3px] border-transparent border-t-[#1DB954]/15 animate-spin [animation-duration:1s]" />

        {/* Center icon */}
        <Music
          className="text-[#1DB954] animate-[note-bounce_1.5s_ease-in-out_infinite] drop-shadow-[0_0_8px_rgba(29,185,84,0.4)]"
          size={48}
        />

        {/* Label */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-white/60 text-sm font-medium tracking-wide animate-pulse">
            Loading
          </span>
        </div>
      </div>
    );
  }

  // ─── WAVE VARIANT (UNCHANGED) ─────────────────────────────────
  return (
    <div
      className={cn(musicLoaderVariants({ variant, size, className }))}
      aria-label="Loading music"
    >
      <div className="text-white/80 text-base font-semibold tracking-[0.2em] animate-pulse">
        LOADING TRACK
      </div>

      {showTrackInfo && (
        <div
          key={trackIndex}
          className="text-center"
          style={{ animation: "slide-up 0.5s ease-out" }}
        >
          <div className="text-white font-bold text-lg">{trackInfo.name}</div>
          <div className="text-white/40 text-sm mt-0.5">
            {trackInfo.artist}
          </div>
        </div>
      )}
    </div>
  );
}