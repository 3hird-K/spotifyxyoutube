export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  youtubeId: string;
  thumbnail: string;
  genre: string;
  year: number;
  spotifyUrl?: string;
  youtubeUrl: string;
}

// Global list of available genres for filtering
export const GENRES = [
  "All",
  "Pop",
  "Rock",
  "Hip Hop",
  "R&B",
  "Country",
  "Jazz",
  "Classical",
  "Electronic",
  "Lo-fi",
  "Soul"
];
