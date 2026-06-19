import { useState, useEffect, useRef } from "react";
import { Search, Heart, UserPlus, UserMinus } from "lucide-react";
import { useSearchMusic } from "../hooks/useSearchMusic";
import { Track } from "../data/tracks";
import { formatTime } from "../utils/format";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MusicLoader } from "./MusicLoader";

import { searchDeezerArtists } from "../utils/deezer";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
  onSelectArtist?: (artist: { name: string; thumbnail?: string; youtubeArtistUrl?: string }) => void;
  liked: Set<string>;
  onToggleLike: (track: Track) => void;
  recentSearchTracks: Track[];
  onRemoveRecentSearch: (trackId: string) => void;
  isFollowingArtist?: (artistName: string) => boolean;
  onToggleFollowArtist?: (artist: { name: string; thumbnail?: string; youtubeArtistUrl?: string }) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectTrack,
  onSelectArtist,
  liked,
  onToggleLike,
  recentSearchTracks,
  onRemoveRecentSearch,
  isFollowingArtist,
  onToggleFollowArtist,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [artistResults, setArtistResults] = useState<any[]>([]);

  const { data: results = [], isLoading } = useSearchMusic(query, isOpen);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setArtistResults([]);
      return;
    }
    const fetchArtists = async () => {
      try {
        const arts = await searchDeezerArtists(query);
        if (active) setArtistResults(arts);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(fetchArtists, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="bg-[#121212] border-none text-white sm:max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl rounded-xl"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <DialogTitle className="sr-only">Search Music</DialogTitle>
          <div className="relative flex items-center gap-3">
            <Search size={18} className="text-zinc-500 absolute left-3 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search songs, artists…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-none text-white placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-600 h-11 rounded-full"
            />
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-2 py-2 h-[560px] overflow-y-auto">
          {!query.trim() ? (
            recentSearchTracks.length > 0 ? (
              <div className="px-2 pr-2">
                <h3 className="text-base font-bold text-white px-2 mb-3 mt-2">Recent Searches</h3>
                <div className="space-y-1">
                  {recentSearchTracks.map((track) => {
                    return (
                      <button
                        key={`recent-${track.id}`}
                        onClick={() => {
                          onSelectTrack(track);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group text-left relative"
                      >
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-sm font-bold text-white truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {track.artist}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentSearch(track.id);
                          }}
                          className="absolute right-3 opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </Button>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={40} className="text-zinc-700 mb-4" />
                <p className="text-zinc-400 text-sm font-medium">
                  Search for music by title, artist, or album.
                </p>
              </div>
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <MusicLoader />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-sm font-medium">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="px-2 pr-2">
              {/* Artists Results Section */}
              {artistResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-bold text-white px-2 mb-3">Artists</h3>
                  <div className="flex flex-wrap gap-4 px-2">
                    {artistResults.map((art, idx) => {
                      const following = isFollowingArtist ? isFollowingArtist(art.name) : false;
                      return (
                        <div key={`${art.name}-${idx}`} className="flex flex-col items-center group relative w-[120px] sm:w-[140px] shrink-0">
                          <button
                            onClick={() => {
                              if (onSelectArtist) {
                                onSelectArtist({
                                  name: art.name,
                                  thumbnail: art.thumbnail,
                                  youtubeArtistUrl: art.youtubeArtistUrl,
                                });
                              }
                            }}
                            className="flex flex-col items-center p-3 rounded-xl hover:bg-white/10 transition-all text-center w-full"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-3 bg-zinc-800 shadow-lg group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
                              {art.thumbnail ? (
                                <img
                                  src={art.thumbnail}
                                  alt={art.name}
                                  className="w-full h-full object-cover select-none"
                                />
                              ) : (
                                <span className="text-zinc-500 font-bold select-none text-xl">
                                  {art.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-white truncate w-full mb-1">
                              {art.name}
                            </p>
                            <span className="text-xs text-zinc-400">Artist</span>
                          </button>
                          
                          {onToggleFollowArtist && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className={`absolute top-2 right-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 ${following ? "bg-white/10 text-white opacity-100" : "bg-zinc-800/80 text-zinc-400 hover:text-white"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFollowArtist(art);
                              }}
                              title={following ? "Unfollow" : "Follow"}
                            >
                              {following ? <UserMinus size={14} /> : <UserPlus size={14} />}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Songs Results Section */}
              <h3 className="text-base font-bold text-white px-2 mb-3">Songs</h3>
              <div className="space-y-1">
                {results.map((track) => {
                const isLiked = liked.has(track.id);
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group text-left"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate" onClick={(e) => e.stopPropagation()}>
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

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-500 font-mono">
                        {formatTime(track.duration)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className={`hover:bg-zinc-800 transition-colors ${isLiked ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"}`}
                      >
                        <Heart
                          size={17}
                          className={isLiked ? "fill-[#1DB954]" : ""}
                        />
                      </Button>
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}