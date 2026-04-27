import { useState, useEffect, useCallback } from "react";
import YouTube from "react-youtube";
import { usePlayer } from "./hooks/usePlayer";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import MainContent from "./components/MainContent";
import NowPlaying from "./components/NowPlaying";
import SearchModal from "./components/SearchModal";
import { PanelRightOpen, PanelRightClose, Home, Search, Library } from "lucide-react";
import { searchYouTubeMusic } from "./utils/youtube";
import { Playlist } from "./data/playlists";
import { Track } from "./data/tracks";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null);
  const [showNowPlaying, setShowNowPlaying] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  // ── Playlist state (persisted to localStorage) ───────────────────────────
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const stored = localStorage.getItem("spotube_playlists");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("spotube_playlists", JSON.stringify(playlists));
  }, [playlists]);

  // Keyboard shortcut for search modal (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreatePlaylist = useCallback((name: string) => {
    const pl: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      tracks: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [...prev, pl]);
  }, []);

  const handleDeletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
  }, []);

  const handleAddToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? {
              ...pl,
              tracks: pl.tracks.find((t) => t.id === track.id)
                ? pl.tracks
                : [...pl.tracks, track],
            }
          : pl
      )
    );
  }, []);

  const handleRemoveFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) }
          : pl
      )
    );
  }, []);

  // ── Player ────────────────────────────────────────────────────────────────
  const player = usePlayer([]);

  const handleTrackDetail = useCallback((track: Track) => {
    setSelectedTrackDetail(track);
    setActiveView("track-detail");
  }, []);

  // Handle track selection from search modal (fetch related tracks)
  const handleSelectFromSearch = useCallback(async (track: Track) => {
    player.playArbitraryTrack(track);
    
    // Add to recently played
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 20); // Keep last 20
    });
    
    // Fetch related tracks
    const query = `${track.artist} ${track.title} music`;
    const related = await searchYouTubeMusic(query);
    
    if (related.length > 0) {
      const relatedFiltered = related.filter(t => t.id !== track.id);
      setSearchResults([track, ...relatedFiltered]);
      player.setQueue([track, ...relatedFiltered]);
    } else {
      setSearchResults([track]);
      player.setQueue([track]);
    }
    
    // Switch to search results view
    setActiveView("search-results");
  }, [player]);

  // Inject the exhausted-queue handler: fetch related tracks and keep playing
  useEffect(() => {
    player.onExhaustedRef.current = async (lastTrack) => {
      const query = lastTrack
        ? `${lastTrack.artist} ${lastTrack.title} music`
        : "top trending music";

      const related = await searchYouTubeMusic(query);
      if (related.length === 0) return;

      player.setQueue((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const fresh = related.filter((t) => !existingIds.has(t.id));
        if (fresh.length === 0) return prev;

        const nextIdx = prev.length;
        setTimeout(() => player.selectTrack(nextIdx), 0);

        return [...prev, ...fresh];
      });
    };
  }); // runs every render so the closure always has the latest player state

  // Derive the active playlist (if viewing one)
  const activePlaylistId = activeView.startsWith("playlist:")
    ? activeView.replace("playlist:", "")
    : null;
  const activePlaylist = playlists.find((pl) => pl.id === activePlaylistId) ?? null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-dvh bg-black text-white overflow-hidden">
        {/* Main layout (sidebar + content + now-playing panel) */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar (Desktop) */}
          <Sidebar
            queue={player.queue}
            currentIndex={player.currentIndex}
            onSelect={player.selectTrack}
            liked={player.liked}
            activeView={activeView}
            setActiveView={setActiveView}
            playlists={playlists}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            recentlyPlayed={recentlyPlayed}
            onTrackDetail={handleTrackDetail}
          />

          {/* Main content */}
          <MainContent
            currentTrack={player.currentTrack}
            isPlaying={player.isPlaying}
            liked={player.liked}
            queue={player.queue}
            onSelect={(track) => player.playArbitraryTrack(track)}
            onToggleLike={player.toggleLike}
            onTogglePlay={player.togglePlay}
            onQueueChange={player.setQueue}
            activeView={activeView}
            playlists={playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            activePlaylist={activePlaylist}
            onOpenSearch={() => setIsSearchOpen(true)}
            searchResults={searchResults}
            selectedTrackDetail={selectedTrackDetail}
            onTrackDetail={handleTrackDetail}
            recentlyPlayed={recentlyPlayed}
          />

          {/* Now playing panel */}
          {showNowPlaying && (
            <aside className="hidden lg:flex w-72 bg-zinc-950 border-l border-zinc-800 flex-col shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-5 pb-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                  Now Playing
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setShowNowPlaying(false)}
                        className="text-zinc-600 hover:text-white transition-colors"
                      />
                    }
                  >
                    <PanelRightClose size={16} />
                  </TooltipTrigger>
                  <TooltipContent side="left">Hide panel</TooltipContent>
                </Tooltip>
              </div>
              <NowPlaying
                track={player.currentTrack}
                liked={player.liked}
                onToggleLike={player.toggleLike}
              />
            </aside>
          )}

          {/* Toggle now-playing button (when panel is closed) */}
          {!showNowPlaying && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNowPlaying(true)}
                    className="fixed right-4 bottom-24 z-20 hidden lg:flex rounded-full bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 shadow-lg"
                  />
                }
              >
                <PanelRightOpen size={16} />
              </TooltipTrigger>
              <TooltipContent side="left">Show Now Playing</TooltipContent>
            </Tooltip>
          )}
        </div>

        {player.currentTrack && (
          <YouTube
            key={player.currentTrack.youtubeId}
            videoId={player.currentTrack.youtubeId}
            opts={{
              height: "0",
              width: "0",
              playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
              },
            }}
            onReady={player.onPlayerReady}
            onStateChange={player.onPlayerStateChange}
            className="hidden"
          />
        )}

        {/* Player bar */}
        <PlayerBar
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={player.progress}
          currentTime={player.currentTime}
          volume={player.volume}
          isMuted={player.isMuted}
          isShuffle={player.isShuffle}
          repeatMode={player.repeatMode}
          liked={player.liked}
          onTogglePlay={player.togglePlay}
          onNext={() => player.handleNext()}
          onPrev={player.handlePrev}
          onSeek={player.seek}
          onVolumeChange={player.setVolume}
          onToggleMute={player.toggleMute}
          onToggleShuffle={player.toggleShuffle}
          onToggleRepeat={player.toggleRepeat}
          onToggleLike={player.toggleLike}
        />

        {/* Mobile Nav (Bottom) */}
        <nav className="md:hidden bg-zinc-900 border-t border-zinc-800 shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-4">
            {[
              { icon: Home, label: "Home", view: "home" },
              { icon: Search, label: "Search", view: "search" },
              { icon: Library, label: "Library", view: "library" },
            ].map(({ icon: Icon, label, view }) => (
              <Button
                key={view}
                variant="ghost"
                onClick={() => setActiveView(view)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                  activeView === view ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={24} />
                <span className="text-[10px] font-medium">{label}</span>
              </Button>
            ))}
          </div>
        </nav>

        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectTrack={handleSelectFromSearch}
          liked={player.liked}
          onToggleLike={player.toggleLike}
        />
      </div>
    </TooltipProvider>
  );
}
