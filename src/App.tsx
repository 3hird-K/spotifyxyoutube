import { useState } from "react";
import YouTube from "react-youtube";
import { TRACKS } from "./data/tracks";
import { usePlayer } from "./hooks/usePlayer";
import Sidebar from "./components/Sidebar";
import PlayerBar from "./components/PlayerBar";
import MainContent from "./components/MainContent";
import NowPlaying from "./components/NowPlaying";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [showNowPlaying, setShowNowPlaying] = useState(true);

  const player = usePlayer(TRACKS);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Main layout (sidebar + content + now-playing panel) */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          queue={player.queue}
          currentIndex={player.currentIndex}
          onSelect={player.selectTrack}
          liked={player.liked}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {/* Main content */}
        <MainContent
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          liked={player.liked}
          queue={player.queue}
          onSelect={player.selectTrack}
          onToggleLike={player.toggleLike}
          onTogglePlay={player.togglePlay}
          activeView={activeView}
        />

        {/* Now playing panel */}
        {showNowPlaying && (
          <aside className="w-72 bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-5 pb-2">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                Now Playing
              </span>
              <button
                onClick={() => setShowNowPlaying(false)}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <PanelRightClose size={16} />
              </button>
            </div>
            <NowPlaying
              track={player.currentTrack}
              liked={player.liked}
              onToggleLike={player.toggleLike}
            />
          </aside>
        )}

        {/* Toggle now-playing button (when panel is closed) */}
        {!showNowPlaying && (
          <button
            onClick={() => setShowNowPlaying(true)}
            className="fixed right-4 bottom-24 z-20 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shadow-lg"
            title="Show Now Playing"
          >
            <PanelRightOpen size={16} />
          </button>
        )}
      </div>

      {player.currentTrack && (
        <YouTube
          videoId={player.currentTrack.youtubeId}
          opts={{
            height: "0",
            width: "0",
            playerVars: {
              autoplay: 1,
              controls: 0,
              modestbranding: 1,
            },
          }}
          onReady={player.onPlayerReady}
          onStateChange={player.onPlayerStateChange}
          className="hidden"
        />
      )}

      {/* Player bar */}
      <PlayerBar
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        progress={player.progress}
        currentTime={player.currentTime}
        volume={player.volume}
        isMuted={player.isMuted}
        isShuffle={player.isShuffle}
        repeatMode={player.repeatMode}
        liked={player.liked}
        onTogglePlay={player.togglePlay}
        onNext={() => player.handleNext()}
        onPrev={player.handlePrev}
        onSeek={player.seek}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
        onToggleShuffle={player.toggleShuffle}
        onToggleRepeat={player.toggleRepeat}
        onToggleLike={player.toggleLike}
      />
    </div>
  );
}
