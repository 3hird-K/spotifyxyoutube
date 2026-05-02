import { useState } from "react";
import {
    Play, Pause, Heart, Trash2, ListMusic, LogOut, Menu, Plus,
    Search,
} from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../hooks/useUserProfile";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface MobileHomeViewProps {
    // Data
    tracks: Track[];
    recentlyPlayed: Track[];
    playlists: Playlist[];
    liked: Set<string>;
    currentTrack: Track | null;
    isPlaying: boolean;
    activePlaylist: Playlist | null;

    // User
    profile: UserProfile;

    // Genre/Tab state (lifted up so MainContent owns it)
    selectedGenre: string;
    onGenreChange: (genre: string) => void;

    // Actions
    onSelect: (track: Track, contextQueue?: Track[]) => void;
    onToggleLike: (track: Track) => void;
    onTogglePlay: () => void;
    onTrackDetail: (track: Track) => void;
    setActiveView: (view: string) => void;
    onOpenCreatePlaylist: () => void;
    onDeletePlaylist: (playlist: Playlist) => void;
    isPlaylistView: boolean;
    onOpenSearch: () => void;
}

export function MobileHomeView({
    tracks,
    recentlyPlayed,
    playlists,
    liked,
    currentTrack,
    isPlaying,
    activePlaylist,
    profile,
    onGenreChange,
    onSelect,
    onToggleLike,
    onTogglePlay,
    onTrackDetail,
    setActiveView,
    onOpenCreatePlaylist,
    onDeletePlaylist,
    isPlaylistView,
    onOpenSearch,
}: MobileHomeViewProps) {
    const [activeTab, setActiveTab] = useState("All");
    const { isGuest, displayName, avatarUrl, avatarInitial } = profile;

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab === "Music") onGenreChange("Pop");
        else if (tab === "Podcasts") onGenreChange("Podcast");
        else onGenreChange("All");
    };

    return (
        <main className="md:hidden flex-1 flex flex-col min-h-0 w-full bg-zinc-950 overflow-y-auto pb-40">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-md w-full px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="bg-zinc-900/80 rounded-lg p-2 flex items-center gap-3 border border-zinc-800 flex-1">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="profile"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                    {avatarInitial}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{displayName}</p>
                            <p className="text-[10px] text-green-400 font-bold uppercase">
                                {isGuest ? "Guest" : "Premium"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-3">
                        <button
                            onClick={onOpenSearch}
                            className="text-zinc-400 hover:text-white"
                        >
                            <Search size={24} />
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <button className="text-zinc-400 hover:text-white">
                                        <Menu size={24} />
                                    </button>
                                }
                            />
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wider">
                                        Menu
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={onOpenCreatePlaylist}
                                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 cursor-pointer flex items-center gap-2"
                                    >
                                        <Plus size={14} />
                                        <span>Create Playlist</span>
                                    </DropdownMenuItem>
                                    {isPlaylistView && activePlaylist && (
                                        <DropdownMenuItem
                                            onClick={() => onDeletePlaylist(activePlaylist)}
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            <span>Delete Playlist</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                                <Separator className="my-2 bg-zinc-800" />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wider">
                                        Account
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={async () => { await supabase.auth.signOut(); }}
                                        className="text-zinc-400 hover:text-red-500 hover:bg-zinc-800/50 cursor-pointer flex items-center gap-2"
                                    >
                                        <LogOut size={14} />
                                        <span>Sign out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {["All", "Music", "Podcasts"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`shrink-0 px-4 py-1.5 rounded-full font-medium text-sm transition-colors ${activeTab === tab
                                ? "bg-[#1DB954] text-black"
                                : "bg-zinc-800/80 text-zinc-300 hover:text-white"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-2 w-full">
                {/* Quick playlists grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <QuickPlaylistCard
                        onClick={() => setActiveView("liked")}
                        name="Liked Songs"
                        icon={<Heart size={18} className="text-white fill-white" />}
                        iconBg="bg-gradient-to-br from-indigo-600 to-purple-800"
                    />

                    {playlists.slice(0, 5).map((pl) => (
                        <QuickPlaylistCard
                            key={pl.id}
                            onClick={() => setActiveView(`playlist:${pl.id}`)}
                            name={pl.name}
                            thumbnail={pl.tracks[0]?.thumbnail}
                        />
                    ))}
                </div>

                {/* Recommended */}
                <Section title="Recommended for you">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {(tracks.length > 0 ? tracks : recentlyPlayed).slice(0, 6).map((track) => (
                            <MobileTrackCard key={track.id} track={track} onSelect={(t) => onSelect(t, tracks.length > 0 ? tracks : recentlyPlayed)} />
                        ))}
                    </div>
                </Section>

                {/* Made for you */}
                <Section title="Made for You">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                        {tracks.slice(6, 12).map((track) => (
                            <div
                                key={track.id}
                                onClick={() => onSelect(track, tracks)}
                                className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer"
                            >
                                <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                                    <img
                                        src={track.thumbnail}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        alt=""
                                    />
                                </div>
                                <p className="text-[10px] font-medium text-zinc-400 line-clamp-2">
                                    Daily Mix featuring {track.artist} and more
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>
            </div>

            {/* Removed FloatingNowPlaying bar from here as it is now global in App.tsx */}
        </main>
    );
}

// ─── Sub-components (file-local) ────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h2 className="text-xl font-black text-white mb-4">{title}</h2>
            {children}
        </div>
    );
}

function QuickPlaylistCard({
    onClick,
    name,
    thumbnail,
    icon,
    iconBg = "bg-zinc-800",
}: {
    onClick: () => void;
    name: string;
    thumbnail?: string;
    icon?: React.ReactNode;
    iconBg?: string;
}) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-2 bg-zinc-900/80 rounded-md overflow-hidden hover:bg-zinc-800 transition-colors cursor-pointer h-14"
        >
            <div className={`w-14 h-14 ${iconBg} flex items-center justify-center shrink-0`}>
                {thumbnail ? (
                    <img src={thumbnail} className="w-full h-full object-cover" alt="" />
                ) : icon ? (
                    icon
                ) : (
                    <ListMusic size={16} className="text-zinc-600" />
                )}
            </div>
            <span className="text-[11px] font-bold text-white truncate pr-2">{name}</span>
        </div>
    );
}

function MobileTrackCard({
    track,
    onSelect,
}: {
    track: Track;
    onSelect: (t: Track) => void;
}) {
    return (
        <div
            onClick={() => onSelect(track)}
            className="flex flex-col gap-2 group cursor-pointer"
        >
            <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                <img
                    src={track.thumbnail}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    alt=""
                />
                <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Play size={14} className="text-black fill-black ml-0.5" />
                </button>
            </div>
            <div className="px-0.5">
                <p className="text-[11px] font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] text-zinc-500 truncate" onClick={(e) => e.stopPropagation()}>
                    <a
                        href={track.youtubeArtistUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.artist)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#1DB954] hover:underline transition-colors"
                    >
                        {track.artist}
                    </a>
                </p>
            </div>
        </div>
    );
}