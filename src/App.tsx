import { useState, useEffect, useCallback, useRef } from "react";
import YouTube from "react-youtube";
import { usePlayer } from "./hooks/usePlayer";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import MainContent from "./components/MainContent";
import NowPlaying from "./components/NowPlaying";
import SearchModal from "./components/SearchModal";
import { LoginScreen } from "./components/LoginScreen"; // Ensure you create this file
import { MobilePlayer } from "./components/MobilePlayer";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";
import { PanelRightOpen, PanelRightClose, Home, Search, Library, LogIn, LogOut, Plus, ListMusic, Pencil } from "lucide-react";
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
import { Input } from "./components/ui/input";

export default function App() {

  // ── Auth State ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState("home");
  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null);
  const [showNowPlaying, setShowNowPlaying] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentSearchTracks, setRecentSearchTracks] = useState<Track[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

  // ── Recently Played state ────────────────────────────────────────────────
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    try {
      const stored = localStorage.getItem("spotube_recently_played");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // ── Player ────────────────────────────────────────────────────────────────
  const player = usePlayer([], user);

  const handleTrackDetail = useCallback((track: Track) => {
    setSelectedTrackDetail(track);
    setActiveView("track-detail");
    setShowNowPlaying(true);
  }, []);

  const handleSelectTrack = useCallback(async (track: Track, contextQueue?: Track[]) => {
    player.playArbitraryTrack(track, contextQueue);

    // Update local state
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 20);
    });

    // Supabase update if logged in
    if (user && !user.is_anonymous) {
      const { error } = await supabase
        .from("recently_played")
        .upsert({
          user_id: user.id,
          track_id: track.id,
          track_data: track as any,
          played_at: new Date().toISOString()
        }, { onConflict: 'user_id,track_id' });

      if (error) console.error("Error saving to recently played:", error);
    }
  }, [player, user]);

  const handleSelectFromSearch = useCallback(async (track: Track, query?: string) => {
    handleSelectTrack(track);

    // Save search query if provided
    if (query && query.trim()) {
      const trimmed = query.trim();
      setRecentSearches(prev => {
        const filtered = prev.filter(q => q !== trimmed);
        return [trimmed, ...filtered].slice(0, 10);
      });

      // Update recent search tracks (the actual item clicked)
      setRecentSearchTracks(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 10);
      });

      if (user && !user.is_anonymous) {
        // Save query
        await supabase.from("recent_searches").insert({
          user_id: user.id,
          query: trimmed
        });

        // Save track item
        await supabase.from("recent_search_items").upsert({
          user_id: user.id,
          track_id: track.id,
          track_data: track as any,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id,track_id' });
      }
    }

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

    // Go directly to track detail view to show recommendations
    handleTrackDetail(track);
  }, [player, handleTrackDetail, user, handleSelectTrack]);

  const handleRemoveRecentSearch = useCallback(async (trackId: string) => {
    setRecentSearchTracks(prev => prev.filter(t => t.id !== trackId));

    if (user && !user.is_anonymous) {
      await supabase
        .from("recent_search_items")
        .delete()
        .eq("user_id", user.id)
        .eq("track_id", trackId);
    }
  }, [user]);

  // Sync playlists from Supabase if logged in
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const fetchPlaylists = async () => {
      const { data: dbPlaylists, error } = await supabase
        .from("playlists")
        .select(`
          *,
          playlist_tracks (
            track_data
          )
        `)
        .order("created_at", { ascending: true });

      if (error || !dbPlaylists) {
        console.error("Error fetching playlists:", error);
        return;
      }

      const formatted: Playlist[] = dbPlaylists.map((pl: any) => ({
        id: pl.id,
        name: pl.name,
        description: pl.description || "",
        tracks: (pl.playlist_tracks || []).map((t: any) => t.track_data as unknown as Track),
        createdAt: pl.created_at ? new Date(pl.created_at).getTime() : Date.now(),
      }));

      setPlaylists(formatted);
    };

    fetchPlaylists();
  }, [user]);

  // Persist to localStorage for Guest users
  useEffect(() => {
    if (!user || user.is_anonymous) {
      localStorage.setItem("spotube_playlists", JSON.stringify(playlists));
      localStorage.setItem("spotube_recently_played", JSON.stringify(recentlyPlayed));
    }
  }, [playlists, recentlyPlayed, user]);

  // Sync recent searches from Supabase if logged in
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const fetchRecentSearches = async () => {
      const { data, error } = await supabase
        .from("recent_searches")
        .select("query")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recent searches:", error);
        return;
      }

      setRecentSearches(data.map(d => d.query));
    };

    fetchRecentSearches();
  }, [user]);

  // Sync recent search items (tracks) from Supabase if logged in
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const fetchRecentSearchTracks = async () => {
      const { data, error } = await supabase
        .from("recent_search_items")
        .select("track_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data) {
        console.error("Error fetching recent search items:", error);
        return;
      }

      setRecentSearchTracks(data.map((d: any) => d.track_data as unknown as Track));
    };

    fetchRecentSearchTracks();
  }, [user]);

  // Sync recently played from Supabase if logged in
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const fetchRecentlyPlayed = async () => {
      const { data, error } = await supabase
        .from("recently_played")
        .select("track_data")
        .eq("user_id", user.id)
        .order("played_at", { ascending: false })
        .limit(20);

      if (error || !data) {
        console.error("Error fetching recently played:", error);
        return;
      }

      const tracks = data.map((d: any) => d.track_data as unknown as Track);
      // Strictly limit to 20 most recent
      const limitedTracks = tracks.slice(0, 20);
      setRecentlyPlayed(limitedTracks);

      // Load last played song into player bar if nothing is playing
      if (limitedTracks.length > 0 && player.currentIndex === -1) {
        player.loadTrack(limitedTracks[0], limitedTracks);
      }
    };

    fetchRecentlyPlayed();
  }, [user, player.loadTrack]);

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

  const handleCreatePlaylist = useCallback(async (name: string) => {
    const tempId = `pl_${Date.now()}`;
    const newPl: Playlist = {
      id: tempId,
      name,
      tracks: [],
      createdAt: Date.now(),
    };

    // Optimistic update
    setPlaylists((prev) => [...prev, newPl]);

    // Supabase update if logged in
    if (user && !user.is_anonymous) {
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          name,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating playlist in DB:", error);
        // Revert on error
        setPlaylists((prev) => prev.filter(p => p.id !== tempId));
      } else if (data) {
        // Update with real ID
        setPlaylists((prev) => prev.map(p => p.id === tempId ? { ...p, id: data.id } : p));
      }
    }
  }, [user]);

  const handleDeletePlaylist = useCallback(async (id: string) => {
    // Optimistic update
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
    if (activeView === `playlist:${id}`) {
      setActiveView("home");
    }

    // Supabase update
    if (user && !user.is_anonymous) {
      const { error } = await supabase
        .from("playlists")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting playlist:", error);
        // Refresh from DB on error
        const { data } = await supabase.from("playlists").select("*");
        if (data) setPlaylists(data as any);
      }
    }
  }, [activeView, user]);

  const handleUpdatePlaylist = useCallback(async (id: string, newName: string, newDescription?: string) => {
    // Optimistic update
    setPlaylists((prev) => prev.map((pl) => (pl.id === id ? { ...pl, name: newName, description: newDescription } : pl)));

    // Supabase update
    if (user && !user.is_anonymous) {
      const { error } = await supabase
        .from("playlists")
        .update({
          name: newName,
          description: newDescription
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating playlist:", error);
        // Refresh from DB on error
        const { data } = await supabase.from("playlists").select("*");
        if (data) setPlaylists(data as any);
      }
    }
  }, [user]);

  const requestDeletePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setShowDeleteConfirm(true);
  }, []);

  const handleAddToPlaylist = useCallback(async (playlistId: string, track: Track) => {
    // Optimistic update
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

    // Supabase update
    if (user && !user.is_anonymous) {
      const { error } = await supabase
        .from("playlist_tracks")
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          track_data: track as any,
        });

      if (error && error.code !== '23505') { // Ignore unique constraint violation
        console.error("Error adding track to playlist:", error);
      }
    }
  }, [user]);

  const handleRemoveFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    // Optimistic update
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) }
          : pl
      )
    );

    // Supabase update
    if (user && !user.is_anonymous) {
      const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("track_id", trackId);

      if (error) {
        console.error("Error removing track from playlist:", error);
      }
    }
  }, [user]);




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
              onEditPlaylist={(pl) => {
                setPlaylistToEdit(pl);
                setShowEditModal(true);
              }}
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
              onEditPlaylist={(pl) => {
                setPlaylistToEdit(pl);
                setShowEditModal(true);
              }}
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
              showCreateModal={showCreateModal}
              setShowCreateModal={setShowCreateModal}
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
                  {/* The video is now rendered globally below to support background playback */}
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

          {/* Mobile Player bar */}
          <MobilePlayer
            track={player.currentTrack}
            isPlaying={player.isPlaying}
            isLiked={player.currentTrack ? player.liked.has(player.currentTrack.id) : false}
            progress={player.progress}
            onTogglePlay={player.togglePlay}
            onToggleLike={player.toggleLike}
            onTrackDetail={handleTrackDetail}
            onNext={() => player.handleNext()}
            onPrev={player.handlePrev}
          />

          {/* Mobile Nav */}
          <nav className="md:hidden bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 shrink-0 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-4">
              {[
                { icon: Home, label: "Home", view: "home" },
                {
                  icon: Plus,
                  label: "Playlist",
                  onClick: () => setShowCreateModal(true),
                  view: "none" // Don't switch view
                },
                { icon: Library, label: "Library", view: "library" },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      setActiveView(item.view);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${activeView === item.view ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  <item.icon size={24} />
                  <span className="text-[10px] font-medium">{item.label}</span>
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
          recentSearches={recentSearchTracks}
          onRemoveRecent={handleRemoveRecentSearch}
        />

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreate={handleCreatePlaylist}
        />

        {/* Edit Playlist Modal (Spotify Style) */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-[#282828] border-none text-white max-w-[524px] p-6 gap-0 rounded-lg">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold">Edit details</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4">
              {/* Playlist Artwork Cover */}
              <div className="w-[180px] h-[180px] bg-[#333] rounded shadow-2xl flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                {playlistToEdit?.tracks?.[0]?.thumbnail ? (
                  <img src={playlistToEdit.tracks[0].thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <ListMusic size={64} className="text-[#b3b3b3]" />
                )}
              </div>

              {/* Form Fields */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative group">
                  <label className="absolute left-3 top-1 text-[10px] font-bold text-zinc-400 opacity-0 group-focus-within:opacity-100 transition-opacity">Name</label>
                  <Input
                    value={playlistToEdit?.name || ""}
                    onChange={(e) => setPlaylistToEdit(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Add a name"
                    className="bg-[#3e3e3e] border-none text-white placeholder:text-zinc-500 h-10 pt-1 focus-visible:ring-1 focus-visible:ring-zinc-500"
                  />
                </div>
                <div className="relative flex-1">
                  <textarea
                    value={playlistToEdit?.description || ""}
                    onChange={(e) => setPlaylistToEdit(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Add an optional description"
                    className="w-full h-[108px] bg-[#3e3e3e] border-none text-white placeholder:text-zinc-500 p-3 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex justify-end">
                <Button
                  className="bg-white hover:bg-zinc-200 text-black font-bold rounded-full px-8 py-6 h-12"
                  onClick={() => {
                    if (playlistToEdit) {
                      handleUpdatePlaylist(playlistToEdit.id, playlistToEdit.name, playlistToEdit.description);
                      setShowEditModal(false);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Master YouTube Player (Single Instance for Background & Visual Play) */}
        {player.currentTrack && (
          <div
            ref={videoContainerRef}
            className={`${
              isPip || document.fullscreenElement
                ? "fixed z-50 rounded-xl border border-zinc-700/50 bg-black shadow-2xl overflow-hidden pointer-events-auto"
                : "fixed pointer-events-none overflow-hidden opacity-0"
            }`}
            style={{
              width: isPip ? '320px' : (document.fullscreenElement ? '100vw' : '1px'),
              height: isPip ? '180px' : (document.fullscreenElement ? '100vh' : '1px'),
              bottom: isPip ? '100px' : (document.fullscreenElement ? '0' : '-10px'),
              right: isPip ? '16px' : (document.fullscreenElement ? '0' : '-10px'),
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <YouTube
              key={player.currentTrack.youtubeId}
              videoId={player.currentTrack.youtubeId}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  modestbranding: 1,
                  playsinline: 1,
                  rel: 0,
                  vq: "hd1080",
                },
              }}
              className="w-full h-full"
              onReady={player.onPlayerReady}
              onStateChange={player.onPlayerStateChange}
            />
            {isPip && !document.fullscreenElement && (
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
    </TooltipProvider>
  );
}
