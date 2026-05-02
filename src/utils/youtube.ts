import { supabase } from "../lib/supabase";
import axios from "axios";
import { Track } from "../data/tracks";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

/* -----------------------------
   UTIL: ISO duration parser
------------------------------ */
const parseDuration = (isoDuration: string): number => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

/* -----------------------------
   UTIL: Map YouTube API to Track
------------------------------ */
const mapToTrack = (video: any, albumName: string): Track => ({
  id: video.id,
  youtubeId: video.id,
  title: video.snippet.title,
  artist: video.snippet.channelTitle,
  album: albumName,
  duration: parseDuration(video.contentDetails?.duration || ""),
  thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || "",
  genre: albumName === "YouTube Recommendations" ? "Mixed" : "Pop",
  year: video.snippet.publishedAt ? new Date(video.snippet.publishedAt).getFullYear() : new Date().getFullYear(),
  spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(video.snippet.title)}`,
  spotifyArtistUrl: `https://open.spotify.com/search/${encodeURIComponent(video.snippet.channelTitle)}`,
  youtubeArtistUrl: video.snippet.channelId ? `https://music.youtube.com/channel/${video.snippet.channelId}` : undefined,
  youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
  description: video.snippet.description || "",
});

/* -----------------------------
   CORE SEARCH FUNCTION
   (+ optional recommendation mode)
------------------------------ */
export const searchYouTubeMusic = async (
  query: string,
  options?: { mode?: "search" | "recommend"; videoId?: string }
): Promise<Track[]> => {

  if (!API_KEY) {
    console.error("YouTube API Key is missing. Check your .env file.");
    return [];
  }

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
    const { data: cached, error: cacheError } = await supabase
      .from("youtube_search_cache")
      .select("results, created_at")
      .eq("query", cacheKey)
      .maybeSingle();

    if (cacheError) console.error("Cache fetch error:", cacheError);

    if (cached && cached.created_at) {
      const isFresh =
        new Date().getTime() -
        new Date(cached.created_at).getTime() <
        7 * 24 * 60 * 60 * 1000;

      if (isFresh && cached.results) {
        return (cached.results as unknown) as Track[];
      }
    }

    let results: Track[] = [];

    /* =========================
       2. RECOMMENDATION MODE
    ========================= */
    if (options?.mode === "recommend" && options.videoId) {
      // Since relatedToVideoId is deprecated and returns 400, 
      // we first fetch the video title/artist to perform a search for similar content.
      const videoDetail = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: "snippet",
          id: options.videoId,
          key: API_KEY,
        },
      });

      const video = videoDetail.data?.items?.[0];
      let searchQuery = query;

      if (video) {
        const title = video.snippet.title.replace(/[^\w\s]/gi, '');
        const channel = video.snippet.channelTitle;
        searchQuery = `${title} ${channel} similar songs`;
      }

      let search = await axios.get(`${BASE_URL}/search`, {
        params: {
          part: "snippet",
          maxResults: 15,
          q: searchQuery,
          type: "video",
          videoCategoryId: "10",
          key: API_KEY,
          fields: "items(id/videoId)"
        },
      });

      let items = search.data?.items || [];
      if (items.length === 0) {
        search = await axios.get(`${BASE_URL}/search`, {
          params: {
            part: "snippet",
            maxResults: 15,
            q: searchQuery,
            type: "video",
            key: API_KEY,
            fields: "items(id/videoId)"
          },
        });
        items = search.data?.items || [];
      }

      const videoIds = items
        .map((i: any) => i.id?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videos = await axios.get(`${BASE_URL}/videos`, {
          params: {
            part: "snippet,contentDetails",
            id: videoIds,
            key: API_KEY,
            fields: "items(id,snippet(title,channelTitle,channelId,thumbnails,publishedAt,description),contentDetails(duration))"
          },
        });

        const videoItems = videos.data?.items || [];
        results = videoItems.map((video: any) => mapToTrack(video, "YouTube Recommendations"));
      }
    }

    /* =========================
       3. NORMAL SEARCH MODE
    ========================= */
    else {
      let search = await axios.get(`${BASE_URL}/search`, {
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

      let items = search.data?.items || [];
      if (items.length === 0) {
        search = await axios.get(`${BASE_URL}/search`, {
          params: {
            part: "snippet",
            maxResults: 15,
            q: trimmedQuery,
            type: "video",
            key: API_KEY,
            fields: "items(id/videoId)"
          },
        });
        items = search.data?.items || [];
      }

      const videoIds = items
        .map((i: any) => i.id?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videos = await axios.get(`${BASE_URL}/videos`, {
          params: {
            part: "snippet,contentDetails",
            id: videoIds,
            key: API_KEY,
            fields: "items(id,snippet(title,channelTitle,channelId,thumbnails,publishedAt,description),contentDetails(duration))"
          },
        });

        const videoItems = videos.data?.items || [];
        results = videoItems.map((video: any) => mapToTrack(video, "YouTube Music"));
      }
    }

    /* =========================
       4. SAVE TO CACHE
    ========================= */
    if (results.length > 0) {
      try {
        await supabase
          .from("youtube_search_cache")
          .upsert(
            {
              query: cacheKey,
              results: results as any,
              created_at: new Date().toISOString(),
            },
            { onConflict: "query" }
          );
      } catch (upsertError) {
        console.warn("Cache save error (non-fatal):", upsertError);
      }
    }

    return results;
  } catch (error) {
    console.error("YouTube API Error:", error);
    return [];
  }
};

export const getArtistDetails = async (channelId: string): Promise<{ subscriberCount?: string; viewCount?: string; thumbnailUrl?: string }> => {
  if (!API_KEY) return {};
  try {
    const res = await axios.get(`${BASE_URL}/channels`, {
      params: {
        part: "snippet,statistics",
        id: channelId,
        key: API_KEY,
      }
    });
    const channel = res.data?.items?.[0];
    if (channel) {
      return {
        subscriberCount: channel.statistics?.subscriberCount,
        viewCount: channel.statistics?.viewCount,
        thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
      };
    }
  } catch (err) {
    console.error("Error fetching channel details:", err);
  }
  return {};
};

export const searchYouTubeArtistThumbnail = async (artistName: string): Promise<string | undefined> => {
  if (!API_KEY || !artistName) return undefined;
  try {
    const res = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 1,
        q: `${artistName} Official Channel`,
        type: "channel",
        key: API_KEY,
      },
    });
    const item = res.data?.items?.[0];
    if (item && item.snippet?.thumbnails?.high?.url) {
      return item.snippet.thumbnails.high.url;
    }
  } catch (err) {
    console.error("Error searching channel:", err);
  }
  return undefined;
};
