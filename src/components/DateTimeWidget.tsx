import { useState, useEffect } from "react";

export function DateTimeWidget({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const seconds = now.toLocaleTimeString([], { second: "2-digit" }).slice(-2);

  const dayName = now.toLocaleDateString([], { weekday: "long" });
  const dateStr = now.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });



  if (compact) {
    return (
      <div className="flex items-center gap-2 select-none">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-white tabular-nums tracking-tight">
            {timeStr}
          </span>
          <span className="text-[10px] font-medium text-zinc-500 tabular-nums">
            {seconds}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium hidden min-[400px]:inline">
          •
        </span>
        <span className="text-[10px] text-zinc-400 font-medium hidden min-[400px]:inline truncate">
          {dayName}, {dateStr}
        </span>
      </div>
    );
  }

  return (
    <div className="select-none flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/30 backdrop-blur-sm">
      {/* Time */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-black text-white tabular-nums tracking-tight leading-none">
          {timeStr}
        </span>
        <span className="text-[10px] font-semibold text-zinc-500 tabular-nums leading-none">
          :{seconds}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-zinc-700/50" />

      {/* Date */}
      <span className="text-xs text-zinc-400 font-medium leading-tight">
        {dayName}, {dateStr}
      </span>
    </div>
  );
}
