import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Track } from "../data/tracks";
import type { YouTubeEvent, YouTubePlayer } from "react-youtube";

export type RepeatMode = "none" | "one" | "all";

export function usePlayer(initialTracks: Track[]) {
  const [queue, setQueue] = useState<Track[]>(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const setQueueOnly = useCallback((tracks: Track[]) => {
    setQueue(tracks);
  }, []);

  const [progress, setProgress] = useState(0); // 0-100
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");

  // Load liked tracks from localStorage
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      const stored = localStorage.getItem("spotube_liked_tracks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Derived Set for O(1) lookups
  const liked = useMemo(() => new Set(likedTracks.map(t => t.id)), [likedTracks]);

  // Persist liked tracks
  useEffect(() => {
    localStorage.setItem("spotube_liked_tracks", JSON.stringify(likedTracks));
  }, [likedTracks]);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleNextRef = useRef<(auto?: boolean) => void>(() => { });
  const onExhaustedRef = useRef<(lastTrack: Track | null) => void>(() => { });

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  // Reset ready state when track changes
  useEffect(() => {
    setIsPlayerReady(false);
  }, [currentTrack?.id]);


  const onPlayerReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    event.target.setVolume(volume * 100);
    
    // Attempt to force the highest quality stream (HD1080 usually forces the best 160kbps Opus audio track)
    try {
      event.target.setPlaybackQuality('hd1080');
    } catch (e) {}

    if (isMuted) {
      event.target.mute();
    } else {
      event.target.unMute();
    }

    // Safety check: Only play if isPlaying is true and we have a valid track index
    if (isPlaying && currentIndex >= 0) {
      event.target.playVideo();
    } else {
      event.target.pauseVideo();
    }
  }, [isPlaying, volume, isMuted, currentIndex]);

  const onPlayerStateChange = useCallback((event: YouTubeEvent) => {
    if (event.data === 1) { // Playing
      try {
        event.target.setPlaybackQuality('hd1080');
      } catch (e) {}
      setIsPlaying(true);
    } else if (event.data === 2) {
      setIsPlaying(false);
    } else if (event.data === 0) {
      handleNextRef.current(true);
    }
  }, []);

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
        } catch (e) { }
      }
    }, 500);
  }, [currentTrack]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !isPlayerReady || typeof p.playVideo !== 'function') return;

    try {
      if (isPlaying && currentIndex >= 0) {
        startTimer();
        p.playVideo();
      } else {
        clearTimer();
        p.pauseVideo();
      }
    } catch (err) {
      console.warn("YouTube Player API interaction failed:", err);
    }

    return clearTimer;
  }, [isPlaying, currentIndex, currentTrack?.youtubeId, startTimer, isPlayerReady]); // Added isPlayerReady to deps

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  useEffect(() => {
    if (playerRef.current) {
      if (isMuted) playerRef.current.mute();
      else playerRef.current.unMute();
    }
  }, [isMuted]);


  // const togglePlay = useCallback(() => {
  //   setIsPlaying((p) => !p);
  // }, []);
  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;

    setIsPlaying((prev) => {
      const next = !prev;

      if (next) {
        playerRef.current?.playVideo();
      } else {
        playerRef.current?.pauseVideo();
      }

      return next;
    });
  }, []);

  const selectTrack = useCallback((index: number) => {
    setCurrentTime(0);
    setProgress(0);
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const playArbitraryTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(true);
    setQueue((prev) => {
      const q = contextQueue ?? prev;
      const idx = q.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
        return q;
      }
      const newQueue = [...q, track];
      setCurrentIndex(newQueue.length - 1);
      return newQueue;
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
      if (queue.length === 0) return;

      if (isShuffle) {
        const nextIdx = Math.floor(Math.random() * queue.length);
        setCurrentIndex(nextIdx);
      } else {
        const nextIdx = currentIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === "all") {
            setCurrentIndex(0);
            setIsPlaying(true);
          } else if (currentIndex >= 0) {
            // Only trigger exhausted if we're actually at the end
            const lastTrack = queue[currentIndex] || null;
            onExhaustedRef.current(lastTrack);
          }
        } else {
          setCurrentIndex(nextIdx);
          setIsPlaying(true);
        }
      }
    },
    [currentIndex, queue.length, isShuffle, repeatMode]
  );

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

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
    () => setRepeatMode((r) => (r === "none" ? "all" : r === "all" ? "one" : "none")),
    []
  );

  const toggleLike = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.find(t => t.id === track.id);
      if (exists) return prev.filter(t => t.id !== track.id);
      return [...prev, track];
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.find((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  // Stable refs to the latest functions so action handlers never need to be reset
  const nextRef = useRef(handleNext);
  const prevRef = useRef(handlePrev);
  const seekRef = useRef(seek);
  const isPlayingRef = useRef(isPlaying);
  const currentTrackRef = useRef(currentTrack);

  useEffect(() => {
    nextRef.current = handleNext;
    prevRef.current = handlePrev;
    seekRef.current = seek;
    isPlayingRef.current = isPlaying;
    currentTrackRef.current = currentTrack;
  }, [handleNext, handlePrev, seek, isPlaying, currentTrack]);

  // Media Session - Action Handlers (Set ONCE and use refs)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const nav = navigator.mediaSession;

    const playAction = () => {
      setIsPlaying(true);
      playerRef.current?.playVideo();
    };
    const pauseAction = () => {
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
    };

    nav.setActionHandler('play', playAction);
    nav.setActionHandler('pause', pauseAction);
    nav.setActionHandler('nexttrack', () => nextRef.current());
    nav.setActionHandler('previoustrack', () => prevRef.current());
    
    // Some Android devices need these to show full controls
    nav.setActionHandler('seekbackward', () => {
      const time = Math.max(0, (playerRef.current?.getCurrentTime() || 0) - 10);
      seekRef.current((time / (currentTrackRef.current?.duration || 1)) * 100);
    });
    nav.setActionHandler('seekforward', () => {
      const time = Math.min(currentTrackRef.current?.duration || 0, (playerRef.current?.getCurrentTime() || 0) + 10);
      seekRef.current((time / (currentTrackRef.current?.duration || 1)) * 100);
    });

    nav.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && currentTrackRef.current) {
        seekRef.current((details.seekTime / currentTrackRef.current.duration) * 100);
      }
    });

    // Cleanup ONLY on unmount
    return () => {
      nav.setActionHandler('play', null);
      nav.setActionHandler('pause', null);
      nav.setActionHandler('nexttrack', null);
      nav.setActionHandler('previoustrack', null);
      nav.setActionHandler('seekbackward', null);
      nav.setActionHandler('seekforward', null);
      nav.setActionHandler('seekto', null);
    };
  }, []); // Empty dependency array: Set handlers only once!

  // Media Session - Metadata & State Update (Separate from handlers)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    // Update Metadata
    // @ts-ignore
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "Spotify x YouTube",
      artwork: [
        { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ]
    });

    // Update State
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Update position
    try {
      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: currentTrack.duration || 0,
          playbackRate: 1,
          position: currentTime || 0,
        });
      }
    } catch (e) {}
  }, [currentTrack, isPlaying, currentTime]);




  return {
    queue,
    setQueue,
    onExhaustedRef,
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
    likedTracks, // Exporting full objects
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
    setQueueOnly,
  };
}
