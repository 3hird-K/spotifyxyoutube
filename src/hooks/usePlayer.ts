import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Track } from "../data/tracks";
import type { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { supabase } from "../lib/supabase";
import { useBackgroundPlayback } from "./useBackgroundPlayback";
import { resolveYouTubeId } from "../utils/youtube";

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
  const lastPokedTrackIdRef = useRef<string | null>(null);
  const lastStuckTimeRef = useRef<number>(Date.now());
  const volumeRef = useRef<number>(volume);
  const intentionalPauseRef = useRef<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const handleNextRef = useRef<(auto?: boolean) => void>(() => { });
  const onExhaustedRef = useRef<(lastTrack: Track | null) => Track | void>(() => { });

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;



  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentTrackRef.current = currentTrack;
    currentTimeRef.current = currentTime;
    volumeRef.current = volume;
  }, [isPlaying, currentTrack, currentTime, volume]);

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
  // Replace the existing background tick callback in usePlayer.ts with this enhanced version:

  const backgroundPlayback = useBackgroundPlayback(
    isPlaying,
    currentTrack?.duration,
    () => handleNextRef.current(true),
    () => {
      const p = playerRef.current;
      if (!p || typeof p.getPlayerState !== "function") return;

      try {
        const state = p.getPlayerState();
        const track = currentTrackRef.current;

        // CRITICAL: Never force play if the user intentionally paused
        if (intentionalPauseRef.current) return;

        if (isPlayingRef.current && track) {
          const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
          const isPipActive = typeof document !== 'undefined' && !!document.pictureInPictureElement;
          const shouldMuteHack = isMobile && !isPipActive;
          
          // If playing in background, keep it going (don't unmute here!)
          if (state === 1) {
            lastStuckTimeRef.current = Date.now();
            // Don't unmute in background - Chrome will kill it
          }
          // CASE 1: Paused or Cued (Common in background)
          if (state === 2 || state === 5) {
            // Play MUTED in background on mobile - Chrome allows muted autoplay
            try {
              if (shouldMuteHack) p.mute();
              p.playVideo();
            } catch {}
          }
          // CASE 2: Stuck Unstarted (THE KILLER)
          else if (state === -1) {
            const isNewTrack = track.youtubeId !== lastPokedTrackIdRef.current;

            if (isNewTrack) {
              if (shouldMuteHack) p.mute();
              p.loadVideoById(track.youtubeId);
              setTimeout(() => p.playVideo(), 100);
              lastPokedTrackIdRef.current = track.youtubeId;
              lastStuckTimeRef.current = Date.now();
            }
            else if (Date.now() - lastStuckTimeRef.current > 10000) {
              if (shouldMuteHack) p.mute();
              wakeUpPlayer();
              lastStuckTimeRef.current = Date.now();
            }
          }
        }
      } catch { }
    }
  );

  const resumeAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }

    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => { });
    }
  }, []);

  const kickPlay = useCallback(() => {
    clearPlayRetryTimeouts();

    // If the tab is hidden, we MUST be aggressive. 
    // YouTube ignores slow retries in background tabs.
    const isHidden = document.hidden;
    const delays = isHidden
      ? [200, 500, 1000, 2000, 4000] // Fast retries for background
      : [250, 750, 1500, 3000, 5000]; // Normal retries for foreground

    const runAttempt = (delay: number) => {
      const t = setTimeout(() => {
        // CRITICAL: Abort if user intentionally paused
        if (intentionalPauseRef.current || !isPlayingRef.current) return;

        try {
          const p = playerRef.current;
          if (!p || typeof p.getIframe !== 'function' || !p.getIframe()) return;

          const state = p.getPlayerState();

          // If we are hidden and stuck in unstarted, USE THE NUKE
          if (isHidden && state === -1) {
            p.mute();
            p.playVideo();
            setTimeout(() => p.unMute(), 150);
          }
          // Normal poke
          else if (state !== undefined && state !== 1 && state !== 3) {
            p.playVideo();
          }
        } catch { }
      }, delay);
      playRetryTimeoutsRef.current.push(t);
    };

    delays.forEach(runAttempt);
  }, [clearPlayRetryTimeouts]);


  // This is the secret weapon for background tabs
  const wakeUpPlayer = useCallback(() => {
    try {
      const p = playerRef.current;
      if (!p || typeof p.getIframe !== 'function' || !p.getIframe()) return;

      // YouTube blocks play() in background if audio is on. 
      // We must Mute -> Play -> Unmute.
      if (p.isMuted()) {
        p.unMute();
      } else {
        p.mute();
      }

      p.playVideo();

      // Schedule unmute 200ms later
      setTimeout(() => {
        try { p.unMute(); } catch { }
      }, 200);

    } catch (e) {
      console.error("Wake up failed", e);
    }
  }, []);

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
      // console.log("✅ YouTube Player READY!");
      playerRef.current = event.target;
      setIsPlayerReady(true);

      event.target.setVolume(volume * 100);

      try {
        event.target.setPlaybackQuality("hd1080");
      } catch { }

      if (isMuted) event.target.mute();
      else event.target.unMute();

      if (isMuted) event.target.mute();
      else event.target.unMute();

      // We don't start playback here anymore. 
      // The useEffect watching isPlayerReady will handle it 
      // to avoid race conditions with loadVideoById.
    },
    [volume, isMuted]
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
            // console.log("Timer: Track ended, advancing...");
            handleNextRef.current(true);
          }
        }
      } catch { }
    }, 1000);
  }, [clearTimer, backgroundPlayback]);

  const onPlayerStateChange = useCallback(
    (event: YouTubeEvent) => {
      // console.log("Player state changed:", event.data);

      if (event.data === 1) {
        // Playing
        setIsPlaying(true);
        trackStartWallTimeRef.current = Date.now() - currentTimeRef.current * 1000;
        startTimer();
      } else if (event.data === 2) {
        // Paused
        
        // If we just started a track (< 1.5s ago), ignore this pause event and force play!
        // This prevents spurious 'paused' events from YouTube during transitions from halting playback.
        if (isPlayingRef.current && !intentionalPauseRef.current && (Date.now() - trackStartWallTimeRef.current < 1500)) {
          try { event.target.playVideo(); } catch {}
          return;
        }

        // Only fight a background pause if user did NOT intentionally pause
        if (document.hidden && isPlayingRef.current && !intentionalPauseRef.current) {
          // Chrome/Android forced a background pause.
          // Play MUTED on mobile - Chrome allows muted background autoplay.
          const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
          const isPipActive = typeof document !== 'undefined' && !!document.pictureInPictureElement;
          try {
            if (isMobile && !isPipActive) event.target.mute();
            event.target.playVideo();
          } catch {}
          return; // Do NOT process as a real pause
        }
        
        setIsPlaying(false);
        isPlayingRef.current = false;
        clearTimer();
        clearPlaybackSafetyTimeout();
        clearPlayRetryTimeouts();
      } else if (event.data === 0) {
        // Ended
        // console.log("Track ended, moving to next...");
        clearTimer();
        clearPlaybackSafetyTimeout();
        handleNextRef.current(true);
      } else if (event.data === 5 || event.data === -1) {
        // Cued or Unstarted
        // console.log("Video cued/unstarted. Attempting immediate foreground/background playVideo...");
        if (isPlayingRef.current) {
          try {
            event.target.playVideo();
          } catch { }
        }
      }
    },
    [clearTimer, clearPlaybackSafetyTimeout, startTimer]
  );

  // Visibility handler: mute when going to background, unmute+resume when returning
  useEffect(() => {
    const handleVisibilityChange = () => {
      const p = playerRef.current;
      const track = currentTrackRef.current;

      if (document.hidden) {
        // GOING TO BACKGROUND
        const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const isPipActive = typeof document !== 'undefined' && !!document.pictureInPictureElement;
        
        // Mute the player on mobile so Chrome allows it to keep playing
        if (p && isPlayingRef.current && !intentionalPauseRef.current) {
          try {
            if (isMobile && !isPipActive) p.mute();
            p.playVideo(); // Re-issue play command
          } catch {}
        }
        return;
      }

      // RETURNING TO FOREGROUND
      if (!p || !track) return;

      resumeAudioContext();

      // Always unmute when returning, even if intentionally paused
      // (the user sees the app, so audio control is back in their hands)
      if (!intentionalPauseRef.current && isPlayingRef.current) {
        try {
          // Unmute and restore volume
          if (!isMuted) {
            p.unMute();
          }
          p.setVolume(volumeRef.current * 100);

          // Check if track finished while backgrounded
          const youtubeTime = p.getCurrentTime();
          const estimatedTime = Math.max(
            youtubeTime,
            (Date.now() - trackStartWallTimeRef.current) / 1000
          );

          if (estimatedTime >= track.duration - 1.0) {
            handleNextRef.current(true);
            return;
          }

          // Force resume
          p.playVideo();
          startTimer();
        } catch (err) {
          try {
            p.playVideo();
            startTimer();
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [resumeAudioContext, startTimer]);

  // Lazy resolve youtubeId if missing
  useEffect(() => {
    let isMounted = true;
    
    if (currentTrack && !currentTrack.youtubeId) {
      const resolveId = async () => {
        const query = `${currentTrack.title} ${currentTrack.artist} official audio`;
        const videoId = await resolveYouTubeId(query);
        if (isMounted && videoId) {
          setQueue((prevQueue) => {
            const newQueue = [...prevQueue];
            newQueue[currentIndex] = { ...currentTrack, youtubeId: videoId, youtubeUrl: `https://www.youtube.com/watch?v=${videoId}` };
            return newQueue;
          });
        }
      };
      resolveId();
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentTrack, currentIndex]);

  // Load / cue the current track whenever it changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !isPlayerReady || !currentTrack?.youtubeId) {
      // console.log("Video load skipped:", {
      //   playerExists: !!p,
      //   isReady: isPlayerReady,
      //   hasYoutubeId: !!currentTrack?.youtubeId,
      // });
      return;
    }

    const isNewTrack = currentTrack.youtubeId !== previousTrackIdRef.current;

    // We only update the ref here so we can track changes
    const oldTrackId = previousTrackIdRef.current;
    previousTrackIdRef.current = currentTrack.youtubeId;

    clearPlaybackGuards();

    try {
      // If the player just became ready, it already has the currentTrack.youtubeId 
      // from the component props, so we don't need to loadVideoById unless it's DIFFERENT 
      // from what was there before.

      const shouldLoadManual = isNewTrack && oldTrackId !== null;

      // console.log(`Playback sync: ${currentTrack.title}`, {
      //   isNewTrack,
      //   shouldLoadManual,
      //   isPlaying,
      //   oldTrackId
      // });

      if (isPlaying) {
        trackStartWallTimeRef.current = Date.now() - (currentTimeRef.current * 1000);

        // console.log(`[Playback Sync] Loading ${currentTrack.title} (new=${isNewTrack})`);

        if (shouldLoadManual || document.hidden) {
          try {
            const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
            const isPipActive = typeof document !== 'undefined' && !!document.pictureInPictureElement;
            
            // Only mute to bypass autoplay blocks if we are hidden on mobile AND not using PiP.
            if (document.hidden && isMobile && !isPipActive) {
              p.mute();
            } else if (!isMuted) {
              p.unMute();
              p.setVolume(volumeRef.current * 100);
            }
            
            p.loadVideoById(currentTrack.youtubeId);
            p.playVideo();
            lastPokedTrackIdRef.current = currentTrack.youtubeId;
            lastStuckTimeRef.current = Date.now();
          } catch { }
        } else {
          try { p.playVideo(); } catch { }
        }

        startTimer();
        kickPlay();
      } else {
        if (shouldLoadManual) {
          // console.log("Direct & Scheduled cueVideoById()");
          try {
            if (p && typeof p.getIframe === 'function' && p.getIframe()) {
              p.cueVideoById(currentTrack.youtubeId);
            }
          } catch { }

          setTimeout(() => {
            try {
              if (p && typeof p.getIframe === 'function' && p.getIframe()) {
                p.cueVideoById(currentTrack.youtubeId);
              }
            } catch { }
          }, 80);
        } else {
          // console.log("Direct & Scheduled pauseVideo()");
          try {
            if (p && typeof p.getIframe === 'function' && p.getIframe()) {
              p.pauseVideo();
            }
          } catch { }

          setTimeout(() => {
            try {
              if (p && typeof p.getIframe === 'function' && p.getIframe()) {
                p.pauseVideo();
              }
            } catch { }
          }, 80);
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
        // console.log("Safety timeout: advancing to next track...");
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
      // console.log("⚠️ Player not ready for toggle");
      return;
    }

    resumeAudioContext();
    backgroundPlayback.initSilentAudio(); // MUST BE SYNCHRONOUS!

    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next; // Immediately sync intention

      if (next) {
        // PLAYING
        intentionalPauseRef.current = false;
      } else {
        // PAUSING - set flag BEFORE calling pauseVideo
        intentionalPauseRef.current = true;
      }

      try {
        if (next) {
          playerRef.current?.unMute();
          playerRef.current?.setVolume(volume * 100);
          playerRef.current?.playVideo();
          trackStartWallTimeRef.current = Date.now() - currentTimeRef.current * 1000;
          backgroundPlayback.resetPlaybackTimer();
          startTimer();
          kickPlay();
        } else {
          // Cancel ALL pending play attempts first
          clearPlayRetryTimeouts();
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

      if (audioContextRef.current && audioContextRef.current.state !== "closed" && !oscillatorRef.current) {
        const osc = audioContextRef.current.createOscillator();
        osc.frequency.value = 100; // 100 Hz

        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.002; // Tiny gain to be silent but keep-alive

        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        try {
          osc.start();
          oscillatorRef.current = osc;
          // console.log("🔊 Silent oscillator STARTED (Background keep-alive)");
        } catch { }
      }
    } else {
      try {
        if (oscillatorRef.current) {
          oscillatorRef.current.stop();
          // console.log("🔇 Silent oscillator STOPPED");
        }
      } catch { }
      oscillatorRef.current = null;
    }
  }, [isPlaying, resumeAudioContext]);

  const selectTrack = useCallback((index: number) => {
    intentionalPauseRef.current = false;
    backgroundPlayback.initSilentAudio();
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setCurrentIndex(index);
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastPokedTrackIdRef.current = null;
    clearPlaybackGuards();

    const track = queue[index];
    if (track?.youtubeId) {
      previousTrackIdRef.current = track.youtubeId;
      try {
        const p = playerRef.current;
        if (p) {
          p.loadVideoById(track.youtubeId);
          p.playVideo();
          lastPokedTrackIdRef.current = track.youtubeId;
          lastStuckTimeRef.current = Date.now();
        }
      } catch {}
    }
  }, [backgroundPlayback, queue, clearPlaybackGuards]);

  const playArbitraryTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    intentionalPauseRef.current = false;
    backgroundPlayback.initSilentAudio();
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastPokedTrackIdRef.current = null;
    clearPlaybackGuards();

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

    if (track.youtubeId) {
      previousTrackIdRef.current = track.youtubeId;
      try {
        const p = playerRef.current;
        if (p) {
          p.loadVideoById(track.youtubeId);
          p.playVideo();
          lastPokedTrackIdRef.current = track.youtubeId;
          lastStuckTimeRef.current = Date.now();
        }
      } catch {}
    }
  }, [backgroundPlayback, clearPlaybackGuards]);

  const loadTrack = useCallback((track: Track, contextQueue?: Track[]) => {
    setCurrentTime(0);
    setProgress(0);
    currentTimeRef.current = 0;
    trackStartWallTimeRef.current = Date.now();
    backgroundPlayback.resetPlaybackTimer();
    setIsPlaying(false);
    lastPokedTrackIdRef.current = null;
    clearPlaybackGuards();

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

    if (track.youtubeId) {
      previousTrackIdRef.current = track.youtubeId;
      try {
        const p = playerRef.current;
        if (p && typeof p.cueVideoById === 'function') {
          p.cueVideoById(track.youtubeId);
        }
      } catch {}
    }
  }, [backgroundPlayback, clearPlaybackGuards]);

  const playNext = useCallback((track: Track) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setCurrentIndex(0);
        return [track];
      }
      
      const newQueue = [...prevQueue];
      const existingIdx = newQueue.findIndex(t => t.id === track.id);
      
      if (existingIdx === currentIndex + 1) return prevQueue;
      
      let adjIndex = currentIndex;
      if (existingIdx !== -1 && existingIdx !== currentIndex) {
        newQueue.splice(existingIdx, 1);
        if (existingIdx < currentIndex) {
          adjIndex--;
        }
      }
      
      newQueue.splice(adjIndex + 1, 0, track);
      
      if (adjIndex !== currentIndex) {
        setCurrentIndex(adjIndex);
      }
      
      return newQueue;
    });
  }, [currentIndex]);


  const handleNext = useCallback((auto = false) => {
    resumeAudioContext();
    if (!auto) {
      backgroundPlayback.initSilentAudio(); // Synchronous init if user clicked
    }
    intentionalPauseRef.current = false;
    clearPlaybackGuards();

    // CRITICAL: Reset poke tracker so background worker treats it as new track
    lastPokedTrackIdRef.current = null;

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

    let nextTrack: Track | null = null;

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      nextTrack = queue[nextIdx];
      setCurrentIndex(nextIdx);
    } else {
      const nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === "all") {
          nextTrack = queue[0];
          setCurrentIndex(0);
        } else {
          // If queue exhausted, check if we get a suggested track to append
          const trackToAppend = onExhaustedRef.current(queue[currentIndex] || null);
          if (trackToAppend) {
            nextTrack = trackToAppend;
            setQueue((prev) => [...prev, trackToAppend]);
            setCurrentIndex(queue.length);
          } else {
            return;
          }
        }
      } else {
        nextTrack = queue[nextIdx];
        setCurrentIndex(nextIdx);
      }
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    if (nextTrack?.youtubeId) {
      previousTrackIdRef.current = nextTrack.youtubeId;
      try {
        const p = playerRef.current;
        if (p) {
          p.loadVideoById(nextTrack.youtubeId);
          p.playVideo();
          lastPokedTrackIdRef.current = nextTrack.youtubeId;
          lastStuckTimeRef.current = Date.now();
        }
      } catch {}
    }
  }, [currentIndex, queue, isShuffle, repeatMode, resumeAudioContext, clearPlaybackGuards, backgroundPlayback, wakeUpPlayer, kickPlay]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrev = useCallback(() => {
    resumeAudioContext();
    backgroundPlayback.initSilentAudio(); // Synchronous init
    intentionalPauseRef.current = false;

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
    
    const nextIdx = currentIndex > 0 ? currentIndex - 1 : 0;
    const nextTrack = queue[nextIdx];
    setCurrentIndex(nextIdx);
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastPokedTrackIdRef.current = null;
    clearPlaybackGuards();

    if (nextTrack?.youtubeId) {
      previousTrackIdRef.current = nextTrack.youtubeId;
      try {
        const p = playerRef.current;
        if (p) {
          p.loadVideoById(nextTrack.youtubeId);
          p.playVideo();
          lastPokedTrackIdRef.current = nextTrack.youtubeId;
          lastStuckTimeRef.current = Date.now();
        }
      } catch {}
    }
  }, [currentIndex, queue, resumeAudioContext, backgroundPlayback, clearPlaybackGuards]);

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
      intentionalPauseRef.current = false;
      setIsPlaying(true);
      isPlayingRef.current = true;
      playerRef.current?.playVideo();
      resumeAudioContext();
      kickPlay();
    });

    nav.setActionHandler("pause", () => {
      intentionalPauseRef.current = true;
      isPlayingRef.current = false;
      clearPlayRetryTimeouts();
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
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
    setQueueOnly,
    loadTrack,
    playNext,
    replaceQueue: useCallback((newQueue: Track[], newIndex: number) => {
      setQueue(newQueue);
      setCurrentIndex(newIndex);
    }, []),
  };
}