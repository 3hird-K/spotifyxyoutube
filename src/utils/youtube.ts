import { cacheGet, cacheSet } from "./cache";
import axios from "axios";
import { Track } from "../data/tracks";

const API_KEYS = [
  import.meta.env.VITE_YOUTUBE_API_KEY,
  import.meta.env.VITE_YOUTUBE_API_KEY_2,
  import.meta.env.VITE_YOUTUBE_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;
const getApiKey = () => API_KEYS[currentKeyIndex];

const rotateApiKey = () => {
  if (API_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.warn(`YouTube API quota exceeded. Rotated to API Key index ${currentKeyIndex}`);
  }
};

const axiosGetWithKeyRotation = async (url: string, options: any, retries = Math.max(1, API_KEYS.length)): Promise<any> => {
  if (API_KEYS.length === 0) {
    console.error("No YouTube API keys configured. Check your .env file.");
    throw new Error("No YouTube API keys configured.");
  }
  try {
    if (!options.params) options.params = {};
    options.params.key = getApiKey();
    return await axios.get(url, options);
  } catch (err: any) {
    if ((err.response?.status === 403 || err.response?.status === 429) && retries > 1) {
      rotateApiKey();
      return axiosGetWithKeyRotation(url, options, retries - 1);
    }
    throw err;
  }
};

const BASE_URL = "https://www.googleapis.com/youtube/v3";

const inMemoryCache: Record<string, any> = {};
const inFlightRequests: Record<string, Promise<any> | undefined> = {};

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

/* --------------------------------
   TTL Constants
--------------------------------- */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/* -----------------------------
   CORE SEARCH FUNCTION
   (+ optional recommendation mode)
------------------------------ */

export const searchYouTubeMusic = async (
  query: string,
  options?: { mode?: "search" | "recommend"; videoId?: string }
): Promise<Track[]> => {
  const trimmedQuery = query.trim().toLowerCase();
  const cacheKey = options?.mode === "recommend" ? `rec:${options?.videoId}` : trimmedQuery;
  
  if (inFlightRequests[cacheKey]) {
    return inFlightRequests[cacheKey];
  }
  
  const promise = executeSearch(query, options);
  inFlightRequests[cacheKey] = promise;
  return promise;
};

// Extracted the actual implementation to executeSearch to make wrapper clean
const executeSearch = async (
  query: string,
  options?: { mode?: "search" | "recommend"; videoId?: string }
): Promise<Track[]> => {
  if (API_KEYS.length === 0) {
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
       1. CACHE CHECK (IndexedDB)
    ========================= */
    const cached = await cacheGet<Track[]>(cacheKey, SEVEN_DAYS);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      inMemoryCache[cacheKey] = cached;
      return cached;
    }

    let results: Track[] = [];

    /* =========================
       2. RECOMMENDATION MODE
    ========================= */
    if (options?.mode === "recommend" && options.videoId) {
      // Since relatedToVideoId is deprecated and returns 400, 
      // we first fetch the video title/artist to perform a search for similar content.
      const videoDetail = await axiosGetWithKeyRotation(`${BASE_URL}/videos`, {
        params: {
          part: "snippet",
          id: options.videoId,
        },
      });

      const video = videoDetail.data?.items?.[0];
      let searchQuery = query;

      if (video) {
        const title = video.snippet.title.replace(/[^\w\s]/gi, '');
        const channel = video.snippet.channelTitle;
        searchQuery = `${title} ${channel} similar songs`;
      }

      let search = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
        params: {
          part: "snippet",
          maxResults: 50,
          q: searchQuery,
          type: "video",
          videoCategoryId: "10",
          fields: "items(id/videoId)"
        },
      });

      let items = search.data?.items || [];
      if (items.length === 0) {
        search = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
          params: {
            part: "snippet",
            maxResults: 50,
            q: searchQuery,
            type: "video",
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
        const videos = await axiosGetWithKeyRotation(`${BASE_URL}/videos`, {
          params: {
            part: "snippet,contentDetails",
            id: videoIds,
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
      let search = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
        params: {
          part: "snippet",
          maxResults: 50,
          q: trimmedQuery,
          type: "video",
          videoCategoryId: "10",
          fields: "items(id/videoId)"
        },
      });

      let items = search.data?.items || [];
      if (items.length === 0) {
        search = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
          params: {
            part: "snippet",
            maxResults: 50,
            q: trimmedQuery,
            type: "video",
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
        const videos = await axiosGetWithKeyRotation(`${BASE_URL}/videos`, {
          params: {
            part: "snippet,contentDetails",
            id: videoIds,
            fields: "items(id,snippet(title,channelTitle,channelId,thumbnails,publishedAt,description),contentDetails(duration))"
          },
        });

        const videoItems = videos.data?.items || [];
        results = videoItems.map((video: any) => mapToTrack(video, "YouTube Music"));
      }
    }

    /* =========================
       4. SAVE TO CACHE (IndexedDB)
    ========================= */
    if (results.length > 0) {
      inMemoryCache[cacheKey] = results;
      cacheSet(cacheKey, results).catch(() => {}); // fire-and-forget
    }

    return results;
  } catch (error) {
    console.error("YouTube API Error:", error);
    return [];
  } finally {
    delete inFlightRequests[cacheKey];
  }
};

export const getArtistDetails = async (channelId: string): Promise<{ subscriberCount?: string; viewCount?: string; thumbnailUrl?: string }> => {
  if (API_KEYS.length === 0 || !channelId) return {};

  const cacheKey = `artist-detail:${channelId}`;

  try {
    // 1. Check IndexedDB cache first (30-day TTL)
    const cached = await cacheGet<{ subscriberCount?: string; viewCount?: string; thumbnailUrl?: string }>(cacheKey, THIRTY_DAYS);

    if (cached) {
      return cached;
    }

    // 2. Not cached, fetch from API
    const res = await axiosGetWithKeyRotation(`${BASE_URL}/channels`, {
      params: {
        part: "snippet,statistics",
        id: channelId,
      }
    });
    const channel = res.data?.items?.[0];
    if (channel) {
      const stats = {
        subscriberCount: channel.statistics?.subscriberCount,
        viewCount: channel.statistics?.viewCount,
        thumbnailUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
      };

      // 3. Save to IndexedDB cache
      cacheSet(cacheKey, stats).catch(() => {});

      return stats;
    }
  } catch (err) {
    console.error("Error fetching channel details:", err);
  }
  return {};
};

export const searchYouTubeArtistThumbnail = async (_artistName: string): Promise<string | undefined> => {
  return undefined;
};

export const getOrFetchArtistChannelId = async (_artistName: string): Promise<string | null> => {
  return null;
};


export const getMostPopularArtistTrack = async (artistName: string): Promise<Track | undefined> => {
  if (API_KEYS.length === 0 || !artistName) return undefined;
  const trimmed = artistName.trim().toLowerCase();
  const cacheKey = `popular:${trimmed}`;

  try {
    // 1. Check in memory first
    if (inMemoryCache[cacheKey]) {
      return inMemoryCache[cacheKey];
    }

    // 2. Check IndexedDB cache (30-day TTL)
    const cached = await cacheGet<Track[]>(cacheKey, THIRTY_DAYS);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      const track = cached[0];
      if (track) {
        inMemoryCache[cacheKey] = track;
        return track as Track;
      }
    }

    // 3. Not cached or expired, fetch from YouTube API
    const res = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 1,
        q: `${artistName} official music video`,
        type: "video",
        order: "viewCount",
        videoCategoryId: "10",
      },
    });

    const item = res.data?.items?.[0];
    if (item && item.id?.videoId) {
      const videos = await axiosGetWithKeyRotation(`${BASE_URL}/videos`, {
        params: {
          part: "snippet,contentDetails",
          id: item.id.videoId,
          fields: "items(id,snippet(title,channelTitle,channelId,thumbnails,publishedAt,description),contentDetails(duration))"
        },
      });

      const videoItem = videos.data?.items?.[0];
      if (videoItem) {
        const track = mapToTrack(videoItem, "Popular Releases");
      inMemoryCache[cacheKey] = track;

        // 4. Save to IndexedDB cache
        cacheSet(cacheKey, [track]).catch(() => {});

        return track;
      }
    }
  } catch (err) {
    console.error("Error fetching most popular track:", err);
  }

  return undefined;
};

export const searchYouTubeArtists = async (query: string): Promise<any[]> => {
  if (API_KEYS.length === 0 || !query) return [];
  const trimmed = query.trim().toLowerCase();
  const cacheKey = `artist-search:${trimmed}`;

  try {
    // 1. Check in-memory cache
    if (inMemoryCache[cacheKey]) {
      return inMemoryCache[cacheKey];
    }

    // 2. Check IndexedDB cache (30-day TTL)
    const cached = await cacheGet<any[]>(cacheKey, THIRTY_DAYS);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      inMemoryCache[cacheKey] = cached;
      return cached;
    }

    // 3. Not cached or expired, fetch from YouTube API
    const res = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 3,
        q: trimmed,
        type: "channel",
      },
    });

    const items = res.data?.items || [];
    const artists = items.map((item: any) => ({
      name: item.snippet?.title || "",
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
      youtubeArtistUrl: `https://music.youtube.com/channel/${item.id?.channelId}`,
    }));

    if (artists.length > 0) {
      inMemoryCache[cacheKey] = artists;

      // Save to IndexedDB cache
      cacheSet(cacheKey, artists).catch(() => {});
    }

    return artists;
  } catch (err) {
    console.error("Error searching artists:", err);
    return [];
  }
};

export const resolveYouTubeId = async (query: string): Promise<string | null> => {
  if (API_KEYS.length === 0) return null;
  
  const cacheKey = `resolve:${query}`;
  if (inMemoryCache[cacheKey]) return inMemoryCache[cacheKey][0] as string;

  if (inFlightRequests[cacheKey]) {
    return inFlightRequests[cacheKey];
  }

  const promise = (async () => {
    try {
    // Check IndexedDB cache
    const cached = await cacheGet<string[]>(cacheKey, SEVEN_DAYS);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      inMemoryCache[cacheKey] = cached;
      return cached[0];
    }

    const res = await axiosGetWithKeyRotation(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 1,
        q: query,
        type: "video",
        videoCategoryId: "10",
        fields: "items(id/videoId)"
      },
    });

    const videoId = res.data?.items?.[0]?.id?.videoId;
    if (videoId) {
      inMemoryCache[cacheKey] = [videoId] as any;
      
      // Save to IndexedDB cache
      cacheSet(cacheKey, [videoId]).catch(() => {});

      return videoId;
    }
    return null;
  } catch (error) {
    console.error("Error resolving YouTube ID:", error);
    return null;
  } finally {
    delete inFlightRequests[cacheKey];
  }
  })();
  
  inFlightRequests[cacheKey] = promise;
  return promise;
};
