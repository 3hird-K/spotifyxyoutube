import { useState, useEffect } from "react";
import { Track } from "../data/tracks";
import { fetchWeeklyPopularSongs } from "../utils/deezer";

export const useWeeklyPopularSongs = (enabled: boolean = true) => {
  const [songs, setSongs] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    let isMounted = true;

    const loadSongs = async () => {
      try {
        setIsLoading(true);
        const results = await fetchWeeklyPopularSongs();
        if (isMounted) {
          setSongs(results);
        }
      } catch (err: any) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSongs();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { songs, isLoading, error };
};
