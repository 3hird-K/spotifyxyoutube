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
      currentList.sort((a, b) => {
        const timeA = a.followed_at ? new Date(a.followed_at).getTime() : 0;
        const timeB = b.followed_at ? new Date(b.followed_at).getTime() : 0;
        return timeB - timeA;
      });

      if (user && !user.is_anonymous) {
        try {
          const { data, error } = await supabase
            .from("followed_artists")
            .select("*")
            .eq("user_id", user.id)
            .order("followed_at", { ascending: false });

          if (!error && data) {
            currentList = data.map((item: any) => ({
              id: item.artist_id,
              name: item.artist_name,
              youtubeArtistUrl: item.youtube_artist_url,
              thumbnail: item.thumbnail,
              followed_at: item.followed_at,
            }));
            
            // Ensure descending order
            currentList.sort((a, b) => {
              const timeA = a.followed_at ? new Date(a.followed_at).getTime() : 0;
              const timeB = b.followed_at ? new Date(b.followed_at).getTime() : 0;
              return timeB - timeA;
            });
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

      // Optimistic UI Update
      setFollowedArtists(nextList);
      localStorage.setItem("followed_artists", JSON.stringify(nextList));
      window.dispatchEvent(new Event("followed_artists_updated"));

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

      nextList = [newItem, ...followedArtists];

      // Optimistic UI Update
      setFollowedArtists(nextList);
      localStorage.setItem("followed_artists", JSON.stringify(nextList));
      window.dispatchEvent(new Event("followed_artists_updated"));

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
  };

  useEffect(() => {
    const syncFollowed = () => {
      const localStored = localStorage.getItem("followed_artists");
      if (localStored) {
        const parsed = JSON.parse(localStored);
        // Ensure it's sorted properly
        parsed.sort((a: any, b: any) => {
          const timeA = a.followed_at ? new Date(a.followed_at).getTime() : 0;
          const timeB = b.followed_at ? new Date(b.followed_at).getTime() : 0;
          return timeB - timeA;
        });
        setFollowedArtists(parsed);
      }
    };

    window.addEventListener("followed_artists_updated", syncFollowed);
    return () => window.removeEventListener("followed_artists_updated", syncFollowed);
  }, []);

  const isFollowing = (artistName: string) => {
    if (!artistName) return false;
    return followedArtists.some((a) => a.name === artistName);
  };

  return { followedArtists, isLoading, toggleFollowArtist, isFollowing };
}
