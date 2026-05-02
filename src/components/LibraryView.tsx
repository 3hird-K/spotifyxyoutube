import { Heart, Play, ListMusic } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { HorizontalScrollSection } from "./HorizontalScrollSection";
import { HomeCard } from "./HomeCard";

export function LibraryView({
  playlists,
  likedTracks,
  recentlyPlayed,
  onSelectView,
  onTrackDetail,
  onSelect,
  onPlayPlaylist,
}: {
  playlists: Playlist[];
  likedTracks: Track[];
  recentlyPlayed: Track[];
  onSelectView: (v: string) => void;
  onTrackDetail: (t: Track) => void;
  onSelect: (track: Track, contextQueue?: Track[]) => void;
  onPlayPlaylist: (tracks: Track[]) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 select-none">
      <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">Your Library</h1>

      <div className="mb-6">
        <HorizontalScrollSection title="Playlists & Liked Songs">
          {/* Liked Songs Card */}
          <div className="shrink-0 w-[180px] sm:w-[240px] pr-2">
            <div
              onClick={() => onSelectView("liked")}
              className="relative group aspect-square rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 p-4 sm:p-6 flex flex-col justify-end cursor-pointer hover:shadow-2xl transition-all overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <Heart size={24} className="text-white fill-white opacity-20 group-hover:opacity-40 transition-opacity sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">Liked Songs</h2>
                <p className="text-indigo-100 text-xs sm:text-sm font-medium">{likedTracks.length} liked song{likedTracks.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                className="absolute bottom-4 right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
                onClick={(e) => { e.stopPropagation(); onPlayPlaylist(likedTracks); }}
              >
                <Play size={20} className="text-black ml-1 fill-black sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Playlists */}
          {playlists.map((pl) => (
            <div key={pl.id} className="shrink-0 w-[180px] sm:w-[240px] pr-2">
              <div
                onClick={() => onSelectView(`playlist:${pl.id}`)}
                className="relative group p-3 sm:p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800/50 overflow-hidden h-full"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-3 sm:mb-4 shadow-lg relative">
                  {pl.tracks[0]?.thumbnail ? (
                    <img src={pl.tracks[0].thumbnail} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <ListMusic size={40} className="text-zinc-700 sm:w-12 sm:h-12" />
                    </div>
                  )}
                  <button
                    className="absolute bottom-2 right-2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
                    onClick={(e) => { e.stopPropagation(); onPlayPlaylist(pl.tracks); }}
                  >
                    <Play size={18} className="text-black ml-1 fill-black sm:w-5 sm:h-5" />
                  </button>
                </div>
                <h3 className="text-white font-bold text-sm sm:text-base truncate overflow-hidden" title={pl.name}>{pl.name}</h3>
                <p className="text-zinc-500 text-xs sm:text-sm truncate overflow-hidden" title={`${pl.tracks.length} tracks`}>{pl.tracks.length} tracks</p>
              </div>
            </div>
          ))}
        </HorizontalScrollSection>
      </div>

      {recentlyPlayed.length > 0 && (
        <div>
          <HorizontalScrollSection title="Recently Played">
            {recentlyPlayed.map((track) => (
              <div key={track.id} className="shrink-0 w-[180px] sm:w-[220px]">
                <HomeCard
                  track={track}
                  onSelect={(t) => onSelect(t, recentlyPlayed)}
                  title={track.title}
                  subtitle={track.artist}
                />
              </div>
            ))}
          </HorizontalScrollSection>
        </div>
      )}
    </main>
  );
}
