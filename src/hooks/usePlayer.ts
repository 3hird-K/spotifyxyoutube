import { useState, useRef, useEffect, useCallback } from "react";
import { Track } from "../data/tracks";
import type { YouTubeEvent, YouTubePlayer } from "react-youtube";

export type RepeatMode = "none" | "one" | "all";

export function usePlayer(initialTracks: Track[]) {
  const [queue, setQueue] = useState<Track[]>(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const currentTrack = queue[currentIndex] ?? null;

  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target;
    event.target.setVolume(volume * 100);
    if (isMuted) {
      event.target.mute();
    } else {
      event.target.unMute();
    }
    if (isPlaying) {
      event.target.playVideo();
    } else {
      event.target.pauseVideo();
    }
  }, [isPlaying, volume, isMuted]);

  const onPlayerStateChange = useCallback((event: YouTubeEvent) => {
    // 0 = ended, 1 = playing, 2 = paused
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      handleNext(true);
    }
  }, []); // eslint-disable-line

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(async () => {
      if (playerRef.current && currentTrack) {
        try {
          const elapsed = await playerRef.current.getCurrentTime();
          const dur = currentTrack.duration;
          if (elapsed > 0) {
            setCurrentTime(elapsed);
            setProgress((elapsed / dur) * 100);
          }
        } catch (e) {}
      }
    }, 500);
  }, [currentTrack]); // eslint-disable-line

  useEffect(() => {
    if (isPlaying) {
      startTimer();
      playerRef.current?.playVideo();
    } else {
      clearTimer();
      playerRef.current?.pauseVideo();
    }
    return clearTimer;
  }, [isPlaying, currentIndex]); // eslint-disable-line

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  useEffect(() => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  }, [isMuted]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const selectTrack = useCallback((index: number) => {
    setCurrentTime(0);
    setProgress(0);
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const playArbitraryTrack = useCallback((track: Track) => {
    setQueue((prev) => {
      const idx = prev.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        setCurrentTime(0);
        setProgress(0);
        setCurrentIndex(idx);
        setIsPlaying(true);
        return prev;
      }
      setCurrentTime(0);
      setProgress(0);
      setCurrentIndex(prev.length);
      setIsPlaying(true);
      return [...prev, track];
    });
  }, []);

  const handleNext = useCallback(
    (auto = false) => {
      if (repeatMode === "one" && auto) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        setCurrentTime(0);
        setProgress(0);
        return;
      }
      setCurrentTime(0);
      setProgress(0);
      if (isShuffle) {
        const nextIdx = Math.floor(Math.random() * queue.length);
        setCurrentIndex(nextIdx);
      } else {
        const nextIdx = currentIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === "all") {
            setCurrentIndex(0);
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        } else {
          setCurrentIndex(nextIdx);
          setIsPlaying(true);
        }
      }
    },
    [currentIndex, queue.length, isShuffle, repeatMode]
  );

  const handlePrev = useCallback(() => {
    if (currentTime > 3) {
      if (playerRef.current) {
        playerRef.current.seekTo(0);
        playerRef.current.playVideo();
      }
      setCurrentTime(0);
      setProgress(0);
      return;
    }
    setCurrentTime(0);
    setProgress(0);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
    setIsPlaying(true);
  }, [currentTime]);

  const seek = useCallback(
    (pct: number) => {
      if (!currentTrack) return;
      const newTime = (pct / 100) * currentTrack.duration;
      setCurrentTime(newTime);
      setProgress(pct);
      if (playerRef.current) {
        playerRef.current.seekTo(newTime);
      }
    },
    [currentTrack]
  );

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setIsShuffle((s) => !s), []);
  const toggleRepeat = useCallback(
    () =>
      setRepeatMode((r) =>
        r === "none" ? "all" : r === "all" ? "one" : "none"
      ),
    []
  );

  const toggleLike = useCallback((id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.find((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  return {
    queue,
    currentTrack,
    currentIndex,
    isPlaying,
    progress,
    currentTime,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    liked,
    onPlayerReady,
    onPlayerStateChange,
    setVolume,
    togglePlay,
    selectTrack,
    playArbitraryTrack,
    handleNext,
    handlePrev,
    seek,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    addToQueue,
  };
}
