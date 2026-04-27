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
    }, 800);

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
    enabled: enabled && debouncedQuery.trim().length >= 3, // Only query if at least 3 chars
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
