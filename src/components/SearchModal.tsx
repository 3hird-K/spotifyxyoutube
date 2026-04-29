import { useState, useEffect, useRef } from "react";
import { Search, Heart } from "lucide-react";
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: Track, query?: string) => void;
  liked: Set<string>;
  onToggleLike: (track: Track) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectTrack,
  liked,
  onToggleLike,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results = [], isLoading } = useSearchMusic(query, isOpen);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery(""); // Clear search when closing
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="bg-zinc-900 border-zinc-800 text-white sm:max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <DialogTitle className="sr-only">Search Music</DialogTitle>
          <div className="relative flex items-center gap-3">
            <Search size={18} className="text-zinc-500 absolute left-3 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search songs, artists…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 focus-visible:border-[#1DB954] focus-visible:ring-[#1DB954]/30 h-11"
            />
          </div>
        </DialogHeader>

        {/* Scrollable Results - Now limited to ~8 items visible */}
        <ScrollArea className="flex-1 px-2 py-2 h-[560px] overflow-y-auto">
          {query.length < 3 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-zinc-600 mb-4" />
              <p className="text-zinc-400 text-sm">
                Search for music by title, artist, or album.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20 relative min-h-[200px]">
              <MusicLoader />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={40} className="text-zinc-600 mb-4" />
              <p className="text-zinc-400 text-sm">No results found</p>
            </div>
          ) : (
            <div className="space-y-1 pr-2">
              {results.map((track) => {
                const isLiked = liked.has(track.id);
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track, query);
                      onClose();
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/70 transition-all group text-left"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {track.artist}
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
                        className={`hover:bg-zinc-700 transition-colors ${isLiked ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"}`}
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
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}