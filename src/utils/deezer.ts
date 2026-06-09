import axios from "axios";
import { Track } from "../data/tracks";

export const searchDeezerMusic = async (query: string): Promise<Track[]> => {
  if (!query) return [];

  try {
    const baseUrl = "/api/deezer";
      
    let url = `${baseUrl}/search`;
    let params: any = { q: query, limit: 50 };

    if (query === "__CHART_ALL__") {
      url = `${baseUrl}/chart/0/tracks`;
      params = { limit: 50 };
    }

    const response = await axios.get(url, { params });

    const items = query === "__CHART_ALL__" 
      ? (response.data?.data || []) 
      : (response.data?.data || []);
    
    return items.map((item: any) => ({
      id: `deezer-${item.id}`,
      title: item.title,
      artist: item.artist?.name || "Unknown Artist",
      album: item.album?.title || "Unknown Album",
      duration: item.duration, // Deezer duration is in seconds
      youtubeId: "", // Will be fetched later when playing
      thumbnail: item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium || "",
      genre: "Mixed",
      year: new Date().getFullYear(),
      spotifyUrl: undefined,
      youtubeUrl: "", // Will be constructed when youtubeId is resolved
    }));
  } catch (error) {
    console.error("Deezer Search API Error:", error);
    return [];
  }
};

export const searchDeezerArtistPicture = async (artistName: string): Promise<string | undefined> => {
  if (!artistName) return undefined;
  
  try {
    const baseUrl = "/api/deezer";
      
    const url = `${baseUrl}/search/artist`;
    const response = await axios.get(url, { params: { q: artistName, limit: 1 } });
    
    const artist = response.data?.data?.[0];
    if (artist) {
      return artist.picture_xl || artist.picture_big || artist.picture_medium || artist.picture;
    }
  } catch (error) {
    console.error("Deezer Artist Search Error:", error);
  }
  return undefined;
};

export const searchDeezerArtists = async (query: string): Promise<any[]> => {
  if (!query) return [];
  
  try {
    const baseUrl = "/api/deezer";
      
    const url = `${baseUrl}/search/artist`;
    const response = await axios.get(url, { params: { q: query, limit: 3 } });
    
    const items = response.data?.data || [];
    return items.map((item: any) => ({
      name: item.name,
      thumbnail: item.picture_xl || item.picture_big || item.picture_medium || item.picture || "",
      deezerArtistUrl: item.link,
      nb_fan: item.nb_fan,
    }));
  } catch (error) {
    console.error("Deezer Artist Search Error:", error);
    return [];
  }
};

export const fetchWeeklyPopularSongs = async (): Promise<Track[]> => {
  try {
    const baseUrl = "/api/deezer";
    // We use a known Deezer Playlist ID that corresponds to Top Worldwide/Global Top 50 hits
    const url = `${baseUrl}/playlist/3155776842`;
    const response = await axios.get(url);
    
    const items = response.data?.tracks?.data || [];
    
    return items.map((item: any) => ({
      id: `deezer-weekly-${item.id}`,
      title: item.title,
      artist: item.artist?.name || "Unknown Artist",
      album: item.album?.title || "Unknown Album",
      duration: item.duration, // Deezer duration is in seconds
      youtubeId: "", // Will be fetched later when playing
      thumbnail: item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium || "",
      genre: "Popular",
      year: new Date().getFullYear(),
      spotifyUrl: undefined,
      youtubeUrl: "",
    }));
  } catch (error) {
    console.error("Deezer Weekly Popular Error:", error);
    return [];
  }
};
