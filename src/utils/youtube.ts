import { supabase } from "../lib/supabase";
import axios from "axios";
import { Track } from "../data/tracks";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const inMemoryCache: Record<string, any> = {};

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

  if (inMemoryCache[cacheKey]) {
    return inMemoryCache[cacheKey];
  }

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
      inMemoryCache[cacheKey] = results;
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
  if (!API_KEY || !channelId) return {};
  try {
    // 1. Check cache first
    const { data: cached } = await supabase
      .from("youtube_artist_cache")
      .select("*")
      .eq("channel_id", channelId)
      .maybeSingle();

    if (cached) {
      const isFresh = new Date().getTime() - new Date(cached.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
      if (isFresh) {
        return {
          subscriberCount: cached.subscriber_count || undefined,
          viewCount: cached.view_count || undefined,
          thumbnailUrl: cached.thumbnail_url || undefined,
        };
      }
    }

    // 2. Not cached, fetch from API
    const res = await axios.get(`${BASE_URL}/channels`, {
      params: {
        part: "snippet,statistics",
        id: channelId,
        key: API_KEY,
      }
    });
    const channel = res.data?.items?.[0];
    if (channel) {
      const stats = {
        subscriberCount: channel.statistics?.subscriberCount,
        viewCount: channel.statistics?.viewCount,
        thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
      };

      // 3. Save to cache
      const { data: existing } = await supabase
        .from("youtube_artist_cache")
        .select("id")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (existing) {
        await supabase.from("youtube_artist_cache").update({
          subscriber_count: stats.subscriberCount,
          view_count: stats.viewCount,
          thumbnail_url: stats.thumbnailUrl,
          created_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("youtube_artist_cache").insert({
          channel_id: channelId,
          artist_name: channel.snippet?.title?.toLowerCase() || `id:${channelId}`,
          subscriber_count: stats.subscriberCount,
          view_count: stats.viewCount,
          thumbnail_url: stats.thumbnailUrl,
          created_at: new Date().toISOString(),
        });
      }

      return stats;
    }
  } catch (err) {
    console.error("Error fetching channel details:", err);
  }
  return {};
};

export const searchYouTubeArtistThumbnail = async (artistName: string): Promise<string | undefined> => {
  if (!API_KEY || !artistName) return undefined;
  try {
    const trimmed = artistName.trim().toLowerCase();

    // 1. Check cache first
    const { data: cached } = await supabase
      .from("youtube_artist_cache")
      .select("thumbnail_url, created_at")
      .eq("artist_name", trimmed)
      .maybeSingle();

    if (cached) {
      const isFresh = new Date().getTime() - new Date(cached.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
      if (isFresh && cached.thumbnail_url) {
        return cached.thumbnail_url;
      }
    }

    // 2. Not cached, fetch from API
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
      const thumb = item.snippet.thumbnails.high.url;

      // 3. Save to cache
      const { data: existing } = await supabase
        .from("youtube_artist_cache")
        .select("id")
        .eq("artist_name", trimmed)
        .maybeSingle();

      if (existing) {
        await supabase.from("youtube_artist_cache").update({
          channel_id: item.id?.channelId || `id:${trimmed}`,
          thumbnail_url: thumb,
          created_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("youtube_artist_cache").insert({
          artist_name: trimmed,
          channel_id: item.id?.channelId || `id:${trimmed}`,
          thumbnail_url: thumb,
          created_at: new Date().toISOString(),
        });
      }

      return thumb;
    }
  } catch (err) {
    console.error("Error searching channel:", err);
  }
  return undefined;
};

export const getOrFetchArtistChannelId = async (artistName: string): Promise<string | null> => {
  if (!API_KEY || !artistName) return null;
  const trimmed = artistName.trim().toLowerCase();

  try {
    // 1. Check in-memory cache
    if (inMemoryCache[`channel:${trimmed}`]) {
      return inMemoryCache[`channel:${trimmed}`];
    }

    // 2. Check Supabase cache
    const { data: cached } = await supabase
      .from("youtube_artist_cache")
      .select("channel_id")
      .eq("artist_name", trimmed)
      .maybeSingle();

    if (cached && cached.channel_id && !cached.channel_id.startsWith("id:")) {
      inMemoryCache[`channel:${trimmed}`] = cached.channel_id;
      return cached.channel_id;
    }

    // 3. Not cached, fetch from YouTube API
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
    if (item && item.id?.channelId) {
      const channelId = item.id.channelId;

      // 4. Update Supabase cache
      const { data: existing } = await supabase
        .from("youtube_artist_cache")
        .select("id")
        .eq("artist_name", trimmed)
        .maybeSingle();

      if (existing) {
        await supabase.from("youtube_artist_cache").update({
          channel_id: channelId,
          thumbnail_url: item.snippet?.thumbnails?.high?.url,
          created_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("youtube_artist_cache").insert({
          artist_name: trimmed,
          channel_id: channelId,
          thumbnail_url: item.snippet?.thumbnails?.high?.url,
          created_at: new Date().toISOString(),
        });
      }

      inMemoryCache[`channel:${trimmed}`] = channelId;
      return channelId;
    }
  } catch (err) {
    console.error("Error fetching channel ID:", err);
  }

  return null;
};

export const getMostPopularArtistTrack = async (artistName: string): Promise<Track | undefined> => {
  if (!API_KEY || !artistName) return undefined;
  const trimmed = artistName.trim().toLowerCase();
  const cacheKey = `popular:${trimmed}`;

  try {
    // 1. Check in memory first
    if (inMemoryCache[cacheKey]) {
      return inMemoryCache[cacheKey];
    }

    // 2. Check Supabase cache
    const { data: cached } = await supabase
      .from("youtube_search_cache")
      .select("results, created_at")
      .eq("query", cacheKey)
      .maybeSingle();

    if (cached && cached.created_at) {
      const isFresh = new Date().getTime() - new Date(cached.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
      if (isFresh && cached.results) {
        const track = Array.isArray(cached.results) ? cached.results[0] : cached.results;
        if (track) {
          inMemoryCache[cacheKey] = track;
          return track as unknown as Track;
        }
      }
    }

    // 3. Not cached or expired, fetch from YouTube API
    const res = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 1,
        q: `${artistName} official music video`,
        type: "video",
        order: "viewCount",
        videoCategoryId: "10",
        key: API_KEY,
      },
    });

    const item = res.data?.items?.[0];
    if (item && item.id?.videoId) {
      const videos = await axios.get(`${BASE_URL}/videos`, {
        params: {
          part: "snippet,contentDetails",
          id: item.id.videoId,
          key: API_KEY,
          fields: "items(id,snippet(title,channelTitle,channelId,thumbnails,publishedAt,description),contentDetails(duration))"
        },
      });

      const videoItem = videos.data?.items?.[0];
      if (videoItem) {
        const track = mapToTrack(videoItem, "Popular Releases");
        inMemoryCache[cacheKey] = track;

        // 4. Update Supabase search cache
        await supabase
          .from("youtube_search_cache")
          .upsert(
            {
              query: cacheKey,
              results: [track] as any,
              created_at: new Date().toISOString(),
            },
            { onConflict: "query" }
          );

        return track;
      }
    }
  } catch (err) {
    console.error("Error fetching most popular track:", err);
  }

  return undefined;
};
