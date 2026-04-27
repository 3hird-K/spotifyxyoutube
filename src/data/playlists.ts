import { Track } from "./tracks";

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}
