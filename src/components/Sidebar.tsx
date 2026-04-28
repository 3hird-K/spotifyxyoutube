import { useState } from "react";
import { Home, Library, Plus, Heart, ListMusic, Trash2, LogOut, User, LogIn } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import Logo from '../public/images/spotifylogo.png';
import { supabase } from "../lib/supabase"; // Added for Logout

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
  user: any;
  currentTrack: Track | null;
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
  user,
  currentTrack,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Helper for Guest vs Google User
  const isGuest = user?.is_anonymous;
  const displayName = isGuest ? "Guest User" : user?.user_metadata?.full_name || "User";
  const avatarUrl = isGuest ? null : user?.user_metadata?.avatar_url;

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-black text-white shrink-0 border-r border-zinc-900">
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
                      <button 
                        onClick={() => onDeletePlaylist(pl.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all"
                      >
                         <Trash2 size={14} />
                      </button>
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

        {/* USER PROFILE SECTION (Anchored at bottom) */}
        <div className="mt-auto p-3 border-t border-zinc-800/50">
            {/* Currently Playing Track */}
            {currentTrack && (
              <div 
                onClick={() => onTrackDetail(currentTrack)}
                className="bg-zinc-900/80 rounded-lg p-2 mb-3 cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <img 
                  src={currentTrack.thumbnail} 
                  alt={currentTrack.title}
                  className="w-full aspect-square rounded-md mb-2 object-cover shadow-md" 
                />
                <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            )}

            {/* User Profile Card */}
            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-zinc-500" />
                        )}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
                            {isGuest ? "Free Account" : "Premium"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-1">
                    {isGuest ? (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => supabase.auth.signOut()} 
                            className="w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs h-8"
                        >
                            <LogIn size={14} />
                            Log in to Sync
                        </Button>
                    ) : (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleLogout} 
                            className="w-full justify-start gap-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 text-xs h-8"
                        >
                            <LogOut size={14} />
                            Sign out
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </aside>

      {/* Create Playlist Modal (unchanged) */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
         {/* ... (Keep your existing Dialog code) ... */}
      </Dialog>
    </>
  );
}