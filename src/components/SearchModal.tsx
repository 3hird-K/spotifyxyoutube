import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useSearchMusic } from "../hooks/useSearchMusic";
import { Track } from "../data/tracks";
import { formatTime } from "../utils/format";

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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[80vh] rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="relative flex-1 flex items-center gap-3 px-4 py-2 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <Search size={18} className="text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search songs, artists…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {query.length < 3 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
              <Search size={32} className="text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">
                Search for music by title, artist, or album.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin">
                <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-400 rounded-full" />
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(track.id);
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill={liked.has(track.id) ? "#ef4444" : "none"}
                        stroke={liked.has(track.id) ? "#ef4444" : "currentColor"}
                        strokeWidth="2"
                        className="text-zinc-500"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
