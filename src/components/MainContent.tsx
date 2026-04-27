import { useState, useMemo, useEffect } from "react";
import { Search, Play, Pause, Clock, Heart, ExternalLink, Download, Loader2 } from "lucide-react";
import { Track, GENRES } from "../data/tracks";
import { formatTime } from "../utils/format";
import { searchYouTubeMusic } from "../utils/youtube";

interface MainContentProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  liked: Set<string>;
  queue: Track[];
  onSelect: (track: Track) => void;
  onToggleLike: (id: string) => void;
  onTogglePlay: () => void;
  activeView: string;
}

export default function MainContent({
  currentTrack,
  isPlaying,
  liked,
  queue,
  onSelect,
  onToggleLike,
  onTogglePlay,
  activeView,
}: MainContentProps) {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [apiTracks, setApiTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeView === "liked") return;

    const fetchTracks = async () => {
      setIsLoading(true);
      const query = search.trim() || (selectedGenre !== "All" ? `${selectedGenre} music trending` : "Top trending music");
      const results = await searchYouTubeMusic(query);
      setApiTracks(results);
      setIsLoading(false);
    };

    const debounce = setTimeout(fetchTracks, 600);
    return () => clearTimeout(debounce);
  }, [search, selectedGenre, activeView]);

  const displayTracks = activeView === "liked"
    ? queue.filter((t) => liked.has(t.id)) // Assuming liked tracks are pushed to queue or saved elsewhere, ideally we would need an overall store but we'll use apiTracks + queue for now
    : apiTracks;

  const filtered = displayTracks; // Filtering is handled via API now

  const pageTitle =
    activeView === "liked"
      ? "Liked Songs"
      : activeView === "search"
      ? "Search Music"
      : "Trending Music";

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md px-8 pt-6 pb-4 border-b border-zinc-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {filtered.length} track{filtered.length !== 1 ? "s" : ""}
              {activeView === "liked" && liked.size === 0 && " — heart some songs!"}
            </p>
          </div>

          {/* Search */}
          <div className="sm:ml-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tracks, artists…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954] transition-colors"
            />
          </div>
        </div>

        {/* Genre filters */}
        {activeView !== "liked" && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedGenre === g
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Featured banner (home view) */}
      {activeView === "home" && !search && selectedGenre === "All" && apiTracks.length > 0 && (
        <FeaturedBanner
          track={apiTracks[0]}
          isCurrentlyPlaying={currentTrack?.id === apiTracks[0].id && isPlaying}
          onSelect={onSelect}
          onTogglePlay={onTogglePlay}
          isCurrent={currentTrack?.id === apiTracks[0].id}
        />
      )}

      {/* Track list */}
      <div className="px-8 py-4">
        {isLoading ? (
          <div className="text-center text-zinc-600 py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg font-semibold text-zinc-500">Loading YouTube tracks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 py-20">
            <p className="text-4xl mb-3">🎵</p>
            <p className="text-lg font-semibold text-zinc-500">No tracks found</p>
            <p className="text-sm mt-1">Try a different search or genre</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 mb-2">
              <span className="w-8 text-center">#</span>
              <span>Title</span>
              <span className="hidden lg:block">Album</span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
              </span>
              <span className="w-16 text-center">Links</span>
            </div>

            <div className="space-y-1">
              {filtered.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = liked.has(track.id);

                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    idx={idx}
                    isCurrent={isCurrent}
                    isTrackPlaying={isTrackPlaying}
                    isLiked={isLiked}
                    onSelect={onSelect}
                    onTogglePlay={onTogglePlay}
                    onToggleLike={onToggleLike}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer padding */}
      <div className="h-8" />
    </main>
  );
}

// ─── Featured Banner ────────────────────────────────────────────────────────

function FeaturedBanner({
  track,
  isCurrentlyPlaying,
  isCurrent,
  onSelect,
  onTogglePlay,
}: {
  track: Track;
  isCurrentlyPlaying: boolean;
  isCurrent: boolean;
  onSelect: (track: Track) => void;
  onTogglePlay: () => void;
}) {
  return (
    <div className="mx-8 mt-6 mb-2 rounded-2xl overflow-hidden relative h-52 flex items-end">
      <img
        src={track.thumbnail}
        alt={track.title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/images/default-cover.jpg";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="relative p-6 flex items-end justify-between w-full">
        <div>
          <p className="text-xs text-[#1DB954] font-bold uppercase tracking-widest mb-1">
            🔥 Featured
          </p>
          <h2 className="text-3xl font-black text-white">{track.title}</h2>
          <p className="text-zinc-300 mt-0.5">{track.artist}</p>
        </div>
        <button
          onClick={() => (isCurrent ? onTogglePlay() : onSelect(track))}
          className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
        >
          {isCurrentlyPlaying ? (
            <Pause size={22} className="text-black" fill="black" />
          ) : (
            <Play size={22} className="text-black ml-1" fill="black" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Track Row ───────────────────────────────────────────────────────────────

function TrackRow({
  track,
  idx,
  isCurrent,
  isTrackPlaying,
  isLiked,
  onSelect,
  onTogglePlay,
  onToggleLike,
}: {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isTrackPlaying: boolean;
  isLiked: boolean;
  onSelect: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleLike: (id: string) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-2.5 rounded-xl group cursor-pointer transition-colors ${
        isCurrent
          ? "bg-[#1DB954]/10 border border-[#1DB954]/20"
          : "hover:bg-zinc-800/60"
      }`}
      onClick={() => (isCurrent ? onTogglePlay() : onSelect(track))}
    >
      {/* Index / Play indicator */}
      <div className="w-8 flex items-center justify-center">
        {isCurrent ? (
          isTrackPlaying ? (
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: "60%" }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_0.2s_infinite]" style={{ height: "100%" }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_0.4s_infinite]" style={{ height: "40%" }} />
            </span>
          ) : (
            <Play size={14} className="text-[#1DB954]" fill="#1DB954" />
          )
        ) : (
          <>
            <span className="text-zinc-500 text-sm group-hover:hidden">{idx + 1}</span>
            <Play size={14} className="text-white hidden group-hover:block" fill="white" />
          </>
        )}
      </div>

      {/* Title + thumbnail */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative shrink-0">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-10 h-10 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/default-cover.jpg";
            }}
          />
        </div>
        <div className="overflow-hidden">
          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-[#1DB954]" : "text-white"}`}>
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Album */}
      <div className="hidden lg:block overflow-hidden">
        <p className="text-sm text-zinc-400 truncate hover:text-white transition-colors">
          {track.album}
        </p>
      </div>

      {/* Duration + Like */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(track.id);
          }}
          className={`transition-all hover:scale-110 opacity-0 group-hover:opacity-100 ${
            isLiked ? "opacity-100 text-[#1DB954]" : "text-zinc-600"
          }`}
        >
          <Heart size={15} className={isLiked ? "fill-[#1DB954]" : ""} />
        </button>
        <span className="text-sm text-zinc-500 tabular-nums">{formatTime(track.duration)}</span>
      </div>

      {/* External links */}
      <div className="flex items-center gap-2 w-16 justify-center">
        <a
          href={track.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Watch on YouTube"
          className="text-zinc-600 hover:text-red-500 transition-colors"
        >
          <ExternalLink size={13} />
        </a>
        <a
          href={`https://v16.www-y2mate.com/youtube/${track.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Download MP3/MP4"
          className="text-zinc-600 hover:text-amber-400 transition-colors"
        >
          <Download size={13} />
        </a>
        {track.spotifyUrl && (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open in Spotify"
            className="text-zinc-600 hover:text-[#1DB954] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
