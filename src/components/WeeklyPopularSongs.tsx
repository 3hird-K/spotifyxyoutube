import { Track } from "../data/tracks";
import { HorizontalScrollSection } from "./HorizontalScrollSection";
import { HomeCard } from "./HomeCard";

interface WeeklyPopularSongsProps {
  songs: Track[];
  onSelect: (track: Track, contextQueue?: Track[]) => void;
  onAddArtist?: (artistData: { name: string; thumbnail?: string }) => void;
}

export const WeeklyPopularSongs = ({ songs, onSelect, onAddArtist }: WeeklyPopularSongsProps) => {
  if (!songs || songs.length === 0) return null;

  return (
    <HorizontalScrollSection title="Weekly Popular Songs">
      {songs.map((track) => (
        <div key={track.id} className="shrink-0 w-[160px] sm:w-[200px]">
          <HomeCard
            track={track}
            onSelect={(t) => onSelect(t, songs)}
            onAdd={onAddArtist ? () => onAddArtist({ name: track.artist, thumbnail: track.thumbnail }) : undefined}
            title={track.title}
            subtitle={track.artist}
          />
        </div>
      ))}
    </HorizontalScrollSection>
  );
};
