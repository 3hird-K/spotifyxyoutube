import { useState, useEffect } from "react";
import {
  Search, Play, Clock, Heart, Loader2, Trash2, ListMusic, Shuffle, Repeat, Repeat1, Pause,
} from "lucide-react";
import { RepeatMode } from "../hooks/usePlayer";
import { Track, GENRES } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { useSearchMusic } from "../hooks/useSearchMusic";
import { searchYouTubeMusic, getArtistDetails, searchYouTubeArtistThumbnail } from "../utils/youtube";
import axios from "axios";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFollowedArtists } from "../hooks/useFollowedArtists";

import { LibraryView } from "./LibraryView";
import { TrackDetailView } from "./TrackDetailView";
import { ArtistDetailView } from "./ArtistDetailView";
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
  onEditPlaylist: (playlist: Playlist) => void;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSearchArtist?: (query: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  recentSearches?: string[];
  recentSearchTracks?: Track[];
}

const ArtistCard = ({ artist, onSelect }: { artist: any; onSelect: () => void }) => {
  const [realThumbnail, setRealThumbnail] = useState(artist.thumbnail);

  useEffect(() => {
    let isMounted = true;
    const fetchRealProfile = async () => {
      const extractChannelId = (url: string | undefined): string | null => {
        if (!url) return null;
        try {
          const cleanUrl = url.split("?")[0].replace(/\/$/, "");
          return cleanUrl.split("/").pop() || null;
        } catch {
          return null;
        }
      };

      let channelId = extractChannelId(artist.youtubeArtistUrl);
      if (!channelId && artist.track?.youtubeArtistUrl) {
        channelId = extractChannelId(artist.track.youtubeArtistUrl);
      }

      if (channelId && isMounted) {
        const data = await getArtistDetails(channelId);
        if (isMounted && data.thumbnailUrl) {
          setRealThumbnail(data.thumbnailUrl);
        }
      } else if (isMounted) {
        const thumbnail = await searchYouTubeArtistThumbnail(artist.name);
        if (isMounted && thumbnail) {
          setRealThumbnail(thumbnail);
        }
      }
    };
    fetchRealProfile();
    return () => {
      isMounted = false;
    };
  }, [artist.name, artist.youtubeArtistUrl]);

  // Clean protocol-relative URLs
  const cleanUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith("//")) return `https:${url}`;
    return url;
  };

  const currentThumbnail = cleanUrl(realThumbnail) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name)}`;

  const artistTrack = artist.track || {
    id: `artist-${artist.name}`,
    youtubeId: "",
    title: `Songs by ${artist.name}`,
    artist: artist.name,
    album: "Recommended Artist",
    duration: 0,
    thumbnail: currentThumbnail,
    genre: "Pop",
    year: new Date().getFullYear(),
    youtubeUrl: artist.youtubeArtistUrl,
  };

  const updatedTrack = { ...artistTrack, thumbnail: currentThumbnail };

  return (
    <HomeCard
      track={updatedTrack}
      onSelect={onSelect}
      title={artist.name}
      subtitle="Artist"
      rounded={true}
    />
  );
};

const getInitials = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const SuggestedArtistItem = ({ artist, onSelect }: { artist: any; onSelect: () => void }) => {
  const [thumbnail, setThumbnail] = useState(artist.thumbnail);

  useEffect(() => {
    let isMounted = true;
    const fetchRealPic = async () => {
      const pic = await searchYouTubeArtistThumbnail(artist.name);
      if (isMounted && pic) {
        setThumbnail(pic);
      }
    };
    if (artist.name) {
      fetchRealPic();
    }
  }, [artist.name]);

  return (
    <div
      onClick={onSelect}
      className="group p-4 bg-zinc-900/40 hover:bg-zinc-800/60 rounded-2xl border border-transparent hover:border-zinc-800 transition-all duration-300 cursor-pointer select-none text-center flex flex-col items-center gap-3 relative shadow-sm hover:shadow-xl hover:-translate-y-1 h-full flex-1"
    >
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shrink-0 shadow-lg group-hover:shadow-2xl transition-shadow bg-zinc-800 relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt={artist.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800 text-2xl font-black">
            {getInitials(artist.name)}
          </div>
        )}
      </div>
      <div className="w-full">
        <p className="text-sm font-bold text-white group-hover:text-[#1ed760] transition-colors truncate mb-0.5">
          {artist.name}
        </p>
        <p className="text-xs text-zinc-500 font-medium truncate">Suggested Artist</p>
      </div>
    </div>
  );
};

export default function MainContent(props: MainContentProps) {
  const {
    currentTrack, isPlaying, liked, likedTracks, onSelect, onToggleLike,
    onTogglePlay, onQueueChange, onQueueUpdateOnly, activeView, setActiveView,
    playlists, onAddToPlaylist, onRemoveFromPlaylist, activePlaylist,
    onOpenSearch, searchResults, selectedTrackDetail, onTrackDetail,
    recentlyPlayed, user, onCreatePlaylist, onDeletePlaylist, onEditPlaylist,
    isShuffle,
    repeatMode,
    onToggleShuffle,
    onToggleRepeat,
    onSearchArtist,
    showCreateModal,
    setShowCreateModal,
    recentSearches,
    recentSearchTracks,
  } = props;

  const [selectedGenre, setSelectedGenre] = useState("All");
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<{ name: string; thumbnail?: string; youtubeArtistUrl?: string } | null>(null);

  const isMobile = useIsMobile();
  const profile = useUserProfile(user);
  const { followedArtists = [], toggleFollowArtist, isFollowing } = useFollowedArtists(user);

  const isPlaylistView = activeView.startsWith("playlist:");
  const isLibraryView = activeView === "library";
  const isTrackDetailView = activeView === "track-detail";
  const shouldFetchTrending = activeView === "home";

  const trendingQuery =
    selectedGenre !== "All" ? `${selectedGenre} music trending` : "New singles as of 2026";

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

  const [suggestedSongs, setSuggestedSongs] = useState<Track[]>([]);
  useEffect(() => {
    let isMounted = true;
    const isCompilation = (title: string) => {
      const t = title.toLowerCase();
      return (
        t.includes("mix") ||
        t.includes("playlist") ||
        t.includes("compilation") ||
        t.includes("full album") ||
        t.includes("top songs of") ||
        t.includes("most streamed") ||
        t.includes("non-stop") ||
        t.includes("nonstop") ||
        t.includes("best of") ||
        t.includes("top 10") ||
        t.includes("top 5") ||
        t.includes("megamix")
      );
    };

    const fetchSuggestedSongs = async () => {
      try {
        const artistsToFetch: string[] = [];
        if (followedArtists && followedArtists.length > 0) {
          followedArtists.forEach(fa => {
            if (fa.name && !artistsToFetch.includes(fa.name)) {
              artistsToFetch.push(fa.name);
            }
          });
        }

        const fallbackArtists = [
          "Sabrina Carpenter", "Bruno Mars", "Billie Eilish", "The Weeknd",
          "SZA", "Dua Lipa", "Post Malone", "Taylor Swift", "Drake",
          "Rihanna", "Justin Bieber", "Ariana Grande", "Lady Gaga", "Coldplay",
          "Ed Sheeran", "Beyoncé"
        ];

        for (const name of fallbackArtists) {
          if (artistsToFetch.length >= 15) break;
          if (!artistsToFetch.includes(name)) {
            artistsToFetch.push(name);
          }
        }

        const uniqueFiltered: Track[] = [];
        const seenTitles = new Set<string>();
        const seenIds = new Set<string>();

        for (const artistName of artistsToFetch) {
          if (uniqueFiltered.length >= 15) break;

          const results = await searchYouTubeMusic(`${artistName} official music`);
          const filtered = (results || []).filter(t => !isCompilation(t.title));

          for (const t of filtered) {
            const lowerTitle = t.title.toLowerCase().trim().replace(/official video|music video|official audio|\(|\)|\[|\]/g, "").trim();
            if (!seenTitles.has(lowerTitle) && !seenIds.has(t.id)) {
              seenTitles.add(lowerTitle);
              seenIds.add(t.id);
              uniqueFiltered.push(t);
              break; // take exactly 1 unique song per artist
            }
          }
        }

        if (uniqueFiltered.length < 15) {
          const fallbackResults = await searchYouTubeMusic("top chart official music video 2026");
          const filteredFallback = (fallbackResults || []).filter(t => !isCompilation(t.title));
          for (const t of filteredFallback) {
            if (uniqueFiltered.length >= 15) break;
            const lowerTitle = t.title.toLowerCase().trim().replace(/official video|music video|official audio|\(|\)|\[|\]/g, "").trim();
            if (!seenTitles.has(lowerTitle) && !seenIds.has(t.id)) {
              seenTitles.add(lowerTitle);
              seenIds.add(t.id);
              uniqueFiltered.push(t);
            }
          }
        }

        if (isMounted && uniqueFiltered.length > 0) {
          setSuggestedSongs(uniqueFiltered.slice(0, 15));
        }
      } catch (err) {
        console.error("Error fetching suggested songs:", err);
      }
    };
    fetchSuggestedSongs();
    return () => { isMounted = false; };
  }, [recentSearchTracks, recentSearches, recentlyPlayed, likedTracks, apiTracks, followedArtists]);

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
          onOpenSearch={onOpenSearch}
        />
      </>
    );
  }

  // Artist detail
  if (activeView === "artist-detail" && selectedArtist) {
    return (
      <ArtistDetailView
        artist={selectedArtist}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        onSelect={onSelect}
        onTogglePlay={onTogglePlay}
        onToggleLike={onToggleLike}
        liked={liked}
        isFollowingArtist={isFollowing}
        onToggleFollowArtist={toggleFollowArtist}
        playlists={playlists}
        onAddToPlaylist={onAddToPlaylist}
        onTrackDetail={onTrackDetail}
      />
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
        isFollowingArtist={isFollowing}
        onToggleFollowArtist={toggleFollowArtist}
      />
    );
  }

  // Following Artists view
  if (activeView === "following") {
    const fallbackArtists = [
      { name: "Sabrina Carpenter" },
      { name: "Bruno Mars" },
      { name: "Billie Eilish" },
      { name: "The Weeknd" },
      { name: "SZA" },
      { name: "Dua Lipa" },
      { name: "Post Malone" },
      { name: "Taylor Swift" },
      { name: "Drake" },
      { name: "Rihanna" },
      { name: "Justin Bieber" },
      { name: "Ariana Grande" },
      { name: "Lady Gaga" },
      { name: "Coldplay" },
      { name: "Ed Sheeran" },
      { name: "Beyoncé" }
    ];

    const isFollowed = (artistName: string) => {
      if (!artistName) return false;
      const t = artistName.toLowerCase().trim();
      const cleanT = t.replace(/\s*-\s*topic$/, "").replace(/official$/, "").trim();

      return (followedArtists || []).some((fa) => {
        if (!fa.name) return false;
        const fan = fa.name.toLowerCase().trim();
        const cleanFan = fan.replace(/\s*-\s*topic$/, "").replace(/official$/, "").trim();

        return (
          cleanT === cleanFan ||
          cleanT.includes(cleanFan) ||
          cleanFan.includes(cleanT)
        );
      });
    };

    const suggested: any[] = [];
    const seenSuggested = new Set<string>();

    fallbackArtists.forEach((fa) => {
      if (suggested.length >= 15) return;
      const lower = fa.name.toLowerCase().trim();
      if (!isFollowed(fa.name) && !seenSuggested.has(lower)) {
        seenSuggested.add(lower);
        suggested.push(fa);
      }
    });

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 select-none">
        <div className="pb-24 max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Following</h1>
            <p className="text-sm text-zinc-400">Manage the artists you follow and discover new ones</p>
          </div>

          {/* Following Section */}
          {followedArtists.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 text-center max-w-md">
              <p className="text-zinc-400 font-medium mb-1">Not following any artists yet</p>
              <p className="text-xs text-zinc-500">Discover and follow your favorite artists to build your network.</p>
            </div>
          ) : (
            <HorizontalScrollSection title="Followed Artists">
              {followedArtists.map((fa) => (
                <div key={fa.id} className="shrink-0 w-[160px] sm:w-[200px] pr-4">
                  <div
                    onClick={() => {
                      setSelectedArtist({
                        name: fa.name,
                        thumbnail: fa.thumbnail,
                        youtubeArtistUrl: fa.youtubeArtistUrl,
                      });
                      setActiveView("artist-detail");
                    }}
                    className="group p-4 bg-zinc-900/40 hover:bg-zinc-800/60 rounded-2xl border border-transparent hover:border-zinc-800 transition-all duration-300 cursor-pointer select-none text-center flex flex-col items-center gap-3 relative shadow-sm hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shrink-0 shadow-lg group-hover:shadow-2xl transition-shadow bg-zinc-800 relative">
                      {fa.thumbnail ? (
                        <img
                          src={fa.thumbnail}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          alt={fa.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800 text-2xl font-black">
                          {getInitials(fa.name)}
                        </div>
                      )}
                    </div>
                    <div className="w-full">
                      <p className="text-sm font-bold text-white group-hover:text-[#1ed760] transition-colors truncate mb-0.5">
                        {fa.name}
                      </p>
                      <p className="text-xs text-zinc-500 font-medium truncate">Artist</p>
                    </div>
                  </div>
                </div>
              ))}
            </HorizontalScrollSection>
          )}

          {/* Suggested Artists Section */}
          <HorizontalScrollSection title="Suggested artists for you">
            {suggested.map((artist, idx) => (
              <div key={`sug-${idx}`} className="shrink-0 w-[160px] sm:w-[200px] pr-4">
                <SuggestedArtistItem
                  artist={artist}
                  onSelect={() => {
                    setSelectedArtist({
                      name: artist.name,
                      thumbnail: artist.thumbnail,
                    });
                    setActiveView("artist-detail");
                  }}
                />
              </div>
            ))}
          </HorizontalScrollSection>

        </div>
      </div>
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
        onSelect={onSelect}
        onPlayPlaylist={(tracks) => {
          if (tracks.length > 0) {
            onQueueChange(tracks);
            onSelect(tracks[0]);
          }
        }}
      />
    );
  }

  // Combine unique artists from recently played, liked, and apiTracks (excluding followed ones)
  const suggestedArtists = (() => {
    const uniqueArtists: { name: string; thumbnail?: string; youtubeArtistUrl?: string; track?: Track }[] = [];
    const seenNames = new Set<string>();

    const isFollowed = (artistName: string) => {
      if (!artistName) return false;
      const t = artistName.toLowerCase().trim();
      const cleanT = t.replace(/\s*-\s*topic$/, "").replace(/official$/, "").trim();

      return (followedArtists || []).some((fa) => {
        if (!fa.name) return false;
        const fan = fa.name.toLowerCase().trim();
        const cleanFan = fan.replace(/\s*-\s*topic$/, "").replace(/official$/, "").trim();

        return (
          cleanT === cleanFan ||
          cleanT.includes(cleanFan) ||
          cleanFan.includes(cleanT)
        );
      });
    };

    // 1. Add from recently played
    recentlyPlayed.forEach((t) => {
      if (t.artist && !seenNames.has(t.artist.toLowerCase().trim()) && !isFollowed(t.artist)) {
        seenNames.add(t.artist.toLowerCase().trim());
        uniqueArtists.push({
          name: t.artist,
          thumbnail: t.thumbnail,
          youtubeArtistUrl: t.youtubeArtistUrl,
          track: t,
        });
      }
    });

    // 2. Add from liked
    likedTracks.forEach((t) => {
      if (t.artist && !seenNames.has(t.artist.toLowerCase().trim()) && !isFollowed(t.artist)) {
        seenNames.add(t.artist.toLowerCase().trim());
        uniqueArtists.push({
          name: t.artist,
          thumbnail: t.thumbnail,
          youtubeArtistUrl: t.youtubeArtistUrl,
          track: t,
        });
      }
    });

    // 3. Add from top trending / api tracks
    apiTracks.forEach((t) => {
      if (t.artist && !seenNames.has(t.artist.toLowerCase().trim()) && !isFollowed(t.artist)) {
        seenNames.add(t.artist.toLowerCase().trim());
        uniqueArtists.push({
          name: t.artist,
          thumbnail: t.thumbnail,
          youtubeArtistUrl: t.youtubeArtistUrl,
          track: t,
        });
      }
    });

    // 4. Fill up to 15 using top famous artists
    const fallbackArtists = [
      { name: "Sabrina Carpenter" },
      { name: "Bruno Mars" },
      { name: "Billie Eilish" },
      { name: "The Weeknd" },
      { name: "SZA" },
      { name: "Dua Lipa" },
      { name: "Post Malone" },
      { name: "Taylor Swift" },
      { name: "Drake" },
      { name: "Rihanna" },
      { name: "Justin Bieber" },
      { name: "Ariana Grande" },
      { name: "Lady Gaga" },
      { name: "Coldplay" },
      { name: "Ed Sheeran" },
      { name: "Beyoncé" }
    ];

    fallbackArtists.forEach((fa) => {
      if (uniqueArtists.length >= 15) return;
      const lower = fa.name.toLowerCase().trim();
      if (!isFollowed(fa.name) && !seenNames.has(lower)) {
        seenNames.add(lower);
        uniqueArtists.push({ name: fa.name });
      }
    });

    return uniqueArtists.slice(0, 15);
  })();

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
      <div className="pb-32">
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
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-4xl font-black text-white truncate mb-2">{pageTitle}</h1>
                  {isPlaylistView && activePlaylist?.description && (
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{activePlaylist.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm text-zinc-300 font-bold mt-0.5 truncate flex items-center gap-1.5">
                      {user?.user_metadata?.full_name || "User"} • {displayTracks.length} track{displayTracks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
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
              {/* <MusicLoader /> */}
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
                  title="Trending Songs"
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

                {/* Recommended artists */}
                {suggestedArtists.length > 0 && (
                  <HorizontalScrollSection title="Recommended artists">
                    {suggestedArtists.map((artist, idx) => (
                      <div key={`artist-rec-${idx}`} className="shrink-0 w-[160px] sm:w-[200px]">
                        <ArtistCard
                          artist={artist}
                          onSelect={() => {
                            setSelectedArtist(artist);
                            setActiveView("artist-detail");
                          }}
                        />
                      </div>
                    ))}
                  </HorizontalScrollSection>
                )}

                {/* Suggested songs */}
                {suggestedSongs.length > 0 && (
                  <HorizontalScrollSection title="Suggested songs">
                    {suggestedSongs.map(track => (
                      <div key={`suggested-song-${track.id}`} className="shrink-0 w-[160px] sm:w-[200px]">
                        <HomeCard
                          track={track}
                          onSelect={(t) => onSelect(t, suggestedSongs)}
                          title={track.title}
                          subtitle={track.artist}
                        />
                      </div>
                    ))}
                  </HorizontalScrollSection>
                )}

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
      </div>
    </main>
  );
}

