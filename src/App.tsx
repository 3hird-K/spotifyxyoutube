import { useState, useEffect, useCallback, useRef } from "react";
import YouTube from "react-youtube";
import { usePlayer } from "./hooks/usePlayer";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import MainContent from "./components/MainContent";
import NowPlaying from "./components/NowPlaying";
import SearchModal from "./components/SearchModal";
import { LoginScreen } from "./components/LoginScreen"; // Ensure you create this file
import { PanelRightOpen, PanelRightClose, Home, Search, Library, LogIn, LogOut } from "lucide-react";
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

  // -- Video / PIP State --
  const [isPip, setIsPip] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };



  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Helper for Guest vs Google User
  const isGuest = user?.is_anonymous;
  const displayName = isGuest ? "Guest User" : user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const avatarUrl = !isGuest && user?.user_metadata?.avatar_url ? user.user_metadata.avatar_url : null;
  const avatarInitial = displayName?.charAt(0)?.toUpperCase() || "U";

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
    setShowNowPlaying(true);
  }, []);

  const handleSelectTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    player.playArbitraryTrack(track, contextQueue);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 20);
    });
  }, [player]);

  const handleSelectFromSearch = useCallback(async (track: Track) => {
    handleSelectTrack(track);

    const related = await searchYouTubeMusic("", {
      mode: "recommend",
      videoId: track.youtubeId
    });

    if (related.length > 0) {
      const relatedFiltered = related.filter(t => 
        t.id !== track.id && 
        !t.title.toLowerCase().includes(track.title.toLowerCase())
      );
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
      let related: Track[] = [];

      if (lastTrack?.youtubeId) {
        related = await searchYouTubeMusic("", {
          mode: "recommend",
          videoId: lastTrack.youtubeId
        });
      }

      if (related.length === 0) {
        const query = lastTrack
          ? `${lastTrack.artist} top tracks`
          : "top trending music";
        related = await searchYouTubeMusic(query);
      }

      if (related.length === 0) return;

      player.setQueue((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const currentTitle = lastTrack?.title.toLowerCase();
        const fresh = related.filter((t) => 
          !existingIds.has(t.id) && 
          (!currentTitle || !t.title.toLowerCase().includes(currentTitle))
        );
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
              onSelect={(idx) => {
                 const t = player.queue[idx];
                 if (t) handleSelectTrack(t);
                 else player.selectTrack(idx);
              }}
              liked={player.liked}
              activeView={activeView}
              setActiveView={setActiveView}
              playlists={playlists}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={requestDeletePlaylist}
              recentlyPlayed={recentlyPlayed}
              onTrackDetail={handleTrackDetail}
            />

            {/* Main content */}
            <MainContent
              currentTrack={player.currentTrack}
              isPlaying={player.isPlaying}
              liked={player.liked}
              likedTracks={player.likedTracks}
              onSelect={handleSelectTrack}
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
              isShuffle={player.isShuffle}
              repeatMode={player.repeatMode}
              onToggleShuffle={player.toggleShuffle}
              onToggleRepeat={player.toggleRepeat}
            />

            <aside
              className={`transition-all duration-300 ease-in-out bg-zinc-950 border-zinc-800 shrink-0 overflow-hidden ${showNowPlaying ? "w-72 hidden lg:flex flex-col border-l border-zinc-800" : "w-0 hidden border-none opacity-0"
                }`}
            >
              {/* Inner container to maintain 72 width (18rem) even when sliding closed */}
              <div className="w-72 h-full flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    Now Playing
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          onClick={() => setShowNowPlaying(false)}
                          className="text-zinc-600 hover:text-white transition-colors hover:bg-zinc-800/50 p-2 rounded-full"
                        >
                          <PanelRightClose size={16} />
                        </button>
                      }
                    />
                    <TooltipContent side="left">Hide panel</TooltipContent>
                  </Tooltip>
                </div>

                <div className="w-full flex justify-center">
                  {player.currentTrack && (
                    <div
                      ref={videoContainerRef}
                      className={`relative overflow-hidden bg-black transition-all shadow-2xl shadow-black/50 ${isPip
                        ? "fixed bottom-[100px] aspect-video z-50 rounded-xl border border-zinc-700/50"
                        : "w-full aspect-[4/5]"
                        }`}
                    >
                      <YouTube
                        key={player.currentTrack.youtubeId}
                        videoId={player.currentTrack.youtubeId}
                        opts={{
                          width: "100%",
                          height: "100%",
                          playerVars: {
                            autoplay: 0,
                            controls: 0,
                            modestbranding: 1,
                            playsinline: 1,
                            rel: 0,
                            vq: "hd1080", // Force HD resolution
                          },
                        }}
                        className={`absolute inset-0 w-full h-full pointer-events-none transition-transform ${isPip || document.fullscreenElement ? "" : "scale-[2.2] origin-center"
                          }`}
                        onReady={player.onPlayerReady}
                        onStateChange={player.onPlayerStateChange}
                      />

                      {/* PIP Close Button overlay */}
                      {isPip && (
                        <button
                          onClick={() => setIsPip(false)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                        >
                          <PanelRightClose size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* ----------------------------- */}

                {/* Track Info Below the Video */}
                <NowPlaying
                  track={player.currentTrack}
                  liked={player.liked}
                  onToggleLike={player.toggleLike}
                />

                {/* User Profile Card (from previous step) */}
                <div className="mt-auto p-3 border-t border-zinc-800/50">
                  <div className="bg-zinc-900/50 rounded-lg p-2.5 border border-zinc-800 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors duration-200 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : null}
                      {!avatarUrl && (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                          {avatarInitial}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-sm font-bold text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
                        {isGuest ? "Free Account" : "Premium"}
                      </p>
                    </div>
                    {isGuest ? (
                      <button onClick={() => supabase.auth.signOut()} className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors" title="Log in to Sync">
                        <LogIn size={16} />
                      </button>
                    ) : (
                      <button onClick={handleLogout} className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Sign out">
                        <LogOut size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* DELETE THE HIDDEN YOUTUBE ENGINE THAT WAS DOWN HERE! */}
            {/* // )} */}

            {!showNowPlaying && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setShowNowPlaying(true)}
                      className="fixed right-4 bottom-24 z-20 hidden lg:flex rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 shadow-lg p-3 items-center justify-center"
                    >
                      <PanelRightOpen size={16} />
                    </button>
                  }
                />
                <TooltipContent side="left">Show Now Playing</TooltipContent>
              </Tooltip>
            )}
          </div>



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
              onTogglePip={() => setIsPip(!isPip)}
              onToggleFullscreen={toggleFullscreen}
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
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${activeView === view ? "text-white" : "text-zinc-500 hover:text-zinc-300"
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