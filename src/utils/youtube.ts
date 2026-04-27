import axios from "axios";
import { Track } from "../data/tracks";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
}

export const searchYouTubeMusic = async (query: string): Promise<Track[]> => {
  if (!API_KEY) {
    console.error("Missing YouTube API Key");
    return [];
  }

  try {
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        maxResults: 20,
        q: query,
        type: "video",
        videoCategoryId: "10",
        key: API_KEY,
      },
    });

    const searchItems = searchResponse.data.items;
    if (!searchItems || searchItems.length === 0) return [];

    const videoIds = searchItems.map((item: any) => item.id.videoId).join(",");

    const videosResponse = await axios.get(`${BASE_URL}/videos`, {
      params: {
        part: "contentDetails,snippet",
        id: videoIds,
        key: API_KEY,
      },
    });

    const videos = videosResponse.data.items || [];

    return videos.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      album: "YouTube Music",
      duration: parseDuration(video.contentDetails?.duration || ""),
      youtubeId: video.id,
      thumbnail: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || "",
      genre: "Pop",
      year: new Date(video.snippet.publishedAt).getFullYear(),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
    }));
  } catch (error) {
    console.error("YouTube API error:", error);
    return [];
  }
};