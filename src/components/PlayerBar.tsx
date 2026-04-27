import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
} from "lucide-react";
import { Track } from "../data/tracks";
import { RepeatMode } from "../hooks/usePlayer";
import { formatTime } from "../utils/format";
import { useRef } from "react";

interface PlayerBarProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  liked: Set<string>;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pct: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (id: string) => void;
}

export default function PlayerBar({
  track,
  isPlaying,
  progress,
  currentTime,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  liked,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
}: PlayerBarProps) {
  const seekRef = useRef<HTMLDivElement>(null);

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekRef.current || !track) return;
    const rect = seekRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onSeek(pct);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const val = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange(val);
  };

  const isLiked = track ? liked.has(track.id) : false;
  const duration = track?.duration ?? 0;

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 px-2 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full h-auto z-10">
      {/* Track info */}
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-56 shrink-0">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          {track ? (
            <>
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shadow-md shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/default-cover.jpg";
                }}
              />
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
              </div>
            </>
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 shrink-0" />
          )}
        </div>
        
        {/* In mobile view, show play/pause right next to the song title for a mini-player feel, or just hide on mobile the extra buttons? Let's just keep the like button here and show basic controls below */}
        {track && (
          <button
            onClick={() => onToggleLike(track.id)}
            className={`shrink-0 ml-1 transition-all hover:scale-110 ${
              isLiked ? "text-[#1DB954]" : "text-zinc-600 hover:text-white"
            }`}
          >
            <Heart size={16} className={isLiked ? "fill-[#1DB954]" : ""} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="w-full sm:flex-1 flex flex-col items-center gap-1 sm:gap-2">
        <div className="flex justify-between sm:justify-center items-center w-full sm:w-auto px-4 sm:px-0 gap-4 sm:gap-5">
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            className={`hidden sm:block transition-colors hover:scale-105 ${
              isShuffle ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shuffle size={18} />
          </button>

          {/* Prev */}
          <button
            onClick={onPrev}
            className="text-zinc-300 hover:text-white transition-colors hover:scale-105"
          >
            <SkipBack size={20} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            disabled={!track}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 shadow-lg"
          >
            {isPlaying ? (
              <Pause size={18} className="text-black" fill="black" />
            ) : (
              <Play size={18} className="text-black ml-0.5" fill="black" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="text-zinc-300 hover:text-white transition-colors hover:scale-105"
          >
            <SkipForward size={20} />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`hidden sm:block transition-colors hover:scale-105 relative ${
              repeatMode !== "none" ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
            }`}
          >
            {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
            {repeatMode !== "none" && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-3 max-w-lg">
          <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div
            ref={seekRef}
            onClick={handleSeekClick}
            className="flex-1 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
          >
            <div
              className="h-full bg-[#1DB954] rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
            </div>
          </div>
          <span className="text-xs text-zinc-500 w-8 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="hidden sm:flex items-center gap-2 w-36 shrink-0 justify-end">
        <button
          onClick={onToggleMute}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div
          onClick={handleVolumeClick}
          className="flex-1 h-1 bg-zinc-700 rounded-full cursor-pointer group relative"
        >
          <div
            className="h-full bg-zinc-300 rounded-full relative"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
          </div>
        </div>
      </div>
    </footer>
  );
}
