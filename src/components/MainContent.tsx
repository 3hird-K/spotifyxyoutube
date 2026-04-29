import { useState, useEffect } from "react";
import {
  Search, Play, Clock, Heart, Loader2, Trash2, ListMusic, Shuffle, Repeat, Repeat1, Pause,
} from "lucide-react";
import { RepeatMode } from "../hooks/usePlayer";
import { Track, GENRES } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { useSearchMusic } from "../hooks/useSearchMusic";
import { searchYouTubeMusic } from "../utils/youtube";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUserProfile } from "../hooks/useUserProfile";

import { LibraryView } from "./LibraryView";
import { TrackDetailView } from "./TrackDetailView";
import { TrackRow } from "./TrackRow";
import { HomeCard } from "./HomeCard";
import { MobileHomeView } from "./MobileHomeView";
import { CreatePlaylistModal } from "./CreatePlaylistModal";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HorizontalScrollSection } from "./HorizontalScrollSection";
import { MusicLoader } from "./MusicLoader";

interface MainContentProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  liked: Set<string>;
  likedTracks: Track[];
  onSelect: (track: Track, contextQueue?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onTogglePlay: () => void;
  onQueueChange: (tracks: Track[]) => void;
  onQueueUpdateOnly: (tracks: Track[]) => void;
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
  user: any;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export default function MainContent(props: MainContentProps) {
  const {
    currentTrack, isPlaying, liked, likedTracks, onSelect, onToggleLike,
    onTogglePlay, onQueueChange, onQueueUpdateOnly, activeView, setActiveView,
    playlists, onAddToPlaylist, onRemoveFromPlaylist, activePlaylist,
    onOpenSearch, searchResults, selectedTrackDetail, onTrackDetail,
    recentlyPlayed, user, onCreatePlaylist, onDeletePlaylist,
    isShuffle,
    repeatMode,
    onToggleShuffle,
    onToggleRepeat,
  } = props;

  const [selectedGenre, setSelectedGenre] = useState("All");
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isMobile = useIsMobile();
  const profile = useUserProfile(user);

  const isPlaylistView = activeView.startsWith("playlist:");
  const isLibraryView = activeView === "library";
  const isTrackDetailView = activeView === "track-detail";
  const shouldFetchTrending = activeView === "home";

  const trendingQuery =
    selectedGenre !== "All" ? `${selectedGenre} music trending` : "Most trending music";

  const { data: apiTracks = [], isLoading: isTrendingLoading } = useSearchMusic(
    trendingQuery,
    shouldFetchTrending
  );


  // Queue update — tightened deps
  useEffect(() => {
    if (shouldFetchTrending && apiTracks.length > 0 && !currentTrack) {
      onQueueUpdateOnly(apiTracks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiTracks, shouldFetchTrending]);

  // Fetch recommended tracks
  useEffect(() => {
    if (!isTrackDetailView || !selectedTrackDetail) return;

    let cancelled = false;
    setIsRecommending(true);

    searchYouTubeMusic(`${selectedTrackDetail.artist} ${selectedTrackDetail.title} related music`)
      .then((results) => {
        if (cancelled) return;
        setRecommendedTracks(results.filter((t) => t.id !== selectedTrackDetail.id));
      })
      .finally(() => {
        if (!cancelled) setIsRecommending(false);
      });

    return () => { cancelled = true; };
  }, [isTrackDetailView, selectedTrackDetail]);

  // ─── Routing ───────────────────────────────────────────

  // Mobile home
  if (activeView === "home" && isMobile) {
    return (
      <>
        <MobileHomeView
          tracks={apiTracks}
          recentlyPlayed={recentlyPlayed}
          playlists={playlists}
          liked={liked}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          activePlaylist={activePlaylist}
          profile={profile}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
          onSelect={(t) => onSelect(t, apiTracks)}
          onToggleLike={onToggleLike}
          onTogglePlay={onTogglePlay}
          onTrackDetail={onTrackDetail}
          setActiveView={setActiveView}
          onOpenCreatePlaylist={() => setShowCreateModal(true)}
          onDeletePlaylist={onDeletePlaylist}
          isPlaylistView={isPlaylistView}
        />
        <CreatePlaylistModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreate={onCreatePlaylist}
        />
      </>
    );
  }

  // Track detail
  if (isTrackDetailView && selectedTrackDetail) {
    return (
      <TrackDetailView
        track={selectedTrackDetail}
        isPlaying={currentTrack?.id === selectedTrackDetail.id && isPlaying}
        isCurrent={currentTrack?.id === selectedTrackDetail.id}
        onTogglePlay={onTogglePlay}
        onSelect={(t) => onSelect(t, recommendedTracks)}
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

  // Library
  if (isLibraryView) {
    return (
      <LibraryView
        playlists={playlists}
        likedTracks={likedTracks}
        recentlyPlayed={recentlyPlayed}
        onSelectView={setActiveView}
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

  // Determine tracks to display for list views (for desktop/non-home views)
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
      <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-zinc-800/50 z-1000">
        <div className="flex flex-col gap-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {(isPlaylistView || activeView === "liked") && (
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeView === "liked" ? "bg-gradient-to-br from-indigo-500 to-purple-700" : "bg-zinc-800"}`}>
                  {activeView === "liked" ? <Heart size={18} className="text-white fill-white" /> : <ListMusic size={18} className="text-zinc-400" />}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{pageTitle}</h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 truncate">
                  {displayTracks.length} track{displayTracks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

              <div className="flex items-center gap-2 sm:gap-4 sm:ml-auto">
                {(isPlaylistView || activeView === "liked") && displayTracks.length > 0 && (
                  <div className="flex items-center gap-1 sm:gap-2 mr-2">
                    {/* Play Button */}
                    <Button
                      onClick={() => onSelect(displayTracks[0], displayTracks)}
                      className="bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border-none"
                    >
                      <Play size={20} fill="black" className="ml-0.5" />
                    </Button>

                    {/* Shuffle Button */}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleShuffle}
                            className={`rounded-full transition-colors ${isShuffle ? "text-[#1DB954]" : "text-zinc-500 hover:text-white"}`}
                          >
                            <Shuffle size={20} />
                          </Button>
                        }
                      />
                      <TooltipContent>{isShuffle ? "Disable shuffle" : "Enable shuffle"}</TooltipContent>
                    </Tooltip>

                    {/* Repeat Button */}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleRepeat}
                            className={`rounded-full transition-colors relative ${repeatMode !== "none" ? "text-[#1DB954]" : "text-zinc-500 hover:text-white"}`}
                          >
                            {repeatMode === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
                            {repeatMode !== "none" && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
                            )}
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {repeatMode === "none" ? "Enable repeat" : repeatMode === "all" ? "Enable repeat one" : "Disable repeat"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {isPlaylistView && activePlaylist && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeletePlaylist(activePlaylist)}
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full h-10 w-10"
                        >
                          <Trash2 size={20} />
                        </Button>
                      }
                    />
                    <TooltipContent>Delete Playlist</TooltipContent>
                  </Tooltip>
                )}

                <Button
                  variant="outline"
                  onClick={onOpenSearch}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-zinc-800 border-zinc-700 rounded-full text-xs sm:text-sm text-zinc-500 h-10 whitespace-nowrap shrink-0"
                >
                  <Search size={16} />
                  <span className="hidden sm:inline">Search tracks, artists…</span>
                  <span className="sm:hidden">Search</span>
                  <kbd className="hidden lg:flex items-center gap-1 ml-auto px-2 py-1 rounded text-xs">
                  ⌘K
                </kbd>
              </Button>
            </div>
          </div>

          {/* Genre filters (only on Home) */}
          {activeView === "home" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {GENRES.map((g) => (
                <Badge
                  key={g}
                  variant={selectedGenre === g ? "default" : "secondary"}
                  onClick={() => setSelectedGenre(g)}
                  className={`shrink-0 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors h-auto ${selectedGenre === g
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
      </div>



      {/* Track list */}
      <div className="px-4 sm:px-8 py-4">
        {isTrendingLoading ? (
          <div className="text-center text-zinc-600 py-20 flex flex-col items-center justify-center">
            {/* <Loader2 className="animate-spin mb-4" size={32} /> */}
            {/* <p className="text-base sm:text-lg font-semibold text-zinc-500">Loading tracks...</p> */}
            <MusicLoader />

          </div>
        ) : displayTracks.length === 0 ? (
          <div className="text-center text-zinc-600 py-20">
            <MusicLoader />
            <p className="text-base sm:text-lg font-semibold text-zinc-500">No tracks found</p>
          </div>
        ) : (
          activeView === "home" ? (
            <div className="space-y-6 sm:space-y-8 pb-8">
              {/* Top Grid - Recent Playlists / Liked */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {/* Liked Songs */}
                <div
                  onClick={() => setActiveView("liked")}
                  className="group bg-zinc-900 hover:bg-zinc-800 transition-all duration-300 flex items-center rounded-xl overflow-hidden cursor-pointer h-16 sm:h-18 shadow-sm hover:shadow-2xl hover:-translate-y-1 relative"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shrink-0 shadow-md group-hover:shadow-xl transition-shadow rounded-l-xl">
                    <Heart size={24} className="text-white fill-white" />
                  </div>
                  <div className="flex-1 min-w-0 px-3 sm:px-4">
                    <span className="font-bold text-white text-sm sm:text-base truncate">Liked Songs</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (likedTracks.length > 0) onSelect(likedTracks[0], likedTracks);
                    }}
                    className="absolute right-3 w-10 h-10 sm:w-11 sm:h-11 bg-[#1ed760] rounded-full flex items-center justify-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 shadow-2xl hover:scale-105 transition-all duration-200 z-20"
                  >
                    <Play size={20} className="text-black ml-0.5 fill-black" />
                  </button>
                </div>

                {/* Playlists */}
                {playlists.slice(0, 5).map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => setActiveView(`playlist:${pl.id}`)}
                    className="group bg-zinc-900 hover:bg-zinc-800 transition-all duration-300 flex items-center rounded-xl overflow-hidden cursor-pointer h-16 sm:h-18 shadow-sm hover:shadow-2xl hover:-translate-y-1 relative"
                  >
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 shadow-md group-hover:shadow-xl transition-shadow overflow-hidden rounded-l-xl">
                      {pl.tracks[0]?.thumbnail ? (
                        <img
                          src={pl.tracks[0].thumbnail}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          alt={pl.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <ListMusic size={24} className="text-zinc-500" />
                        </div>
                      )}
                      {/* Subtle inner frame */}
                      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-l-xl pointer-events-none" />
                    </div>

                    <div className="flex-1 min-w-0 px-3 sm:px-4">
                      <span className="font-bold text-white text-sm sm:text-base truncate">{pl.name}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pl.tracks.length > 0) onSelect(pl.tracks[0], pl.tracks);
                      }}
                      className="absolute right-3 w-10 h-10 sm:w-11 sm:h-11 bg-[#1ed760] rounded-full flex items-center justify-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 shadow-2xl hover:scale-105 transition-all duration-200 z-20"
                    >
                      <Play size={20} className="text-black ml-0.5 fill-black" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Recommended Stations */}
              <HorizontalScrollSection
                title="Recommended Stations"
              // onShowAll={() => console.log("Show all recommended")}
              >
                {apiTracks.slice(0, 15).map(track => (
                  <div key={`rec-${track.id}`} className="shrink-0 w-[160px] sm:w-[200px]">
                    <HomeCard
                      track={track}
                      onSelect={(t) => onSelect(t, apiTracks)}
                      title={track.artist}
                      subtitle={`With ${track.title} and more`}
                    />
                  </div>
                ))}
              </HorizontalScrollSection>

              {recentlyPlayed.length > 0 && (
                <HorizontalScrollSection
                  title="Recently played"
                // onShowAll={() => console.log("Show all recent")}
                >
                  {recentlyPlayed.map(track => (
                    <div key={`recent-${track.id}`} className="shrink-0 w-[160px] sm:w-[200px]">
                      <HomeCard
                        track={track}
                        onSelect={(t) => onSelect(t, recentlyPlayed)}
                        title={track.title}
                        subtitle={`${track.artist}`}
                      />
                    </div>
                  ))}
                </HorizontalScrollSection>
              )}

              {/* Popular radio */}
              <HorizontalScrollSection
                title="Popular radio"
              // onShowAll={() => console.log("Show all radio")}
              >
                {[...apiTracks].reverse().slice(0, 15).map(track => (
                  <div key={`pop-${track.id}`} className="shrink-0 w-[160px] sm:w-[200px]">
                    <HomeCard
                      track={track}
                      onSelect={(t) => onSelect(t, [...apiTracks].reverse())}
                      title={track.artist}
                      subtitle={`Radio based on ${track.artist}`}
                    />
                  </div>
                ))}
              </HorizontalScrollSection>

            </div>
          ) : (
            <div className="space-y-1">
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 sm:px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 mb-2 overflow-hidden">
                <span className="w-8 text-center">#</span>
                <span>Title</span>
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
                  onSelect={(t) => onSelect(t, displayTracks)}
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
          )
        )}
      </div>
    </main>
  );
}

