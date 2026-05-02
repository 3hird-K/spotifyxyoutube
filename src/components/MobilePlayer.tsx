import { Heart, Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Track } from "../data/tracks";

interface MobilePlayerProps {
  track: Track | null;
  isPlaying: boolean;
  isLiked: boolean;
  progress: number;
  onTogglePlay: () => void;
  onToggleLike: (t: Track) => void;
  onTrackDetail: (t: Track) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function MobilePlayer({
  track,
  isPlaying,
  isLiked,
  progress,
  onTogglePlay,
  onToggleLike,
  onTrackDetail,
  onNext,
  onPrev,
}: MobilePlayerProps) {
  if (!track) return null;

  return (
    <div className="fixed bottom-[66px] left-2 right-2 z-30 md:hidden">
      <div
        onClick={() => onTrackDetail(track)}
        className="bg-zinc-900/95 backdrop-blur-md rounded-md p-1.5 flex items-center gap-3 shadow-2xl border border-zinc-800"
      >
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[11px] font-bold truncate">{track.title}</p>
          <p className="text-zinc-400 text-[10px] truncate" onClick={(e) => e.stopPropagation()}>
            <a
              href={track.youtubeArtistUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.artist)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DB954] hover:underline transition-colors"
            >
              {track.artist}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-0.5 pr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="w-8 h-8 flex items-center justify-center text-white"
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(track);
            }}
            className={`${isLiked ? "text-[#1DB954]" : "text-zinc-400"} p-2 ml-1`}
          >
            <Heart size={20} className={isLiked ? "fill-[#1DB954]" : ""} />
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}
