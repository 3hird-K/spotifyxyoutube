import { supabase } from "../lib/supabase";
import axios from "axios";
import { Track } from "../data/tracks";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

/* -----------------------------
   UTIL: ISO duration parser
------------------------------ */
const parseDuration = (isoDuration: string): number => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

/* -----------------------------
   CORE SEARCH FUNCTION
   (+ optional recommendation mode)
------------------------------ */
export const searchYouTubeMusic = async (
  query: string,
  options?: { mode?: "search" | "recommend"; videoId?: string }
): Promise<Track[]> => {

  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery && !options?.videoId) return [];

  const cacheKey =
    options?.mode === "recommend"
      ? `rec:${options.videoId}`
      : trimmedQuery;

  try {
    /* =========================
       1. CACHE CHECK
    ========================= */
    const { data: cached } = await supabase
      .from("youtube_search_cache")
      .select("results, created_at")
      .eq("query", cacheKey)
      .maybeSingle();

    if (cached) {
      const isFresh =
        new Date().getTime() -
        new Date(cached.created_at).getTime() <
        7 * 24 * 60 * 60 * 1000;

      if (isFresh) {
        return cached.results;
      }
    }

    let results: Track[] = [];

    /* =========================
       2. RECOMMENDATION MODE
    ========================= */
    if (options?.mode === "recommend" && options.videoId) {

      const related = await axios.get(`${BASE_URL}/search`, {
        params: {
          part: "snippet",
          relatedToVideoId: options.videoId,
          type: "video",
          maxResults: 15,
          videoCategoryId: "10",
          key: API_KEY,
          fields: "items(id/videoId)"
        },
      });

      const videoIds = related.data.items
        .map((i: any) => i.id.videoId)
        .join(",");

      if (!videoIds) return [];

      const videos = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: "snippet,contentDetails",
          id: videoIds,
          key: API_KEY,
          fields:
            "items(id,snippet(title,channelTitle,thumbnails,publishedAt),contentDetails(duration))"
        },
      });

      results = videos.data.items.map((video: any) => ({
        id: video.id,
        youtubeId: video.id,
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        album: "YouTube Recommendations",
        duration: parseDuration(video.contentDetails?.duration || ""),
        thumbnail: video.snippet.thumbnails?.high?.url || "",
        genre: "Mixed",
        year: new Date(video.snippet.publishedAt).getFullYear(),
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      }));
    }

    /* =========================
       3. NORMAL SEARCH MODE
    ========================= */
    else {

      const search = await axios.get(`${BASE_URL}/search`, {
        params: {
          part: "snippet",
          maxResults: 15,
          q: trimmedQuery,
          type: "video",
          videoCategoryId: "10",
          key: API_KEY,
          fields: "items(id/videoId)"
        },
      });

      const videoIds = search.data.items
        .map((i: any) => i.id.videoId)
        .join(",");

      if (!videoIds) return [];

      const videos = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: "snippet,contentDetails",
          id: videoIds,
          key: API_KEY,
          fields:
            "items(id,snippet(title,channelTitle,thumbnails,publishedAt),contentDetails(duration))"
        },
      });

      results = videos.data.items.map((video: any) => ({
        id: video.id,
        youtubeId: video.id,
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        album: "YouTube Music",
        duration: parseDuration(video.contentDetails?.duration || ""),
        thumbnail: video.snippet.thumbnails?.high?.url || "",
        genre: "Pop",
        year: new Date(video.snippet.publishedAt).getFullYear(),
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      }));
    }

    /* =========================
       4. SAVE TO CACHE
    ========================= */
    await supabase
      .from("youtube_search_cache")
      .upsert(
        {
          query: cacheKey,
          results,
          created_at: new Date(),
        },
        { onConflict: "query" }
      );

    return results;
  } catch (error) {
    console.error("YouTube API Error:", error);
    return [];
  }
};
