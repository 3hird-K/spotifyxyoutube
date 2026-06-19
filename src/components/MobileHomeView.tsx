import { useState } from "react";
import {
    Heart, Trash2, ListMusic, LogOut, Menu, Plus,
    Search, Download
} from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { UserProfile } from "../hooks/useUserProfile";
import { usePWAInstall } from "../hooks/usePWAInstall";
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
    activePlaylist: Playlist | null;

    // User
    profile: UserProfile;

    // Genre/Tab state (lifted up so MainContent owns it)
    selectedGenre: string;
    onGenreChange: (genre: string) => void;

    // Actions
    onSelect: (track: Track, contextQueue?: Track[]) => void;
    setActiveView: (view: string) => void;
    onOpenCreatePlaylist: () => void;
    onDeletePlaylist: (playlist: Playlist) => void;
    isPlaylistView: boolean;
    onOpenSearch: () => void;
    suggestedSongs?: Track[];
    suggestedArtists?: any[];
    setSelectedArtist?: (artist: any) => void;
    weeklyPopularSongs?: Track[];
    onSignOut?: () => void;
}

export function MobileHomeView({
    tracks,
    recentlyPlayed,
    playlists,
    activePlaylist,
    profile,
    onGenreChange,
    onSelect,
    setActiveView,
    onOpenCreatePlaylist,
    onDeletePlaylist,
    isPlaylistView,
    onOpenSearch,
    suggestedSongs = [],
    suggestedArtists = [],
    setSelectedArtist,
    weeklyPopularSongs = [],
    onSignOut,
}: MobileHomeViewProps) {
    const [activeTab, setActiveTab] = useState("All");
    const { isGuest, displayName, avatarUrl, avatarInitial } = profile;
    const { isInstallable, installApp } = usePWAInstall();

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
                                    {isInstallable && (
                                        <DropdownMenuItem
                                            onClick={installApp}
                                            className="text-[#1DB954] hover:text-[#1ed760] hover:bg-[#1DB954]/10 cursor-pointer flex items-center gap-2"
                                        >
                                            <Download size={14} />
                                            <span>Install App</span>
                                        </DropdownMenuItem>
                                    )}
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
                                        onClick={() => { if (onSignOut) onSignOut(); }}
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
                {isInstallable && (
                    <div className="mb-4 bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                                <Download size={16} className="text-[#1DB954]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Install App</p>
                                <p className="text-[10px] text-zinc-400">Add to home screen for background play.</p>
                            </div>
                        </div>
                        <button
                            onClick={installApp}
                            className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
                        >
                            Install
                        </button>
                    </div>
                )}

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

                {/* Most Popular */}
                <Section title="Most Popular songs">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                        {(tracks.length > 0 ? tracks : recentlyPlayed).slice(0, 20).map((track) => (
                            <div
                                key={`popular-${track.id}`}
                                onClick={() => {
                                    if (setSelectedArtist) {
                                        setSelectedArtist({ name: track.artist, thumbnail: track.thumbnail });
                                        setActiveView("artist-detail");
                                    } else {
                                        onSelect(track, tracks.length > 0 ? tracks : recentlyPlayed);
                                    }
                                }}
                                className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer"
                            >
                                <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                                    <img
                                        src={track.thumbnail}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        alt=""
                                    />
                                </div>
                                <p className="text-[11px] font-bold text-white truncate px-0.5">
                                    {track.title}
                                </p>
                                <p className="text-[10px] font-medium text-zinc-400 line-clamp-2 px-0.5">
                                    {track.artist}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Recommended Artists */}
                {suggestedArtists && suggestedArtists.length > 0 && (
                    <Section title="Recommended artists">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                            {suggestedArtists.slice(0, 20).map((artist, idx) => {
                                const currentThumbnail = artist.thumbnail || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name)}`;
                                return (
                                <div
                                    key={`artist-rec-${idx}`}
                                    onClick={() => {
                                        if (setSelectedArtist) {
                                            setSelectedArtist({
                                                name: artist.name,
                                                thumbnail: currentThumbnail,
                                                youtubeArtistUrl: artist.youtubeArtistUrl
                                            });
                                            setActiveView("artist-detail");
                                        }
                                    }}
                                    className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer items-center"
                                >
                                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-zinc-900 shadow-md">
                                        <img
                                            src={currentThumbnail}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            alt=""
                                            onError={(e) => {
                                                e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name)}`;
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] font-bold text-white truncate text-center w-full px-1">
                                        {artist.name}
                                    </p>
                                    <p className="text-[10px] font-medium text-zinc-400 text-center w-full">
                                        Artist
                                    </p>
                                </div>
                            )})}
                        </div>
                    </Section>
                )}

                {/* Suggested Songs */}
                {suggestedSongs && suggestedSongs.length > 0 && (
                    <Section title="Suggested songs">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                            {suggestedSongs.slice(0, 20).map((track) => (
                                <div
                                    key={`suggested-${track.id}`}
                                    onClick={() => onSelect(track, suggestedSongs)}
                                    className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer"
                                >
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                                        <img
                                            src={track.thumbnail}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            alt=""
                                        />
                                    </div>
                                    <p className="text-[11px] font-bold text-white truncate px-0.5">
                                        {track.title}
                                    </p>
                                    <p className="text-[10px] font-medium text-zinc-400 line-clamp-2 px-0.5">
                                        {track.artist}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Weekly Popular Songs */}
                {weeklyPopularSongs && weeklyPopularSongs.length > 0 && (
                    <Section title="Weekly Popular Songs">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                            {weeklyPopularSongs.map((track) => (
                                <div
                                    key={`weekly-${track.id}`}
                                    onClick={() => onSelect(track, weeklyPopularSongs)}
                                    className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer"
                                >
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                                        <img
                                            src={track.thumbnail}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            alt=""
                                        />
                                    </div>
                                    <p className="text-[11px] font-bold text-white truncate px-0.5">
                                        {track.title}
                                    </p>
                                    <p className="text-[10px] font-medium text-zinc-400 line-clamp-2 px-0.5">
                                        {track.artist}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Recently Played */}
                {recentlyPlayed && recentlyPlayed.length > 0 && (
                    <Section title="Recently played">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                            {recentlyPlayed.slice(0, 20).map((track) => (
                                <div
                                    key={`recent-${track.id}`}
                                    onClick={() => onSelect(track, recentlyPlayed)}
                                    className="shrink-0 w-32 flex flex-col gap-2 group cursor-pointer"
                                >
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-zinc-900">
                                        <img
                                            src={track.thumbnail}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            alt=""
                                        />
                                    </div>
                                    <p className="text-[11px] font-bold text-white truncate px-0.5">
                                        {track.title}
                                    </p>
                                    <p className="text-[10px] font-medium text-zinc-400 line-clamp-2 px-0.5">
                                        {track.artist}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}
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