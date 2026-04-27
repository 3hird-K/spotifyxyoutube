import { useState } from "react";
import { Home, Library, Plus, Heart, ListMusic, Trash2 } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import Logo from '../../public/images/spotifylogo.png';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";


interface SidebarProps {
  queue: Track[];
  currentIndex: number;
  onSelect: (index: number) => void;
  liked: Set<string>;
  activeView: string;
  setActiveView: (v: string) => void;
  playlists: Playlist[];
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  recentlyPlayed: Track[];
  onTrackDetail: (track: Track) => void;
}

export default function Sidebar({
  queue,
  currentIndex,
  liked,
  activeView,
  setActiveView,
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
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
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-black text-white shrink-0">
        {/* Logo */}
        <div className="px-6 pt-7 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0c7430f1] flex items-center justify-center overflow-hidden">
              <img className="w-full h-full object-contain opacity-80" src={Logo} alt="Logo" />
            </div>
            <span className="text-xl font-bold tracking-tight">Spatify Premium</span>
          </div>
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
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                activeView === view
                  ? "text-white bg-zinc-800"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </nav>

        <Separator className="mx-3 my-4 bg-zinc-800" />

        {/* Liked Songs + Create Playlist */}
        <div className="px-3 space-y-1">
          <button
            onClick={() => setActiveView("liked")}
            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              activeView === "liked"
                ? "text-white bg-zinc-800"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
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
            <span className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center shrink-0">
              <Plus size={12} />
            </span>
            Create Playlist
          </button>
        </div>

        {/* User Playlists */}
        {playlists.length > 0 && (
          <>
            <Separator className="mx-3 my-3 bg-zinc-800" />
            <div className="px-3 pb-2">
              <p className="text-xs text-zinc-500 uppercase font-bold px-3 mb-2 tracking-widest">
                Playlists
              </p>
              <div className="space-y-0.5">
                {playlists.map((pl) => (
                  <div key={pl.id} className="group flex items-center">
                    <button
                      onClick={() => setActiveView(`playlist:${pl.id}`)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left truncate ${
                        activeView === `playlist:${pl.id}`
                          ? "text-white bg-zinc-800"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <ListMusic size={11} className="text-zinc-400" />
                      </span>
                      <span className="truncate">{pl.name}</span>
                      <span className="ml-auto text-[10px] text-zinc-600 shrink-0">
                        {pl.tracks.length}
                      </span>
                    </button>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePlaylist(pl.id);
                              if (activeView === `playlist:${pl.id}`) setActiveView("home");
                            }}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-zinc-800/50 transition-all"
                          />
                        }
                      >
                        <Trash2 size={13} />
                      </TooltipTrigger>
                      <TooltipContent side="right">Delete playlist</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator className="mx-3 my-3 bg-zinc-800" />

        {/* Recents list */}
        <ScrollArea className="flex-1 px-3 pb-4">
          <p className="text-xs text-zinc-500 uppercase font-bold px-3 mb-3 tracking-widest">
            Recents
          </p>
          <div className="space-y-1">
            {recentlyPlayed.map((track) => {
              const trackIndex = queue.findIndex(t => t.id === track.id);
              const isCurrentTrack = trackIndex === currentIndex;
              return (
              <button
                key={track.id}
                onClick={() => onTrackDetail(track)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors group text-left ${
                  isCurrentTrack
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
                  {isCurrentTrack && (
                    <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-sm font-medium truncate ${isCurrentTrack ? "text-[#1DB954]" : ""}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                </div>
                {liked.has(track.id) && (
                  <Heart size={10} className="ml-auto shrink-0 text-[#1DB954] fill-[#1DB954]" />
                )}
              </button>
            );
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* Create Playlist Modal — shadcn Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Create Playlist</DialogTitle>
          </DialogHeader>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2 block">
              Playlist Name
            </label>
            <Input
              autoFocus
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="My awesome playlist…"
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus-visible:border-[#1DB954] focus-visible:ring-[#1DB954]/30"
            />
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newPlaylistName.trim()}
              className="flex-1 bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] disabled:opacity-40"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
