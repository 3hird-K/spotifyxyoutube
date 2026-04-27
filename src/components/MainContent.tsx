import { useState, useEffect } from "react";
import {
  Search, Play, Pause, Clock, Heart, ExternalLink,
  Loader2, ListPlus, Check, Trash2, ListMusic,
} from "lucide-react";
import { Track, GENRES } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { formatTime } from "../utils/format";
import { useSearchMusic } from "../hooks/useSearchMusic";
import { searchYouTubeMusic } from "../utils/youtube";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface MainContentProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  liked: Set<string>;
  likedTracks: Track[];
  queue: Track[];
  onSelect: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onTogglePlay: () => void;
  onQueueChange: (tracks: Track[]) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  activePlaylist: Playlist | null;
  onOpenSearch: () => void;
  searchResults: Track[];
  selectedTrackDetail: Track | null;
  onTrackDetail: (track: Track) => void;
  recentlyPlayed: Track[];
}

export default function MainContent({
  currentTrack,
  isPlaying,
  liked,
  likedTracks,
  queue,
  onSelect,
  onToggleLike,
  onTogglePlay,
  onQueueChange,
  activeView,
  setActiveView,
  playlists,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  activePlaylist,
  onOpenSearch,
  searchResults,
  selectedTrackDetail,
  onTrackDetail,
  recentlyPlayed,
}: MainContentProps) {
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  const isPlaylistView = activeView.startsWith("playlist:");
  const isLibraryView = activeView === "library";
  const isTrackDetailView = activeView === "track-detail";
  const shouldFetchTrending = activeView === "home";

  // Build the search query for trending
  const trendingQuery = selectedGenre !== "All" ? `${selectedGenre} music trending` : "Top trending music";

  // Use React Query hook for data fetching (trending only)
  const { data: apiTracks = [], isLoading: isTrendingLoading } = useSearchMusic(trendingQuery, shouldFetchTrending);

  // Update queue when trending tracks change
  useEffect(() => {
    if (shouldFetchTrending && apiTracks.length > 0) {
      onQueueChange(apiTracks);
    }
  }, [apiTracks, shouldFetchTrending, onQueueChange]);

  // Fetch recommended tracks when in track detail view
  useEffect(() => {
    if (isTrackDetailView && selectedTrackDetail) {
      const fetchRecommended = async () => {
        setIsRecommending(true);
        const query = `${selectedTrackDetail.artist} ${selectedTrackDetail.title} related music`;
        const results = await searchYouTubeMusic(query);
        setRecommendedTracks(results.filter(t => t.id !== selectedTrackDetail.id));
        setIsRecommending(false);
      };
      fetchRecommended();
    }
  }, [isTrackDetailView, selectedTrackDetail]);

  // Determine tracks to display for list views
  let displayTracks: Track[] = [];
  if (activeView === "liked") {
    displayTracks = likedTracks;
  } else if (activeView === "search-results") {
    displayTracks = searchResults;
  } else if (isPlaylistView && activePlaylist) {
    displayTracks = activePlaylist.tracks;
  } else if (activeView === "home") {
    displayTracks = apiTracks;
  }

  // --- RENDERING HELPERS ---

  if (isTrackDetailView && selectedTrackDetail) {
    return (
      <TrackDetailView
        track={selectedTrackDetail}
        isPlaying={currentTrack?.id === selectedTrackDetail.id && isPlaying}
        isCurrent={currentTrack?.id === selectedTrackDetail.id}
        onTogglePlay={onTogglePlay}
        onSelect={onSelect}
        liked={liked}
        onToggleLike={onToggleLike}
        recommendedTracks={recommendedTracks}
        isLoadingRecommended={isRecommending}
        playlists={playlists}
        onAddToPlaylist={onAddToPlaylist}
        onTrackDetail={onTrackDetail}
      />
    );
  }

  if (isLibraryView) {
    return (
      <LibraryView
        playlists={playlists}
        likedCount={likedTracks.length}
        recentlyPlayed={recentlyPlayed}
        onSelectView={(view) => setActiveView(view)}
        onTrackDetail={onTrackDetail}
        onPlayPlaylist={(tracks) => {
          if (tracks.length > 0) {
            onQueueChange(tracks);
            onSelect(tracks[0]);
          }
        }}
      />
    );
  }

  const pageTitle = isPlaylistView
    ? activePlaylist?.name ?? "Playlist"
    : activeView === "search-results"
      ? "Search Results"
      : activeView === "liked"
        ? "Liked Songs"
        : activeView === "search"
          ? "Search Music"
          : "Trending Music";

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md px-8 pt-6 pb-4 border-b border-zinc-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {(isPlaylistView || activeView === "liked") && (
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeView === "liked" ? "bg-gradient-to-br from-indigo-500 to-purple-700" : "bg-zinc-800"}`}>
                {activeView === "liked" ? <Heart size={18} className="text-white fill-white" /> : <ListMusic size={18} className="text-zinc-400" />}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {displayTracks.length} track{displayTracks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onOpenSearch}
            className="sm:ml-auto flex items-center gap-3 px-4 py-2 bg-zinc-800 border-zinc-700 rounded-full text-sm text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 h-auto"
          >
            <Search size={16} />
            <span>Search tracks, artists…</span>
            <kbd className="hidden md:flex items-center gap-1 ml-auto px-2 py-1 bg-zinc-700/50 rounded text-xs text-zinc-400">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Genre filters (only on Home) */}
        {activeView === "home" && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {GENRES.map((g) => (
              <Badge
                key={g}
                variant={selectedGenre === g ? "default" : "secondary"}
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors h-auto ${selectedGenre === g
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
              >
                {g}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Featured banner (home view) */}
      {activeView === "home" && selectedGenre === "All" && apiTracks.length > 0 && (
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
        {isTrendingLoading ? (
          <div className="text-center text-zinc-600 py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg font-semibold text-zinc-500">Loading tracks...</p>
          </div>
        ) : displayTracks.length === 0 ? (
          <div className="text-center text-zinc-600 py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-semibold text-zinc-500">No tracks found</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 mb-2">
              <span className="w-8 text-center">#</span>
              <span>Title</span>
              <span className="hidden lg:block">Album</span>
              <span className="flex items-center gap-1"><Clock size={13} /></span>
              <span className="w-20 text-center">Actions</span>
            </div>
            {displayTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                idx={idx}
                isCurrent={currentTrack?.id === track.id}
                isTrackPlaying={currentTrack?.id === track.id && isPlaying}
                isLiked={liked.has(track.id)}
                onSelect={onSelect}
                onToggleLike={onToggleLike}
                playlists={playlists}
                onAddToPlaylist={onAddToPlaylist}
                isInPlaylist={isPlaylistView}
                activePlaylistId={isPlaylistView ? activeView.replace("playlist:", "") : null}
                onRemoveFromPlaylist={onRemoveFromPlaylist}
                onTrackDetail={onTrackDetail}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Library View ───────────────────────────────────────────────────────────

function LibraryView({
  playlists,
  likedCount,
  recentlyPlayed,
  onSelectView,
  onTrackDetail,
  onPlayPlaylist,
}: {
  playlists: Playlist[];
  likedCount: number;
  recentlyPlayed: Track[];
  onSelectView: (v: string) => void;
  onTrackDetail: (t: Track) => void;
  onPlayPlaylist: (tracks: Track[]) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Your Library</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Liked Songs Card */}
        <div 
          onClick={() => onSelectView("liked")}
          className="relative group aspect-square rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 p-6 flex flex-col justify-end cursor-pointer hover:shadow-2xl transition-all"
        >
          <div className="absolute top-4 right-4">
            <Heart size={32} className="text-white fill-white opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Liked Songs</h2>
            <p className="text-indigo-100 font-medium">{likedCount} liked song{likedCount !== 1 ? "s" : ""}</p>
          </div>
          <button 
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
            onClick={(e) => { e.stopPropagation(); /* Logic to play all liked handled via parent if needed */ }}
          >
            <Play size={24} className="text-black ml-1 fill-black" />
          </button>
        </div>

        {/* Playlists */}
        {playlists.map((pl) => (
          <div 
            key={pl.id} 
            onClick={() => onSelectView(`playlist:${pl.id}`)}
            className="relative group p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800/50"
          >
            <div className="aspect-square rounded-lg bg-zinc-800 flex items-center justify-center mb-4 shadow-lg overflow-hidden relative">
               <ListMusic size={48} className="text-zinc-700" />
               <button 
                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
                onClick={(e) => { e.stopPropagation(); onPlayPlaylist(pl.tracks); }}
              >
                <Play size={20} className="text-black ml-1 fill-black" />
              </button>
            </div>
            <h3 className="text-white font-bold truncate">{pl.name}</h3>
            <p className="text-zinc-500 text-sm">{pl.tracks.length} tracks</p>
          </div>
        ))}
      </div>

      {recentlyPlayed.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-white mt-12 mb-6">Recently Played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <div
                key={track.id}
                onClick={() => onTrackDetail(track)}
                className="group p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800/50"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-4 shadow-lg">
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="text-white font-semibold text-sm truncate">{track.title}</h3>
                <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

// ─── Track Detail View ─────────────────────────────────────────────────────

function TrackDetailView({
  track,
  isPlaying,
  isCurrent,
  onTogglePlay,
  onSelect,
  liked,
  onToggleLike,
  recommendedTracks,
  isLoadingRecommended,
  playlists,
  onAddToPlaylist,
  onTrackDetail,
}: {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  onTogglePlay: () => void;
  onSelect: (t: Track) => void;
  liked: Set<string>;
  onToggleLike: (track: Track) => void;
  recommendedTracks: Track[];
  isLoadingRecommended: boolean;
  playlists: Playlist[];
  onAddToPlaylist: (plId: string, t: Track) => void;
  onTrackDetail: (t: Track) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-zinc-800 to-zinc-950 overflow-y-auto px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8 items-end mb-10">
        <div className="w-64 h-64 shadow-2xl rounded-xl overflow-hidden shrink-0">
          <img src={track.thumbnail} alt={track.album} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Track</p>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">{track.title}</h1>
          <div className="flex items-center gap-2 text-white font-bold">
            <span className="hover:underline cursor-pointer">{track.artist}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 font-medium">{track.album}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 font-medium">{track.year}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-12">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] transition-transform hover:scale-105 active:scale-95 shadow-xl border-none"
          onClick={() => isCurrent ? onTogglePlay() : onSelect(track)}
        >
          {isPlaying ? <Pause size={28} className="text-black fill-black" /> : <Play size={28} className="text-black ml-1 fill-black" />}
        </Button>
        <button
          onClick={() => onToggleLike(track)}
          className={`transition-colors ${liked.has(track.id) ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"}`}
        >
          <Heart size={32} className={liked.has(track.id) ? "fill-[#1DB954]" : ""} />
        </button>
      </div>

      <Separator className="bg-zinc-800 mb-8" />

      <h2 className="text-2xl font-bold text-white mb-6">Recommended for you</h2>
      {isLoadingRecommended ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-zinc-700" size={32} />
        </div>
      ) : (
        <div className="space-y-1">
          {recommendedTracks.map((t, idx) => (
            <TrackRow
               key={t.id}
               track={t}
               idx={idx}
               isCurrent={false}
               isTrackPlaying={false}
               isLiked={liked.has(t.id)}
               onSelect={onSelect}
               onToggleLike={onToggleLike}
               playlists={playlists}
               onAddToPlaylist={onAddToPlaylist}
               isInPlaylist={false}
               activePlaylistId={null}
               onRemoveFromPlaylist={() => {}}
               onTrackDetail={onTrackDetail}
            />
          ))}
        </div>
      )}
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
        onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-cover.jpg"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="relative p-6 flex items-end justify-between w-full">
        <div>
          <p className="text-xs text-[#1DB954] font-bold uppercase tracking-widest mb-1">🔥 Featured</p>
          <h2 className="text-3xl font-black text-white">{track.title}</h2>
          <p className="text-zinc-300 mt-0.5">{track.artist}</p>
        </div>
        <Button
          onClick={() => (isCurrent ? onTogglePlay() : onSelect(track))}
          className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform hover:bg-[#1ed760] border-none"
          size="icon-lg"
        >
          {isCurrentlyPlaying ? (
            <Pause size={22} className="text-black" fill="black" />
          ) : (
            <Play size={22} className="text-black ml-1" fill="black" />
          )}
        </Button>
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
  onToggleLike,
  playlists,
  onAddToPlaylist,
  isInPlaylist,
  activePlaylistId,
  onRemoveFromPlaylist,
  onTrackDetail,
}: {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isTrackPlaying: boolean;
  isLiked: boolean;
  onSelect: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  isInPlaylist: boolean;
  activePlaylistId: string | null;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onTrackDetail: (track: Track) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-4 py-2.5 rounded-xl group cursor-pointer transition-colors ${isCurrent
          ? "bg-[#1DB954]/10 border border-[#1DB954]/20"
          : "hover:bg-zinc-800/60"
        }`}
      onClick={() => onTrackDetail(track)}
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
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(track); }}
              className="text-white hidden group-hover:block"
            >
              <Play size={14} fill="white" />
            </button>
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
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-cover.jpg"; }}
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
        <p className="text-sm text-zinc-400 truncate hover:text-white transition-colors">{track.album}</p>
      </div>

      {/* Duration + Like */}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => { e.stopPropagation(); onToggleLike(track); }}
                className={`transition-all hover:scale-110 opacity-0 group-hover:opacity-100 hover:bg-zinc-700/50 ${isLiked ? "opacity-100 text-[#1DB954]" : "text-zinc-600"
                  }`}
              />
            }
          >
            <Heart size={15} className={isLiked ? "fill-[#1DB954]" : ""} />
          </TooltipTrigger>
          <TooltipContent>{isLiked ? "Remove from Liked" : "Add to Liked"}</TooltipContent>
        </Tooltip>
        <span className="text-sm text-zinc-500 tabular-nums">{formatTime(track.duration)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 w-20 justify-center" onClick={(e) => e.stopPropagation()}>
        {/* YouTube link */}
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-red-500 transition-colors p-1 inline-flex"
              />
            }
          >
            <ExternalLink size={13} />
          </TooltipTrigger>
          <TooltipContent>Watch on YouTube</TooltipContent>
        </Tooltip>

        {/* Remove from playlist (when inside playlist view) */}
        {isInPlaylist && activePlaylistId ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemoveFromPlaylist(activePlaylistId, track.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors hover:bg-zinc-700/50"
                />
              }
            >
              <Trash2 size={13} />
            </TooltipTrigger>
            <TooltipContent>Remove from playlist</TooltipContent>
          </Tooltip>
        ) : (
          /* Add to playlist dropdown */
          playlists.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-zinc-600 hover:text-[#1DB954] transition-colors hover:bg-zinc-700/50"
                        />
                      }
                    />
                  }
                >
                  <ListPlus size={13} />
                </TooltipTrigger>
                <TooltipContent>Add to playlist</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="bg-zinc-800 border-zinc-700 min-w-44"
              >
                <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                  Add to playlist
                </DropdownMenuLabel>
                {playlists.map((pl) => {
                  const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                  return (
                    <DropdownMenuItem
                      key={pl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!alreadyIn) onAddToPlaylist(pl.id, track);
                      }}
                      className={`flex items-center gap-2 ${alreadyIn
                          ? "text-zinc-500 cursor-default"
                          : "text-zinc-200"
                        }`}
                    >
                      {alreadyIn ? (
                        <Check size={12} className="text-[#1DB954] shrink-0" />
                      ) : (
                        <ListPlus size={12} className="text-zinc-500 shrink-0" />
                      )}
                      <span className="truncate">{pl.name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </div>
    </div>
  );
}
