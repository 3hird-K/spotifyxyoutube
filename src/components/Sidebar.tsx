import { Home, Search, Library, Music, Plus, Heart } from "lucide-react";
import { Track } from "../data/tracks";

interface SidebarProps {
  queue: Track[];
  currentIndex: number;
  onSelect: (index: number) => void;
  liked: Set<string>;
  activeView: string;
  setActiveView: (v: string) => void;
}

export default function Sidebar({
  queue,
  currentIndex,
  onSelect,
  liked,
  activeView,
  setActiveView,
}: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-black text-white shrink-0">
      {/* Logo */}
      <div className="px-6 pt-7 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
            <Music size={16} className="text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">Spotube</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-1">
        {[
          { icon: Home, label: "Home", view: "home" },
          { icon: Search, label: "Search", view: "search" },
          { icon: Library, label: "Your Library", view: "library" },
        ].map(({ icon: Icon, label, view }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              activeView === view
                ? "text-white bg-zinc-800"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mx-3 my-4 border-t border-zinc-800" />

      {/* Liked songs shortcut */}
      <div className="px-3 space-y-1">
        <button
          onClick={() => setActiveView("liked")}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
            activeView === "liked"
              ? "text-white bg-zinc-800"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Heart size={12} className="text-white fill-white" />
          </span>
          Liked Songs
        </button>

        <button className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
          <span className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
            <Plus size={12} />
          </span>
          Create Playlist
        </button>
      </div>

      <div className="mx-3 my-4 border-t border-zinc-800" />

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        <p className="text-xs text-zinc-500 uppercase font-bold px-3 mb-3 tracking-widest">
          Queue
        </p>
        <div className="space-y-1">
          {queue.map((track, i) => (
            <button
              key={track.id}
              onClick={() => onSelect(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors group text-left ${
                i === currentIndex
                  ? "bg-zinc-800 text-[#1DB954]"
                  : "hover:bg-zinc-800/60 text-zinc-300 hover:text-white"
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-9 h-9 rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/default-cover.jpg";
                  }}
                />
                {i === currentIndex && (
                  <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <p className={`text-sm font-medium truncate ${i === currentIndex ? "text-[#1DB954]" : ""}`}>
                  {track.title}
                </p>
                <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
              </div>
              {liked.has(track.id) && (
                <Heart size={10} className="ml-auto shrink-0 text-[#1DB954] fill-[#1DB954]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
