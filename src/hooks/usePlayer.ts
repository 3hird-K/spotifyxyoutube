import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Track } from "../data/tracks";
import type { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { supabase } from "../lib/supabase";
import { useBackgroundPlayback } from "./useBackgroundPlayback";

export type RepeatMode = "none" | "one" | "all";

export function usePlayer(initialTracks: Track[], user: any = null) {
  const [queue, setQueue] = useState<Track[]>(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");

  const previousTrackIdRef = useRef<string | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playRetryTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trackStartWallTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const currentTrackRef = useRef<Track | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const handleNextRef = useRef<(auto?: boolean) => void>(() => { });
  const onExhaustedRef = useRef<(lastTrack: Track | null) => void>(() => { });

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentTrackRef.current = currentTrack;
    currentTimeRef.current = currentTime;
  }, [isPlaying, currentTrack, currentTime]);

  // Init AudioContext (best effort only)
  useEffect(() => {
    if (
      !audioContextRef.current &&
      typeof window !== "undefined" &&
      (window.AudioContext || (window as any).webkitAudioContext)
    ) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }

    return () => {
      try {
        oscillatorRef.current?.stop();
      } catch { }
      oscillatorRef.current = null;

      audioContextRef.current?.close().catch(() => { });
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearPlaybackSafetyTimeout = useCallback(() => {
    if (playbackSafetyTimeoutRef.current) {
      clearTimeout(playbackSafetyTimeoutRef.current);
      playbackSafetyTimeoutRef.current = null;
    }
  }, []);

  const clearPlayRetryTimeouts = useCallback(() => {
    playRetryTimeoutsRef.current.forEach((t) => clearTimeout(t));
    playRetryTimeoutsRef.current = [];
  }, []);

  const clearPlaybackGuards = useCallback(() => {
    clearTimer();
    clearPlaybackSafetyTimeout();
    clearPlayRetryTimeouts();
  }, [clearTimer, clearPlaybackSafetyTimeout, clearPlayRetryTimeouts]);

  // Use background playback hook to handle inactive tabs
  const backgroundPlayback = useBackgroundPlayback(
    isPlaying,
    currentTrack?.duration,
    () => {
      handleNextRef.current(true);
    }
  );

  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => { });
    }
  }, []);

  const kickPlay = useCallback(() => {
    clearPlayRetryTimeouts();

    [250, 750, 1500].forEach((delay) => {
      const t = setTimeout(() => {
        if (playerRef.current && isPlayingRef.current) {
          try {
            playerRef.current.playVideo();
          } catch { }
        }
      }, delay);

      playRetryTimeoutsRef.current.push(t);
    });
  }, [clearPlayRetryTimeouts]);

  const setQueueOnly = useCallback((tracks: Track[]) => {
    setQueue(tracks);
  }, []);

  // Load liked tracks from localStorage
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const stored = localStorage.getItem("spotube_liked_tracks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync liked tracks from Supabase if logged in
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    const fetchLikedSongs = async () => {
      const { data, error } = await supabase
        .from("liked_songs")
        .select("track_data")
        .eq("user_id", user.id)
        .order("liked_at", { ascending: false });

      if (error) {
        console.error("Error fetching liked songs:", error);
        return;
      }

      const tracks = data.map((d: any) => d.track_data as Track);
      setLikedTracks(tracks);
    };

    fetchLikedSongs();
  }, [user]);

  const liked = useMemo(() => new Set(likedTracks.map((t) => t.id)), [likedTracks]);

  useEffect(() => {
    if (!user || user.is_anonymous) {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("spotube_liked_tracks", JSON.stringify(likedTracks));
        }
      } catch { }
    }
  }, [likedTracks, user]);

  useEffect(() => {
    // Keep the player "ready" once the iframe is ready.
    // IMPORTANT: do NOT set this back to false on track change.
  }, []);

  const onPlayerReady = useCallback(
    (event: YouTubeEvent) => {
      console.log("✅ YouTube Player READY!");
      playerRef.current = event.target;
      setIsPlayerReady(true);

      event.target.setVolume(volume * 100);

      try {
        event.target.setPlaybackQuality("hd1080");
      } catch { }

      if (isMuted) event.target.mute();
      else event.target.unMute();

      if (isPlayingRef.current && currentIndex >= 0) {
        try {
          console.log("Player ready and should be playing, starting playback...");
          event.target.playVideo();
          kickPlay();
        } catch (err) {
          console.error("Failed to start playback on ready:", err);
        }
      } else {
        try {
          event.target.pauseVideo();
        } catch { }
      }
    },
    [volume, isMuted, currentIndex, kickPlay]
  );

  const startTimer = useCallback(() => {
    clearTimer();
    backgroundPlayback.resetPlaybackTimer();

    intervalRef.current = setInterval(() => {
      const p = playerRef.current;
      const track = currentTrackRef.current;
      if (!p || !track?.duration) return;

      try {
        const elapsed = p.getCurrentTime(); // sync API
        if (elapsed >= 0) {
          currentTimeRef.current = elapsed;
          setCurrentTime(elapsed);
          setProgress((elapsed / track.duration) * 100);

          // extra local safety if the ended event is missed
          // Check both actual time and estimated time based on wall clock
          const estimatedElapsed = Math.max(
            elapsed,
            (Date.now() - trackStartWallTimeRef.current) / 1000
          );
          
          if (estimatedElapsed >= track.duration - 0.25) {
            console.log("Timer: Track ended, advancing...");
            handleNextRef.current(true);
          }
        }
      } catch { }
    }, 1000);
  }, [clearTimer, backgroundPlayback]);

  const onPlayerStateChange = useCallback(
    (event: YouTubeEvent) => {
      console.log("Player state changed:", event.data, {
        0: "Ended",
        1: "Playing",
        2: "Paused",
        3: "Buffering",
        5: "Cued"
      }[event.data]);

      if (event.data === 1) {
        // Playing
        setIsPlaying(true);
        trackStartWallTimeRef.current = Date.now() - currentTimeRef.current * 1000;
        startTimer();
      } else if (event.data === 2) {
        // Paused
        setIsPlaying(false);
        clearTimer();
        clearPlaybackSafetyTimeout();
      } else if (event.data === 0) {
        // Ended
        console.log("Track ended, moving to next...");
        clearTimer();
        clearPlaybackSafetyTimeout();
        handleNextRef.current(true);
      } else if (event.data === 3) {
        // Buffering
        console.log("Video buffering...");
      } else if (event.data === 5) {
        // Cued
        console.log("Video cued, ready to play");
      }
    },
    [clearTimer, clearPlaybackSafetyTimeout, startTimer]
  );

  // Visibility fallback: when user returns to tab, try to continue or advance if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only process when tab becomes visible
      if (document.hidden) return;

      const p = playerRef.current;
      const track = currentTrackRef.current;

      if (!p || !track || !isPlayingRef.current) return;

      resumeAudioContext();

      try {
        // Get both YouTube player time and estimated time based on wall clock
        const youtubeTime = p.getCurrentTime();
        const estimatedTime = Math.max(
          youtubeTime,
          (Date.now() - trackStartWallTimeRef.current) / 1000
        );

        // If we're past the end of the track, move to next
        if (estimatedTime >= track.duration - 1.0) {
          console.log(`Tab returned, track elapsed: ${estimatedTime}s/${track.duration}s - advancing`);
          handleNextRef.current(true);
          return;
        }

        // Resume playback
        console.log(`Tab returned, resuming playback at ${estimatedTime}s`);
        p.playVideo();
        kickPlay();
        startTimer();
      } catch (err) {
        console.warn("Error resuming on visibility change:", err);
        try {
          p.playVideo();
          kickPlay();
          startTimer();
        } catch { }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [kickPlay, resumeAudioContext, startTimer]);

  // Load / cue the current track whenever it changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !isPlayerReady || !currentTrack?.youtubeId) {
      console.log("Video load skipped:", {
        playerExists: !!p,
        isReady: isPlayerReady,
        hasYoutubeId: !!currentTrack?.youtubeId,
      });
      return;
    }

    const isNewTrack = currentTrack.youtubeId !== previousTrackIdRef.current;
    previousTrackIdRef.current = currentTrack.youtubeId;

    clearPlaybackGuards();

    try {
      console.log(`Loading video: ${currentTrack.title} (ID: ${currentTrack.youtubeId}) - ${isNewTrack ? "NEW" : "SAME"}`);
      
      if (isPlaying) {
        trackStartWallTimeRef.current = Date.now();
        if (isNewTrack) {
          console.log("Calling loadVideoById()");
          p.loadVideoById(currentTrack.youtubeId);
        } else {
          console.log("Calling playVideo()");
          p.playVideo();
        }

        startTimer();
        kickPlay();
      } else {
        if (isNewTrack) {
          console.log("Calling cueVideoById()");
          p.cueVideoById(currentTrack.youtubeId);
        } else {
          console.log("Calling pauseVideo()");
          p.pauseVideo();
        }
      }
    } catch (err) {
      console.error("YouTube Player API interaction failed:", err);
    }

    return () => {
      clearTimer();
      clearPlaybackSafetyTimeout();
      clearPlayRetryTimeouts();
    };
  }, [
    currentTrack?.youtubeId,
    isPlaying,
    isPlayerReady,
    startTimer,
    kickPlay,
    clearPlaybackGuards,
    clearTimer,
    clearPlaybackSafetyTimeout,
    clearPlayRetryTimeouts,
  ]);

  // Safety timeout based on expected track duration
  useEffect(() => {
    clearPlaybackSafetyTimeout();

    if (!isPlaying || !currentTrack?.duration) return;

    const elapsed = currentTimeRef.current;
    const remainingMs = Math.max((currentTrack.duration - elapsed - 0.75) * 1000, 1000);

    playbackSafetyTimeoutRef.current = setTimeout(() => {
      const p = playerRef.current;
      const track = currentTrackRef.current;
      if (!p || !track?.duration) return;

      const actualElapsed = p.getCurrentTime();
      const estimatedElapsed = Math.max(
        actualElapsed,
        (Date.now() - trackStartWallTimeRef.current) / 1000
      );

      if (estimatedElapsed >= track.duration - 0.75) {
        console.log("Safety timeout: advancing to next track...");
        handleNextRef.current(true);
      }
    }, remainingMs);

    return clearPlaybackSafetyTimeout;
  }, [isPlaying, currentTrack?.id, currentTrack?.duration, currentTime, clearPlaybackSafetyTimeout]);

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

  const togglePlay = useCallback(() => {
    if (!playerRef.current) {
      console.log("⚠️ Player not ready for toggle");
      return;
    }

    resumeAudioContext();

    setIsPlaying((prev) => {
      const next = !prev;
      console.log(`Toggle play: ${prev ? "PLAYING → PAUSED" : "PAUSED → PLAYING"}`);

      try {
        if (next) {
          playerRef.current?.playVideo();
          trackStartWallTimeRef.current = Date.now() - currentTimeRef.current * 1000;
          backgroundPlayback.resetPlaybackTimer();
          startTimer();
          kickPlay();
        } else {
          playerRef.current?.pauseVideo();
          clearTimer();
          clearPlaybackSafetyTimeout();
        }
      } catch (err) {
        console.error("Toggle play error:", err);
      }

      return next;
    });
  }, [resumeAudioContext, startTimer, kickPlay, clearTimer, clearPlaybackSafetyTimeout, backgroundPlayback]);

  // Background keep-alive (best effort only)
  useEffect(() => {
    if (isPlaying) {
      resumeAudioContext();

      if (audioContextRef.current && !oscillatorRef.current) {
        const osc = audioContextRef.current.createOscillator();
        osc.frequency.value = 1;

        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.001;

        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        try {
          osc.start();
          oscillatorRef.current = osc;
        } catch { }
      }
    } else {
      try {
        oscillatorRef.current?.stop();
      } catch { }
      oscillatorRef.current = null;
    }
  }, [isPlaying, resumeAudioContext]);

  const selectTrack = useCallback((index: number) => {
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setCurrentIndex(index);
    setIsPlaying(true);
  }, [backgroundPlayback]);

  const playArbitraryTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setIsPlaying(true);

    setQueue((prev) => {
      const q = contextQueue ?? prev;
      const idx = q.findIndex((t) => t.id === track.id);

      if (idx !== -1) {
        setCurrentIndex(idx);
        return q;
      }

      const newQueue = [...q, track];
      setCurrentIndex(newQueue.length - 1);
      return newQueue;
    });
  }, [backgroundPlayback]);

  const loadTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setIsPlaying(false);

    setQueue((prev) => {
      const q = contextQueue ?? prev;
      const idx = q.findIndex((t) => t.id === track.id);

      if (idx !== -1) {
        setCurrentIndex(idx);
        return q;
      }

      const newQueue = [...q, track];
      setCurrentIndex(newQueue.length - 1);
      return newQueue;
    });
  }, [backgroundPlayback]);

  const handleNext = useCallback(
    (auto = false) => {
      resumeAudioContext();
      clearPlaybackGuards();

      if (repeatMode === "one" && auto) {
        setCurrentTime(0);
        setProgress(0);
        currentTimeRef.current = 0;
        trackStartWallTimeRef.current = Date.now();
        backgroundPlayback.resetPlaybackTimer();

        try {
          playerRef.current?.seekTo(0, true);
          playerRef.current?.playVideo();
          kickPlay();
        } catch { }

        return;
      }

      if (queue.length === 0) return;

      setCurrentTime(0);
      setProgress(0);
      currentTimeRef.current = 0;
      trackStartWallTimeRef.current = Date.now();
      backgroundPlayback.resetPlaybackTimer();

      if (isShuffle) {
        const nextIdx = Math.floor(Math.random() * queue.length);
        setCurrentIndex(nextIdx);
        setIsPlaying(true);
      } else {
        const nextIdx = currentIndex + 1;

        if (nextIdx >= queue.length) {
          if (repeatMode === "all") {
            setCurrentIndex(0);
            setIsPlaying(true);
          } else if (currentIndex >= 0) {
            const lastTrack = queue[currentIndex] || null;
            onExhaustedRef.current(lastTrack);
          }
        } else {
          setCurrentIndex(nextIdx);
          setIsPlaying(true);
        }
      }

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    },
    [
      currentIndex,
      queue,
      isShuffle,
      repeatMode,
      resumeAudioContext,
      clearPlaybackGuards,
      kickPlay,
      backgroundPlayback,
    ]
  );

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
    resumeAudioContext();

    if (currentTimeRef.current > 3) {
      try {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } catch { }

      setCurrentTime(0);
      setProgress(0);
      currentTimeRef.current = 0;
      trackStartWallTimeRef.current = Date.now();
      backgroundPlayback.resetPlaybackTimer();
      return;
    }

    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
    setIsPlaying(true);
  }, [resumeAudioContext, backgroundPlayback]);

  const seek = useCallback(
    (pct: number) => {
      if (!currentTrack) return;

      const newTime = (pct / 100) * currentTrack.duration;
      setCurrentTime(newTime);
      setProgress(pct);
      currentTimeRef.current = newTime;
      trackStartWallTimeRef.current = Date.now() - newTime * 1000;
      backgroundPlayback.resetPlaybackTimer();

      if (playerRef.current) {
        try {
          playerRef.current.seekTo(newTime, true);
        } catch { }
      }
    },
    [currentTrack, backgroundPlayback]
  );

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setIsShuffle((s) => !s), []);
  const toggleRepeat = useCallback(
    () => setRepeatMode((r) => (r === "none" ? "all" : r === "all" ? "one" : "none")),
    []
  );

  const toggleLike = useCallback(
    async (track: Track) => {
      const isLiked = liked.has(track.id);

      setLikedTracks((prev) => {
        if (isLiked) return prev.filter((t) => t.id !== track.id);
        return [track, ...prev];
      });

      if (user && !user.is_anonymous) {
        if (isLiked) {
          await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", user.id)
            .eq("track_id", track.id);
        } else {
          await supabase
            .from("liked_songs")
            .insert({ user_id: user.id, track_id: track.id, track_data: track as any });
        }
      }
    },
    [liked, user]
  );

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.find((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const nextRef = useRef(handleNext);
  const prevRef = useRef(handlePrev);
  const seekRef = useRef(seek);

  useEffect(() => {
    nextRef.current = handleNext;
    prevRef.current = handlePrev;
    seekRef.current = seek;
    isPlayingRef.current = isPlaying;
    currentTrackRef.current = currentTrack;
    currentTimeRef.current = currentTime;
  }, [handleNext, handlePrev, seek, isPlaying, currentTrack, currentTime]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const nav = navigator.mediaSession;

    nav.setActionHandler("play", () => {
      setIsPlaying(true);
      playerRef.current?.playVideo();
      resumeAudioContext();
      kickPlay();
    });

    nav.setActionHandler("pause", () => {
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
    });

    nav.setActionHandler("nexttrack", () => nextRef.current());
    nav.setActionHandler("previoustrack", () => prevRef.current());

    nav.setActionHandler("seekbackward", () => {
      const time = Math.max(0, (playerRef.current?.getCurrentTime() || 0) - 10);
      seekRef.current((time / (currentTrackRef.current?.duration || 1)) * 100);
    });

    nav.setActionHandler("seekforward", () => {
      const time = Math.min(
        currentTrackRef.current?.duration || 0,
        (playerRef.current?.getCurrentTime() || 0) + 10
      );
      seekRef.current((time / (currentTrackRef.current?.duration || 1)) * 100);
    });

    nav.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined && currentTrackRef.current) {
        seekRef.current((details.seekTime / currentTrackRef.current.duration) * 100);
      }
    });

    return () => {
      nav.setActionHandler("play", null);
      nav.setActionHandler("pause", null);
      nav.setActionHandler("nexttrack", null);
      nav.setActionHandler("previoustrack", null);
      nav.setActionHandler("seekbackward", null);
      nav.setActionHandler("seekforward", null);
      nav.setActionHandler("seekto", null);
    };
  }, [resumeAudioContext, kickPlay]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    try {
      const MediaMetadataCtor = (window as any).MediaMetadata;
      navigator.mediaSession.metadata = new MediaMetadataCtor({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "Spotify x YouTube",
        artwork: [
          { src: currentTrack.thumbnail, sizes: "96x96", type: "image/jpeg" },
          { src: currentTrack.thumbnail, sizes: "128x128", type: "image/jpeg" },
          { src: currentTrack.thumbnail, sizes: "192x192", type: "image/jpeg" },
          { src: currentTrack.thumbnail, sizes: "256x256", type: "image/jpeg" },
          { src: currentTrack.thumbnail, sizes: "384x384", type: "image/jpeg" },
          { src: currentTrack.thumbnail, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      if ("setPositionState" in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: currentTrack.duration || 0,
          playbackRate: 1,
          position: currentTime || 0,
        });
      }
    } catch { }
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
    likedTracks,
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
    loadTrack,
  };
}