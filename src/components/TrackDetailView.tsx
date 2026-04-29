import { Play, Pause, Heart, Plus, ListPlus, Check, Loader2 } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrackRow } from "./TrackRow";

export function TrackDetailView({
  track,
  isPlaying,
  isCurrent,
  onTogglePlay,
  onSelect,
  liked,
  onToggleLike,
  recommendedTracks,
  isLoadingRecommended,
  playlists,
  onAddToPlaylist,
  onTrackDetail,
}: {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  onTogglePlay: () => void;
  onSelect: (t: Track) => void;
  liked: Set<string>;
  onToggleLike: (track: Track) => void;
  recommendedTracks: Track[];
  isLoadingRecommended: boolean;
  playlists: Playlist[];
  onAddToPlaylist: (plId: string, t: Track) => void;
  onTrackDetail: (t: Track) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-zinc-800 to-zinc-950 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-end mb-8 sm:mb-10">
        <div className="w-48 h-48 sm:w-64 sm:h-64 shadow-2xl rounded-xl overflow-hidden shrink-0">
          <img src={track.thumbnail} alt={track.album} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Track</p>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight line-clamp-3">{track.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-white font-bold text-sm">
            <span className="hover:underline cursor-pointer truncate">{track.artist}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 font-medium truncate">{track.album}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 font-medium">{track.year}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8 sm:mb-12">
        <Button
          size="icon"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] transition-transform hover:scale-105 active:scale-95 shadow-xl border-none shrink-0"
          onClick={() => isCurrent ? onTogglePlay() : onSelect(track)}
        >
          {isPlaying ? <Pause size={24} className="text-black fill-black" /> : <Play size={24} className="text-black ml-1 fill-black" />}
        </Button>
        <button
          onClick={() => onToggleLike(track)}
          className={`transition-colors shrink-0 ${liked.has(track.id) ? "text-[#1DB954]" : "text-zinc-400 hover:text-white"}`}
        >
          <Heart size={28} className={liked.has(track.id) ? "fill-[#1DB954]" : ""} />
        </button>

        {/* Add to playlist dropdown — matches TrackRow pattern */}
        {playlists.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="text-zinc-400 hover:text-white transition-colors shrink-0">
                  <Plus size={28} />
                </button>
              }
            />
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={8}
              className="bg-zinc-900 border-zinc-800 min-w-48"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wider">
                  Add to Playlist
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              {playlists.map((pl) => {
                const alreadyIn = pl.tracks.some((t) => t.id === track.id);
                return (
                  <DropdownMenuItem
                    key={pl.id}
                    onClick={() => {
                      if (!alreadyIn) onAddToPlaylist(pl.id, track);
                    }}
                    className={`flex items-center gap-2 cursor-pointer ${alreadyIn
                      ? "text-zinc-500 cursor-default"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                      }`}
                  >
                    {alreadyIn ? (
                      <Check size={14} className="text-[#1DB954] shrink-0" />
                    ) : (
                      <ListPlus size={14} className="text-zinc-500 shrink-0" />
                    )}
                    <span className="truncate">{pl.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator className="bg-zinc-800 mb-6 sm:mb-8" />

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Recommended for you</h2>
      {isLoadingRecommended ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-zinc-700" size={32} />
        </div>
      ) : (
        <div className="space-y-1">
          {recommendedTracks.map((t, idx) => (
            <TrackRow
              key={t.id}
              track={t}
              idx={idx}
              isCurrent={false}
              isTrackPlaying={false}
              isLiked={liked.has(t.id)}
              onSelect={onSelect}
              onToggleLike={onToggleLike}
              playlists={playlists}
              onAddToPlaylist={onAddToPlaylist}
              isInPlaylist={false}
              activePlaylistId={null}
              onRemoveFromPlaylist={() => { }}
              onTrackDetail={onTrackDetail}
            />
          ))}
        </div>
      )}
    </main>
  );
}
