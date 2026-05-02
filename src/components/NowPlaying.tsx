import { useState } from "react";
import {
  Heart,
  ExternalLink,
  ChevronDown,
  Share2,
  Music2,
} from "lucide-react";
import { Track } from "../data/tracks";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NowPlayingProps {
  track: Track | null;
  liked: Set<string>;
  onToggleLike: (track: Track) => void;
  isFollowingArtist?: (name: string) => boolean;
  onToggleFollowArtist?: (artist: { name: string; youtubeArtistUrl?: string; thumbnail?: string }) => void;
}

export default function NowPlaying({
  track,
  liked,
  onToggleLike,
  isFollowingArtist,
  onToggleFollowArtist,
}: NowPlayingProps) {
  const [showLinks, setShowLinks] = useState(false);

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600">
        <Music2 size={48} className="mb-4 opacity-40" />
        <p className="text-sm">No track selected</p>
      </div>
    );
  }

  const isLiked = liked.has(track.id);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 bg-black">
      {/* Video Dock Container - Full Width for Video */}
      <div
        id="sidebar-video-dock"
        className="relative w-full aspect-square overflow-hidden shadow-2xl bg-black/60 flex items-center justify-center shrink-0 border-b border-white/5"
      >
        {!track.youtubeId && (
          <img
            src={track.thumbnail}
            alt={track.album}
            className="w-full h-full object-cover opacity-60 transition-opacity duration-700"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 pointer-events-none">
          <Music2 size={32} className="mb-2 opacity-20 rounded-full" />
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-20">Video Engine Active</p>
        </div>
      </div>

      {/* Content Wrapper - Padded for text */}
      <div className="flex flex-col gap-8 px-6 py-8">
        {/* Info */}
        <div className="w-full flex flex-col gap-2 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="overflow-hidden flex-1">
              <h2 className="text-2xl font-black text-white leading-tight tracking-tight break-words">{track.title}</h2>
              <a
                href={track.youtubeArtistUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.artist)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-base text-[#1DB954] hover:text-[#1ed760] font-bold mt-2 hover:underline transition-colors cursor-pointer"
              >
                {track.artist}
              </a>
              {onToggleFollowArtist && isFollowingArtist && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollowArtist({
                      name: track.artist,
                      youtubeArtistUrl: track.youtubeArtistUrl,
                      thumbnail: track.thumbnail,
                    });
                  }}
                  className={`ml-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all border inline-flex items-center ${
                    isFollowingArtist(track.artist)
                      ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/60"
                      : "bg-[#1DB954] text-black border-[#1DB954] hover:bg-[#1ed760] hover:scale-105"
                  }`}
                >
                  {isFollowingArtist(track.artist) ? "Following" : "Follow"}
                </button>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => onToggleLike(track)}
                    className={`shrink-0 p-2 rounded-full transition-all hover:scale-110 active:scale-95 hover:bg-zinc-800/50 ${isLiked ? "text-[#1DB954]" : "text-zinc-500 hover:text-white"
                      }`}
                  >
                    <Heart size={26} className={isLiked ? "fill-[#1DB954]" : ""} />
                  </button>
                }
              />
              <TooltipContent side="left">{isLiked ? "Remove from Liked" : "Save to Liked"}</TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">{track.album} • {track.year}</p>
        </div>



        {/* Divider */}
        <Separator className="w-full bg-zinc-800/50" />

        {/* Links section */}
        <div className="w-full space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowLinks((v) => !v)}
            className="w-full flex items-center justify-between text-zinc-400 hover:text-white transition-colors text-sm font-semibold h-auto py-2 px-0 hover:bg-transparent"
          >
            <span className="flex items-center gap-2">
              <Share2 size={14} />
              Open / Download Links
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${showLinks ? "rotate-180" : ""}`}
            />
          </Button>

          {showLinks && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              {/* YouTube Watch */}
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-red-500 shrink-0" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    YouTube
                  </p>
                  <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                    Watch on YouTube
                  </p>
                </div>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
              </a>

              {/* YouTube Download (via SaveFrom converter) */}
              <a
                href={`https://www.savefrom.net/en/download/?url=https://www.youtube.com/watch?v=${track.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-amber-400 shrink-0" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Download MP3 / MP4
                  </p>
                  <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                    via SaveFrom converter
                  </p>
                </div>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
              </a>

              {/* Spotify */}
              {track.spotifyUrl && (
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-colors group"
                >
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-[#1DB954] shrink-0" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold text-[#1DB954] uppercase tracking-wide">
                      Spotify
                    </p>
                    <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                      Open in Spotify
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                </a>
              )}

              {/* YouTube Creator URL */}
              <a
                href={track.youtubeArtistUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.artist)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-red-500 shrink-0" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    YouTube Creator
                  </p>
                  <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                    Follow {track.artist} on YouTube Music
                  </p>
                </div>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Genre badge */}
      <div className="mt-auto px-6 pb-8">
        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs font-semibold px-3 py-1 rounded-full h-auto">
          {track.genre}
        </Badge>
      </div>
    </div>
  );
}
