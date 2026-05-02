import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface FollowedArtist {
  id: string;
  name: string;
  youtubeArtistUrl?: string;
  thumbnail?: string;
  followed_at?: string;
}

export function useFollowedArtists(user: any) {
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initial Load from Supabase + fallback to LocalStorage
  useEffect(() => {
    const loadFollowed = async () => {
      setIsLoading(true);
      const localStored = localStorage.getItem("followed_artists");
      let currentList: FollowedArtist[] = localStored ? JSON.parse(localStored) : [];

      if (user && !user.is_anonymous) {
        try {
          const { data, error } = await supabase
            .from("followed_artists")
            .select("*")
            .eq("user_id", user.id);

          if (!error && data) {
            currentList = data.map((item: any) => ({
              id: item.artist_id,
              name: item.artist_name,
              youtubeArtistUrl: item.youtube_artist_url,
              thumbnail: item.thumbnail,
              followed_at: item.followed_at,
            }));
          }
        } catch (err) {
          console.warn("Could not fetch followed artists from DB, using local storage fallback", err);
        }
      }

      setFollowedArtists(currentList);
      localStorage.setItem("followed_artists", JSON.stringify(currentList));
      setIsLoading(false);
    };

    loadFollowed();
  }, [user]);

  // 2. Toggle artist follow state
  const toggleFollowArtist = async (artist: { name: string; youtubeArtistUrl?: string; thumbnail?: string }) => {
    if (!artist.name) return;

    // Use name as base ID if no artist ID exists
    const artistId = artist.name.toLowerCase().replace(/\s+/g, "_");
    const isCurrentlyFollowed = followedArtists.some((a) => a.id === artistId);

    let nextList: FollowedArtist[] = [];

    if (isCurrentlyFollowed) {
      // Unfollow
      nextList = followedArtists.filter((a) => a.id !== artistId);

      if (user && !user.is_anonymous) {
        try {
          await supabase
            .from("followed_artists")
            .delete()
            .eq("user_id", user.id)
            .eq("artist_id", artistId);
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      // Follow
      const newItem: FollowedArtist = {
        id: artistId,
        name: artist.name,
        youtubeArtistUrl: artist.youtubeArtistUrl,
        thumbnail: artist.thumbnail,
        followed_at: new Date().toISOString(),
      };

      nextList = [...followedArtists, newItem];

      if (user && !user.is_anonymous) {
        try {
          await supabase.from("followed_artists").upsert({
            user_id: user.id,
            artist_id: artistId,
            artist_name: artist.name,
            youtube_artist_url: artist.youtubeArtistUrl,
            thumbnail: artist.thumbnail,
            followed_at: newItem.followed_at,
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    setFollowedArtists(nextList);
    localStorage.setItem("followed_artists", JSON.stringify(nextList));
  };

  const isFollowing = (artistName: string) => {
    if (!artistName) return false;
    return followedArtists.some((a) => a.name === artistName);
  };

  return { followedArtists, isLoading, toggleFollowArtist, isFollowing };
}
