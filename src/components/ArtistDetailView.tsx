import { useState, useEffect } from "react";
import { Play, Pause, Heart, Plus, ListPlus, Check, Loader2 } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { Button } from "@/components/ui/button";
import { TrackRow } from "./TrackRow";
import { searchYouTubeMusic, getArtistDetails } from "../utils/youtube";
import axios from "axios";

export function ArtistDetailView({
  artist,
  isPlaying,
  currentTrack,
  onSelect,
  onTogglePlay,
  onToggleLike,
  liked,
  isFollowingArtist,
  onToggleFollowArtist,
  playlists,
  onAddToPlaylist,
  onTrackDetail,
}: {
  artist: { name: string; thumbnail?: string; youtubeArtistUrl?: string };
  isPlaying: boolean;
  currentTrack: Track | null;
  onSelect: (t: Track, contextQueue?: Track[]) => void;
  onTogglePlay: () => void;
  onToggleLike: (track: Track) => void;
  liked: Set<string>;
  isFollowingArtist?: (name: string) => boolean;
  onToggleFollowArtist?: (artist: { name: string; youtubeArtistUrl?: string; thumbnail?: string }) => void;
  playlists: Playlist[];
  onAddToPlaylist: (plId: string, t: Track) => void;
  onTrackDetail: (t: Track) => void;
}) {
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState<string | null>(null);
  const [realArtistImage, setRealArtistImage] = useState<string | null>(null);

  // Fetch at least 15 tracks of the artist
  useEffect(() => {
    let isMounted = true;
    const fetchArtistTracks = async () => {
      setIsLoading(true);
      try {
        const results = await searchYouTubeMusic(artist.name);
        if (isMounted) {
          setArtistTracks(results.slice(0, 15));

          const extractChannelId = (url: string | undefined): string | null => {
            if (!url) return null;
            try {
              const cleanUrl = url.split("?")[0].replace(/\/$/, "");
              return cleanUrl.split("/").pop() || null;
            } catch {
              return null;
            }
          };

          const firstTrack = results[0];
          let channelId = extractChannelId(artist.youtubeArtistUrl) || extractChannelId(firstTrack?.youtubeArtistUrl);

          if (!channelId) {
            try {
              const searchChannel = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                  part: "snippet",
                  maxResults: 1,
                  q: artist.name,
                  type: "channel",
                  key: import.meta.env.VITE_YOUTUBE_API_KEY,
                }
              });
              const channelItem = searchChannel.data?.items?.[0];
              if (channelItem?.id?.channelId) {
                channelId = channelItem.id.channelId;
              }
            } catch (e) {
              console.error("Error direct searching channel ID:", e);
            }
          }

          if (channelId && isMounted) {
            const data = await getArtistDetails(channelId);
            if (isMounted) {
              if (data.subscriberCount) {
                // Convert to a nice format e.g. 2637456 -> 2,637,456
                const formatted = Number(data.subscriberCount).toLocaleString();
                setSubscriberCount(formatted);
              }
              if (data.thumbnailUrl) {
                setRealArtistImage(data.thumbnailUrl);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching artist tracks", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchArtistTracks();
    return () => {
      isMounted = false;
    };
  }, [artist.name, artist.youtubeArtistUrl]);

  const isCurrentArtistTrackPlaying = currentTrack?.artist === artist.name && isPlaying;

  const getMonthlyListenersFallback = (artistName: string) => {
    let hash = 0;
    for (let i = 0; i < artistName.length; i++) {
      hash = artistName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const base = Math.abs(hash % 4500000) + 150000;
    return base.toLocaleString();
  };

  // Clean up protocol-relative URLs
  const cleanUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith("//")) return `https:${url}`;
    return url;
  };

  const rawArtistThumbnail = realArtistImage || artist.thumbnail;
  const artistThumbnail = cleanUrl(rawArtistThumbnail);
  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name)}`;

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-zinc-800 to-zinc-950 overflow-y-auto pb-8">
      {/* 1. Immersive Banner Layout */}
      <div className="relative w-full h-[280px] sm:h-[350px] shrink-0 bg-zinc-900 border-b border-zinc-800/30 overflow-hidden flex flex-col justify-end p-6 sm:p-8">
        {/* Absolute Background image with heavy linear gradient on top */}
        <div className="absolute inset-0 z-0 select-none">
          {artistThumbnail ? (
            <img
              src={artistThumbnail}
              alt={artist.name}
              className="w-full h-full object-cover opacity-35 scale-110 blur-xl select-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackAvatarUrl;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1b1b1b] to-zinc-900 select-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent z-10" />
        </div>

        {/* Artist Profile Image (Spotify Style) */}
        <div className="absolute top-8 right-8 w-24 h-24 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 z-20 flex">
          {artistThumbnail ? (
            <img
              src={artistThumbnail}
              alt={artist.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackAvatarUrl;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold select-none">
              {artist.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Text Details overlaying on the banner */}
        <div className="relative z-30 flex-1 flex flex-col justify-end max-w-2xl">
          {subscriberCount && (
            <div className="flex items-center gap-1.5 text-xs text-white font-bold select-none mb-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400 fill-blue-400 select-none" aria-hidden="true">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.2l-3.3-3.3c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.9 1.9 4.8-4.8c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-5.5 5.5c-.4.4-1 .4-1.4 0z" />
              </svg>
              Verified Artist
            </div>
          )}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-none mb-3 line-clamp-2 tracking-tight">
            {artist.name}
          </h1>
          {subscriberCount && (
            <div className="text-zinc-300 font-semibold text-sm">
              {subscriberCount} subscribers
            </div>
          )}
        </div>
      </div>

      {/* 2. Controls Section (Sub-header) */}
      <div className="flex items-center gap-6 px-6 sm:px-8 py-5 select-none shrink-0">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] transition-transform hover:scale-105 active:scale-95 shadow-2xl border-none shrink-0"
          onClick={() => {
            if (artistTracks.length > 0) {
              if (currentTrack && artistTracks.some((t) => t.id === currentTrack.id)) {
                onTogglePlay();
              } else {
                onSelect(artistTracks[0], artistTracks);
              }
            }
          }}
        >
          {isCurrentArtistTrackPlaying ? (
            <Pause size={28} className="text-black fill-black" />
          ) : (
            <Play size={28} className="text-black ml-1 fill-black" />
          )}
        </Button>

        {onToggleFollowArtist && isFollowingArtist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollowArtist({
                name: artist.name,
                youtubeArtistUrl: artist.youtubeArtistUrl,
                thumbnail: artist.thumbnail,
              });
            }}
            className={`border border-zinc-500 font-bold px-4 h-8 rounded-full uppercase tracking-wider transition-all text-xs flex items-center justify-center ${isFollowingArtist(artist.name)
                ? "bg-transparent text-white border-white hover:bg-zinc-800/60"
                : "bg-white text-black border-white hover:bg-zinc-200 hover:scale-105"
              }`}
          >
            {isFollowingArtist(artist.name) ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* 3. Popular Tracks List */}
      <div className="flex-1 flex flex-col min-h-0 px-6 sm:px-8 select-none">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Popular</h2>

        {isLoading ? (
          <div className="flex items-center gap-3 text-zinc-400 py-12 select-none">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm font-medium">Fetching tracks...</span>
          </div>
        ) : artistTracks.length === 0 ? (
          <p className="text-zinc-500 py-6 text-sm">No songs found for this artist.</p>
        ) : (
          <div className="space-y-1">
            {artistTracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                idx={idx}
                isCurrent={currentTrack?.id === track.id}
                isTrackPlaying={currentTrack?.id === track.id && isPlaying}
                isLiked={liked.has(track.id)}
                onSelect={() => onSelect(track, artistTracks)}
                onToggleLike={onToggleLike}
                playlists={playlists}
                onAddToPlaylist={onAddToPlaylist}
                isInPlaylist={false}
                activePlaylistId={null}
                onRemoveFromPlaylist={() => { }}
                onTrackDetail={onTrackDetail}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
