import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { searchYouTubeMusic } from "../utils/youtube";
import { Track } from "../data/tracks";

export const useSearchMusic = (query: string, enabled: boolean = true) => {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the query (800ms)
  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // Faster debounce (400ms instead of 800ms)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  return useQuery<Track[], Error>({
    queryKey: ["searchMusic", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      return searchYouTubeMusic(debouncedQuery);
    },
    enabled: enabled && debouncedQuery.trim().length > 2, // Start searching after 2 characters
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
