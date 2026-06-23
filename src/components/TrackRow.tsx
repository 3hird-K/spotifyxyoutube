import { Play, Heart, ExternalLink, Trash2, ListPlus, Check, MoreHorizontal, ListOrdered, GripVertical, Clock } from "lucide-react";
import { Track } from "../data/tracks";
import { Playlist } from "../data/playlists";
import { formatTime } from "../utils/format";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TrackRow({
  track,
  idx,
  isCurrent,
  isTrackPlaying,
  isLiked,
  onSelect,
  onToggleLike,
  playlists,
  onAddToPlaylist,
  isInPlaylist,
  activePlaylistId,
  onRemoveFromPlaylist,
  onTrackDetail,
  onPlayNext,
  innerRef,
  draggableProps,
  dragHandleProps,
}: {
  track: Track;
  idx: number;
  isCurrent: boolean;
  isTrackPlaying: boolean;
  isLiked: boolean;
  onSelect: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  isInPlaylist: boolean;
  activePlaylistId: string | null;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onTrackDetail: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  innerRef?: (element: HTMLElement | null) => void;
  draggableProps?: any;
  dragHandleProps?: any;
}) {
  return (
    <div
      ref={innerRef}
      {...draggableProps}
      className={`grid gap-2 sm:gap-4 items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl group cursor-pointer transition-colors ${
        isInPlaylist 
          ? "grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[auto_auto_minmax(0,2fr)_minmax(0,1fr)_auto_auto]"
          : "grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_auto_auto]"
      } ${isCurrent
        ? "bg-[#1DB954]/10 border border-[#1DB954]/20"
        : "hover:bg-zinc-800/60"
        }`}
      onClick={() => onTrackDetail(track)}
    >
      {/* Drag Handle */}
      {isInPlaylist && (
        <div
          {...dragHandleProps}
          className="w-4 flex items-center justify-center cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white sm:opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Index / Play indicator */}
      <div className="w-8 flex items-center justify-center">
        {isCurrent ? (
          isTrackPlaying ? (
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: "60%" }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_0.2s_infinite]" style={{ height: "100%" }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-[music-bar_0.8s_ease-in-out_0.4s_infinite]" style={{ height: "40%" }} />
            </span>
          ) : (
            <Play size={14} className="text-[#1DB954]" fill="#1DB954" />
          )
        ) : (
          <>
            <span className="text-zinc-500 text-sm group-hover:hidden">{idx + 1}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(track); }}
              className="text-white hidden group-hover:block"
            >
              <Play size={14} fill="white" />
            </button>
          </>
        )}
      </div>

      {/* Title + thumbnail */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none'; 
              (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-zinc-700', 'to-zinc-900');
            }}
          />
        </div>
        <div className="overflow-hidden">
          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-[#1DB954]" : "text-white"}`}>
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
            <a
              href={track.youtubeArtistUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.artist)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DB954] hover:underline transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {track.artist}
            </a>
          </p>
        </div>
      </div>

      {/* Album — hidden on mobile */}
      <div className="hidden sm:block overflow-hidden">
        <p className="text-sm text-zinc-400 truncate hover:text-white transition-colors">{track.album}</p>
      </div>

      {/* Listeners — removed */}

      {/* Duration + Like + Actions (combined on mobile) */}
      <div className="flex items-center gap-1 sm:gap-3 justify-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => { e.stopPropagation(); onToggleLike(track); }}
                className={`transition-all hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-zinc-700/50 ${isLiked ? "!opacity-100 text-[#1DB954]" : "text-zinc-600"
                  }`}
              >
                <Heart size={15} className={isLiked ? "fill-[#1DB954]" : ""} />
              </Button>
            }
          />
          <TooltipContent>{isLiked ? "Remove from Liked" : "Add to Liked"}</TooltipContent>
        </Tooltip>
        <span className="text-xs sm:text-sm text-zinc-500 tabular-nums">{formatTime(track.duration)}</span>

        {/* Actions — inline on mobile, separate column on desktop */}
        <div className="flex items-center gap-1 sm:hidden" onClick={(e) => e.stopPropagation()}>
          {/* YouTube link */}
          <a
            href={track.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-red-500 transition-colors p-1 inline-flex"
          >
            <ExternalLink size={13} />
          </a>
          {/* Remove from playlist (mobile) */}
          {isInPlaylist && activePlaylistId && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemoveFromPlaylist(activePlaylistId, track.id)}
              className="text-zinc-600 hover:text-red-400 transition-colors hover:bg-zinc-700/50"
            >
              <Trash2 size={13} />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="text-zinc-600 hover:text-[#1DB954] transition-colors p-1 inline-flex">
                  <MoreHorizontal size={15} />
                </button>
              }
            />
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="bg-zinc-800 border-zinc-700 min-w-44"
              >
                {onPlayNext && (
                  <DropdownMenuItem
                    onClick={() => onPlayNext(track)}
                    className="flex items-center gap-2 cursor-pointer text-zinc-200"
                  >
                    <ListOrdered size={12} className="text-zinc-500 shrink-0" />
                    <span>Play Next</span>
                  </DropdownMenuItem>
                )}
                {playlists.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700" />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        Add to playlist
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
                            : "text-zinc-200"
                            }`}
                        >
                          {alreadyIn ? (
                            <Check size={12} className="text-[#1DB954] shrink-0" />
                          ) : (
                            <ListPlus size={12} className="text-zinc-500 shrink-0" />
                          )}
                          <span className="truncate">{pl.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Actions — desktop only column */}
      <div className="hidden sm:flex items-center gap-1.5 w-20 justify-center" onClick={(e) => e.stopPropagation()}>
        {/* YouTube link */}
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-red-500 transition-colors p-1 inline-flex"
              >
                <ExternalLink size={13} />
              </a>
            }
          />
          <TooltipContent>Watch on YouTube</TooltipContent>
        </Tooltip>

        {/* Remove from playlist (when inside playlist view) */}
        {isInPlaylist && activePlaylistId && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemoveFromPlaylist(activePlaylistId, track.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors hover:bg-zinc-700/50"
                >
                  <Trash2 size={13} />
                </Button>
              }
            />
            <TooltipContent>Remove from playlist</TooltipContent>
          </Tooltip>
        )}

        {/* More Options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="text-zinc-600 hover:text-[#1DB954] transition-colors p-1.5 rounded-md hover:bg-zinc-700/50 inline-flex">
                <MoreHorizontal size={15} />
              </button>
            }
          />
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={8}
              className="bg-zinc-800 border-zinc-700 min-w-44"
            >
              {onPlayNext && (
                <DropdownMenuItem
                  onClick={() => onPlayNext(track)}
                  className="flex items-center gap-2 cursor-pointer text-zinc-200"
                >
                  <ListOrdered size={12} className="text-zinc-500 shrink-0" />
                  <span>Play Next</span>
                </DropdownMenuItem>
              )}
              {playlists.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      Add to playlist
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
                          : "text-zinc-200"
                          }`}
                      >
                        {alreadyIn ? (
                          <Check size={12} className="text-[#1DB954] shrink-0" />
                        ) : (
                          <ListPlus size={12} className="text-zinc-500 shrink-0" />
                        )}
                        <span className="truncate">{pl.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );
}
