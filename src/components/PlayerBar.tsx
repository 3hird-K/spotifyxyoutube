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

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  onToggleLike: (track: Track) => void;
  onTrackDetail?: (track: Track) => void;
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
  onTrackDetail,
}: PlayerBarProps) {
  if (!track) return null;

  const isLiked = track ? liked.has(track.id) : false;
  const duration = track?.duration ?? 0;

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 h-[90px] px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 w-full sm:w-[280px] shrink-0">
        <div
          onClick={() => onTrackDetail?.(track)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
        >
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-14 h-14 rounded-md object-cover shrink-0 group-hover:brightness-90 transition"
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-cover.jpg" }}
          />
          <div className="min-w-0 hidden sm:block">
            <p className="text-[14px] text-white truncate group-hover:underline leading-tight">
              {track.title}
            </p>
            <p className="text-[12px] text-zinc-400 truncate">
              {track.artist}
            </p>
          </div>
        </div>

        {/* Heart - keep outside the clickable area */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(track);
                }}
                className={`shrink-0 ${isLiked ? "text-[#1DB954]" : "text-zinc-500 hover:text-white"}`}
              />
            }
          >
            <Heart size={16} className={isLiked ? "fill-[#1DB954]" : ""} />
          </TooltipTrigger>
          <TooltipContent>{isLiked ? "Remove from Liked" : "Save to Liked"}</TooltipContent>
        </Tooltip>
      </div>

      {/* Controls */}
      <div className="w-full sm:flex-1 flex flex-col items-center gap-1 sm:gap-2">
        <div className="flex justify-between sm:justify-center items-center w-full sm:w-auto px-4 sm:px-0 gap-4 sm:gap-5">
          {/* Shuffle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleShuffle}
                  className={`hidden sm:flex transition-colors hover:scale-105 hover:bg-zinc-800/50 ${isShuffle ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
                    }`}
                />
              }
            >
              <Shuffle size={18} />
            </TooltipTrigger>
            <TooltipContent>{isShuffle ? "Disable shuffle" : "Enable shuffle"}</TooltipContent>
          </Tooltip>

          {/* Prev */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onPrev}
                  className="text-zinc-300 hover:text-white transition-colors hover:scale-105 hover:bg-zinc-800/50"
                />
              }
            >
              <SkipBack size={20} />
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Button
            onClick={onTogglePlay}
            disabled={!track}
            size="icon"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 shadow-lg hover:bg-zinc-100 border-none"
          >
            {isPlaying ? (
              <Pause size={18} className="text-black" fill="black" />
            ) : (
              <Play size={18} className="text-black ml-0.5" fill="black" />
            )}
          </Button>

          {/* Next */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onNext}
                  className="text-zinc-300 hover:text-white transition-colors hover:scale-105 hover:bg-zinc-800/50"
                />
              }
            >
              <SkipForward size={20} />
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>

          {/* Repeat */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleRepeat}
                  className={`hidden sm:flex transition-colors hover:scale-105 hover:bg-zinc-800/50 relative ${repeatMode !== "none" ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"
                    }`}
                />
              }
            >
              {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
              {repeatMode !== "none" && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {repeatMode === "none" ? "Enable repeat" : repeatMode === "all" ? "Enable repeat one" : "Disable repeat"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Progress bar — using Slider */}
        <div className="w-full flex items-center gap-3 max-w-lg">
          <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progress]}
            min={0}
            max={100}
            onValueChange={(val) => onSeek(Array.isArray(val) ? val[0] : val)}
            className="flex-1 cursor-pointer [&_[data-slot=slider-track]]:bg-zinc-700 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-[#1DB954] [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-[#1DB954] [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:transition-opacity"
          />
          <span className="text-xs text-zinc-500 w-8 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume — using Slider */}
      <div className="hidden sm:flex items-center gap-2 w-36 shrink-0 justify-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onToggleMute}
                className="text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800/50"
              />
            }
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </TooltipTrigger>
          <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
        </Tooltip>
        <Slider
          value={[isMuted ? 0 : volume * 100]}
          min={0}
          max={100}
          onValueChange={(val) => onVolumeChange((Array.isArray(val) ? val[0] : val) / 100)}
          className="flex-1 cursor-pointer [&_[data-slot=slider-track]]:bg-zinc-700 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-zinc-300 [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:border-zinc-300 [&_[data-slot=slider-thumb]]:opacity-0 [&:hover_[data-slot=slider-thumb]]:opacity-100 [&_[data-slot=slider-thumb]]:transition-opacity"
        />
      </div>
    </footer>
  );
}
