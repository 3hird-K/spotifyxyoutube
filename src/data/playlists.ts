import { Track } from "./tracks";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: number;
}
