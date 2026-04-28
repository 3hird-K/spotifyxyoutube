import { useState, useEffect, useCallback } from "react";
import YouTube from "react-youtube";
import { usePlayer } from "./hooks/usePlayer";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import MainContent from "./components/MainContent";
import NowPlaying from "./components/NowPlaying";
import SearchModal from "./components/SearchModal";
import { LoginScreen } from "./components/LoginScreen"; // Ensure you create this file
import { PanelRightOpen, PanelRightClose, Home, Search, Library } from "lucide-react";
import { searchYouTubeMusic } from "./utils/youtube";
import { supabase } from "./lib/supabase"; // Your supabase client
import { Playlist } from "./data/playlists";
import { Track } from "./data/tracks";

import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function App() {
  // ── Auth State ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState("home");
  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null);
  const [showNowPlaying, setShowNowPlaying] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  
  // -- Global Delete Confirm State --
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Auth Logic (Supabase) ────────────────────────────────────────────────
  useEffect(() => {
    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    // 2. Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    if (activeView === `playlist:${id}`) {
      setActiveView("home");
    }
  }, [activeView]);

  const requestDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setShowDeleteConfirm(true);
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

  const handleSelectFromSearch = useCallback(async (track: Track) => {
    player.playArbitraryTrack(track);
    
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 20);
    });
    
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
    
    setActiveView("search-results");
  }, [player]);

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
  });

  const activePlaylistId = activeView.startsWith("playlist:")
    ? activeView.replace("playlist:", "")
    : null;
  const activePlaylist = playlists.find((pl) => pl.id === activePlaylistId) ?? null;

  // Prevent UI flickering while checking auth
  if (isAuthLoading) return <div className="h-dvh bg-black" />;

  return (
    <TooltipProvider>
      <div className="relative h-dvh w-full bg-black overflow-hidden">
        
        {/* 1. LOGIN OVERLAY (Hidden if user is logged in) */}
        {!user && <LoginScreen />}

        {/* 2. MAIN APP CONTENT (Blurred if no user) */}
        <div className={`flex flex-col h-full transition-all duration-700 ease-in-out ${!user ? "blur-2xl scale-110 pointer-events-none select-none" : "blur-0 scale-100"}`}>
          
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <Sidebar
              onSelect={player.selectTrack}
              liked={player.liked}
              activeView={activeView}
              setActiveView={setActiveView}
              playlists={playlists}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={requestDeletePlaylist}
              recentlyPlayed={recentlyPlayed}
              onTrackDetail={handleTrackDetail}
              user={user}
              currentTrack={player.currentTrack}
            />

            {/* Main content */}
            <MainContent
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              liked={player.liked}
              likedTracks={player.likedTracks}
              onSelect={(track) => player.playArbitraryTrack(track)}
              onToggleLike={player.toggleLike}
              onTogglePlay={player.togglePlay}
              onQueueChange={player.setQueue}
              onQueueUpdateOnly={player.setQueueOnly}
              activeView={activeView}
              setActiveView={setActiveView}
              playlists={playlists}
              onAddToPlaylist={handleAddToPlaylist}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
              activePlaylist={activePlaylist}
              onOpenSearch={() => setIsSearchOpen(true)}
              searchResults={searchResults}
              selectedTrackDetail={selectedTrackDetail}
              onTrackDetail={handleTrackDetail}
              recentlyPlayed={recentlyPlayed}
              user={user}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={requestDeletePlaylist}
            />

            {/* Now playing panel */}
            {showNowPlaying && (
              <aside className="hidden lg:flex w-72 bg-zinc-950 border-l border-zinc-800 flex-col shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    Now Playing
                  </span>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => setShowNowPlaying(false)}
                        className="text-zinc-600 hover:text-white transition-colors hover:bg-zinc-800/50 p-2"
                      >
                         <PanelRightClose size={16} />
                      </button>
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

            {!showNowPlaying && (
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => setShowNowPlaying(true)}
                    className="fixed right-4 bottom-24 z-20 hidden lg:flex rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 shadow-lg p-3 items-center justify-center"
                  >
                     <PanelRightOpen size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Show Now Playing</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* YouTube Engine */}
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
          <div className="hidden md:block">
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
              onTrackDetail={handleTrackDetail}
            />
          </div>

          {/* Mobile Nav */}
          <nav className="md:hidden bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 shrink-0 pb-[env(safe-area-inset-bottom)]">
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
        </div>

        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectTrack={handleSelectFromSearch}
          liked={player.liked}
          onToggleLike={player.toggleLike}
        />

        {/* Global Delete Playlist Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-zinc-900 border border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Playlist</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-zinc-400">
                Are you sure you want to delete <span className="text-white font-bold">"{playlistToDelete?.name}"</span>? 
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (playlistToDelete) {
                    handleDeletePlaylist(playlistToDelete.id);
                    setShowDeleteConfirm(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}