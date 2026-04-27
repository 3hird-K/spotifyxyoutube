import { supabase } from "../lib/supabase"; // Import your client
import axios from "axios";
import { Track } from "../data/tracks";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const parseDuration = (isoDuration: string): number => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

export const searchYouTubeMusic = async (query: string): Promise<Track[]> => {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  try {
    // 1. CHECK SUPABASE CACHE
    const { data: cachedResponse, error: dbError } = await supabase
      .from('youtube_search_cache')
      .select('results, created_at')
      .eq('query', trimmedQuery)
      .maybeSingle();

    // If we have data and it's less than 7 days old, use it!
    if (cachedResponse) {
      const isFresh = new Date().getTime() - new Date(cachedResponse.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
      if (isFresh) {
        console.log("🚀 Serving from Supabase Cache");
        return cachedResponse.results;
      }
    }

    // 2. IF NOT IN CACHE, CALL YOUTUBE (Quota cost: 101 units)
    console.log("☁️ Fetching from YouTube API...");
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
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

    const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(",");
    if (!videoIds) return [];

    const videosResponse = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: "contentDetails,snippet",
        id: videoIds,
        key: API_KEY,
        fields: "items(id,snippet(title,channelTitle,thumbnails,publishedAt),contentDetails(duration))"
      },
    });

    // Parse the data as you did before
    const results: Track[] = videosResponse.data.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      album: "YouTube Music",
      duration: parseDuration(video.contentDetails?.duration || ""),
      youtubeId: video.id,
      thumbnail: video.snippet.thumbnails?.high?.url || "",
      genre: "Pop",
      year: new Date(video.snippet.publishedAt).getFullYear(),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
    }));

    // 3. SAVE TO SUPABASE CACHE
    // We use upsert so it updates the timestamp if the query already existed
    await supabase
      .from('youtube_search_cache')
      .upsert({ query: trimmedQuery, results: results, created_at: new Date() }, { onConflict: 'query' });

    return results;

  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};