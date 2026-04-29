import { Heart, Play, ListMusic } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";

export function LibraryView({
  playlists,
  likedTracks,
  recentlyPlayed,
  onSelectView,
  onTrackDetail,
  onPlayPlaylist,
}: {
  playlists: Playlist[];
  likedTracks: Track[];
  recentlyPlayed: Track[];
  onSelectView: (v: string) => void;
  onTrackDetail: (t: Track) => void;
  onPlayPlaylist: (tracks: Track[]) => void;
}) {
  return (
    <main className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Your Library</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Liked Songs Card */}
        <div
          onClick={() => onSelectView("liked")}
          className="relative group aspect-square rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 p-6 flex flex-col justify-end cursor-pointer hover:shadow-2xl transition-all overflow-hidden"
        >
          <div className="absolute top-4 right-4">
            <Heart size={32} className="text-white fill-white opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Liked Songs</h2>
            <p className="text-indigo-100 font-medium">{likedTracks.length} liked song{likedTracks.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
            onClick={(e) => { e.stopPropagation(); onPlayPlaylist(likedTracks); }}
          >
            <Play size={24} className="text-black ml-1 fill-black" />
          </button>
        </div>

        {/* Playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => onSelectView(`playlist:${pl.id}`)}
            className="relative group p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800/50 overflow-hidden"
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-4 shadow-lg relative">
              {pl.tracks[0]?.thumbnail ? (
                <img src={pl.tracks[0].thumbnail} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <ListMusic size={48} className="text-zinc-700" />
                </div>
              )}
              <button
                className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
                onClick={(e) => { e.stopPropagation(); onPlayPlaylist(pl.tracks); }}
              >
                <Play size={20} className="text-black ml-1 fill-black" />
              </button>
            </div>
            <h3 className="text-white font-bold truncate overflow-hidden" title={pl.name}>{pl.name}</h3>
            <p className="text-zinc-500 text-sm truncate overflow-hidden" title={`${pl.tracks.length} tracks`}>{pl.tracks.length} tracks</p>
          </div>
        ))}
      </div>

      {recentlyPlayed.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-white mt-12 mb-6">Recently Played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <div
                key={track.id}
                onClick={() => onTrackDetail(track)}
                className="group p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800/50"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-4 shadow-lg">
                  <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <h3 className="text-white font-semibold text-sm truncate">{track.title}</h3>
                <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
