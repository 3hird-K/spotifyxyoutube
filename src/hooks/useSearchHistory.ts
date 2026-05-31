import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Track } from "../data/tracks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSearchHistory(user: any) {
  const queryClient = useQueryClient();

  // 1. Fetch recent search tracks
  const { data: recentSearchTracks = [] } = useQuery({
    queryKey: ["recent_search_items", user?.id],
    queryFn: async () => {
      if (!user || user.is_anonymous) return [];
      const { data, error } = await supabase
        .from("recent_search_items")
        .select("track_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data) {
        console.error("Error fetching recent search items:", error);
        return [];
      }
      return data.map((d: any) => d.track_data as unknown as Track);
    },
    enabled: !!user && !user.is_anonymous,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 2. Fetch recent search queries
  const { data: recentSearches = [] } = useQuery({
    queryKey: ["recent_searches", user?.id],
    queryFn: async () => {
      if (!user || user.is_anonymous) return [];
      const { data, error } = await supabase
        .from("recent_searches")
        .select("query")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recent searches:", error);
        return [];
      }
      return data.map((d: any) => d.query);
    },
    enabled: !!user && !user.is_anonymous,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 3. Add a recent search track & query
  const addRecentSearchMutation = useMutation({
    mutationFn: async ({ track, query }: { track: Track; query?: string }) => {
      if (!user || user.is_anonymous) return;

      const promises = [];

      // Save query
      if (query && query.trim()) {
        promises.push(
          supabase.from("recent_searches").insert({
            user_id: user.id,
            query: query.trim(),
          })
        );
      }

      // Save track item
      promises.push(
        supabase.from("recent_search_items").upsert(
          {
            user_id: user.id,
            track_id: track.id,
            track_data: track as any,
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id,track_id" }
        )
      );

      await Promise.all(promises);
    },
    onMutate: async ({ track, query }) => {
      // Optimistic updates
      await queryClient.cancelQueries({ queryKey: ["recent_search_items", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["recent_searches", user?.id] });

      const previousTracks = queryClient.getQueryData<Track[]>(["recent_search_items", user?.id]) || [];
      const previousQueries = queryClient.getQueryData<string[]>(["recent_searches", user?.id]) || [];

      // Update tracks
      const newTracks = [track, ...previousTracks.filter((t) => t.id !== track.id)].slice(0, 10);
      queryClient.setQueryData(["recent_search_items", user?.id], newTracks);

      // Update queries
      if (query && query.trim()) {
        const trimmed = query.trim();
        const newQueries = [trimmed, ...previousQueries.filter((q) => q !== trimmed)].slice(0, 10);
        queryClient.setQueryData(["recent_searches", user?.id], newQueries);
      }

      return { previousTracks, previousQueries };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["recent_search_items", user?.id], context.previousTracks);
      }
      if (context?.previousQueries) {
        queryClient.setQueryData(["recent_searches", user?.id], context.previousQueries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recent_search_items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["recent_searches", user?.id] });
    },
  });

  // 4. Remove a recent search track
  const removeRecentSearchMutation = useMutation({
    mutationFn: async (trackId: string) => {
      if (!user || user.is_anonymous) return;
      await supabase
        .from("recent_search_items")
        .delete()
        .eq("user_id", user.id)
        .eq("track_id", trackId);
    },
    onMutate: async (trackId) => {
      await queryClient.cancelQueries({ queryKey: ["recent_search_items", user?.id] });
      const previousTracks = queryClient.getQueryData<Track[]>(["recent_search_items", user?.id]) || [];
      queryClient.setQueryData(
        ["recent_search_items", user?.id],
        previousTracks.filter((t) => t.id !== trackId)
      );
      return { previousTracks };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousTracks) {
        queryClient.setQueryData(["recent_search_items", user?.id], context.previousTracks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recent_search_items", user?.id] });
    },
  });

  return {
    recentSearchTracks,
    recentSearches,
    addRecentSearch: (track: Track, query?: string) => addRecentSearchMutation.mutate({ track, query }),
    removeRecentSearch: (trackId: string) => removeRecentSearchMutation.mutate(trackId),
  };
}
