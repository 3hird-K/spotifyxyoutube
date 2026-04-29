import { useState } from "react";
import { Home, Library, Plus, Heart, ListMusic, Trash2, Pencil } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import Logo from '../public/images/spotifylogo.png';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SidebarProps {
  onSelect: (index: number) => void;
  liked: Set<string>;
  activeView: string;
  setActiveView: (v: string) => void;
  playlists: Playlist[];
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  onEditPlaylist: (playlist: Playlist) => void;
  recentlyPlayed: Track[];
  onTrackDetail: (track: Track) => void;
}

export default function Sidebar({
  liked,
  activeView,
  setActiveView,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onEditPlaylist,
  recentlyPlayed,
  onTrackDetail,
}: SidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreate = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    onCreatePlaylist(name);
    setNewPlaylistName("");
    setShowCreateModal(false);
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-black text-white shrink-0 border-r border-zinc-900">
        {/* Logo */}
        <div className="px-6 pt-7 pb-4">
          <a href="https://spotifyxyoutube.vercel.app/">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#0c7430f1] flex items-center justify-center overflow-hidden">
                <img className="w-full h-full object-contain opacity-80" src={Logo} alt="Logo" />
              </div>
              <span className="text-xl font-bold tracking-tight">Spotify Premium</span>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav className="px-3 space-y-1">
          {[
            { icon: Home, label: "Home", view: "home" },
            { icon: Library, label: "Your Library", view: "library" },
          ].map(({ icon: Icon, label, view }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${activeView === view
                ? "text-white bg-zinc-800"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </nav>

        <Separator className="mx-3 my-4 bg-zinc-800/50" />

        {/* Liked Songs + Create Playlist */}
        <div className="px-3 space-y-1">
          <button
            onClick={() => setActiveView("liked")}
            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${activeView === "liked"
              ? "text-white bg-zinc-800"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
          >
            <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
              <Heart size={12} className="text-white fill-white" />
            </span>
            <span className="flex-1 text-left">Liked Songs</span>
            {liked.size > 0 && (
              <span className="text-[10px] bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 font-bold">
                {liked.size}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Plus size={12} />
            </span>
            Create Playlist
          </button>
        </div>

        {/* Playlists Scroll Area */}
        <ScrollArea className="flex-1 px-3 mt-4">
          {playlists.length > 0 && (
            <div className="pb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-3 mb-3 tracking-[0.2em]">
                Playlists
              </p>
              <div className="space-y-0.5">
                {playlists.map((pl) => (
                  <div key={pl.id} className="group flex items-center">
                    <button
                      onClick={() => setActiveView(`playlist:${pl.id}`)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left truncate ${activeView === `playlist:${pl.id}`
                        ? "text-white bg-zinc-800"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                        }`}
                    >
                      <ListMusic size={16} className="text-zinc-500" />
                      <span className="truncate">{pl.name}</span>
                    </button>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => onEditPlaylist(pl)}
                        className="p-2 text-zinc-500 hover:text-white transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDeletePlaylist(pl)}
                        className="p-2 text-zinc-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentlyPlayed.length > 0 && (
            <div className="pb-4">
              <p className="text-[10px] text-zinc-500 uppercase font-black px-3 mb-3 tracking-[0.2em]">
                Recently Played
              </p>
              <div className="space-y-1">
                {recentlyPlayed.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => onTrackDetail(track)}
                    className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors group"
                  >
                    <img src={track.thumbnail} className="w-8 h-8 rounded object-cover shadow-md" alt="" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate text-zinc-300 group-hover:text-white">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>


      </aside>

      {/* Create Playlist Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newPlaylistName.trim()}
                className="bg-[#1DB954] hover:bg-[#1ed760] text-black"
              >
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}