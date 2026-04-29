import { Play } from "lucide-react";
import { Track } from "../data/tracks";

export function HomeCard({
  track,
  onSelect,
  title,
  subtitle,
  rounded = false
}: {
  track: Track;
  onSelect: (t: Track) => void;
  title: string;
  subtitle: string;
  rounded?: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(track)}
      className="group bg-zinc-900 hover:bg-zinc-800 p-3 rounded-2xl transition-all duration-300 cursor-pointer hover:shadow-2xl hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative mb-4">
        <div
          className={`relative aspect-square overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 ${rounded ? "rounded-full" : "rounded-xl"
            }`}
        >
          {/* Subtle inner ring like Spotify/BTS card */}
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[inherit] z-10 pointer-events-none" />

          <img
            src={track.thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/default-cover.jpg";
            }}
          />

          {/* Play Button - Spotify style */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(track);
            }}
            className="absolute bottom-3 right-3 w-12 h-12 bg-[#1ed760] rounded-full flex items-center justify-center shadow-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 z-20"
          >
            <Play size={26} className="text-black ml-0.5 fill-black" />
          </button>
        </div>
      </div>

      {/* Text */}
      <div className="px-1 space-y-1">
        <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-2 tracking-tight">
          {title}
        </h3>
        <p className="text-zinc-400 text-sm font-medium line-clamp-2 leading-tight">
          {subtitle}
        </p>
      </div>
    </div>
  );
}