import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
  liked: Set<string>;
  onToggleLike: (id: string) => void;
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

  // Use React Query hook for search
  const { data: results = [], isLoading } = useSearchMusic(query, isOpen);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="bg-zinc-900 border-zinc-800 text-white sm:max-w-2xl p-0 gap-0 max-h-[80vh] flex flex-col"
        showCloseButton={false}
      >
        {/* Header with search input */}
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
              className="pl-10 bg-zinc-800/30 border-zinc-700/50 text-white placeholder-zinc-500 focus-visible:border-[#1DB954] focus-visible:ring-[#1DB954]/30 h-10"
            />
          </div>
        </DialogHeader>

        {/* Results */}
        <ScrollArea className="flex-1 min-h-[300px]">
          {query.length < 3 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Search size={32} className="text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">
                Search for music by title, artist, or album.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin">
                <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full" />
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Search size={32} className="text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">No results found</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {results.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track);
                    onClose();
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors group text-left"
                >
                  {/* Thumbnail */}
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-12 h-12 rounded-md object-cover shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration + Like */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-500">
                      {formatTime(track.duration)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(track.id);
                      }}
                      className="hover:bg-zinc-700"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill={liked.has(track.id) ? "#1DB954" : "none"}
                        stroke={liked.has(track.id) ? "#1DB954" : "currentColor"}
                        strokeWidth="2"
                        className="text-zinc-500"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
