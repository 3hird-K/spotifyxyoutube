import { useEffect, useRef, useCallback, useMemo } from "react";

/**
 * Hook to keep audio playback alive in background tabs
 * Solves the issue of audio pausing when a tab becomes inactive
 */
export function useBackgroundPlayback(
  isPlaying: boolean,
  currentTrackDuration: number | undefined,
  onTrackEnd: () => void,
  onBackgroundTick?: () => void
) {

  const lastCheckTimeRef = useRef<number>(Date.now());
  const playbackStartTimeRef = useRef<number>(Date.now());
  const isTabActiveRef = useRef<boolean>(!document.hidden);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize audio context for background playback
  useEffect(() => {
    if (!isPlaying) return;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }

    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().catch(() => { });
    }

    // Keep oscillator running to prevent browser from stopping playback
    if (audioContextRef.current && !oscillatorRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        osc.frequency.value = 100; // 100 Hz (inaudible with extremely low gain, but wakes up soundcard)
        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.002; // Tiny non-zero gain to prevent sleep
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        oscillatorRef.current = osc;
      } catch (err) {
        console.warn("Failed to create background oscillator:", err);
      }
    }

    return () => {
      // Don't stop oscillator here - keep it running
    };
  }, [isPlaying]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      if (!document.hidden) {
        lastCheckTimeRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Use a Web Worker blob + setInterval fallback for highly accurate background ticking
  // Use a Web Worker blob + setInterval fallback for highly accurate background ticking
  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Use a Web Worker blob + setInterval fallback
  useEffect(() => {
    if (!isPlaying || !currentTrackDuration) return;

    let worker: Worker | null = null;
    let mainInterval: ReturnType<typeof setInterval> | null = null;
    let aggressiveInterval: ReturnType<typeof setInterval> | null = null; // NEW

    try {
      const blob = new Blob([
        `let interval;
         onmessage = function(e) {
           if (e.data === 'start') {
             interval = setInterval(() => postMessage('tick'), 1000);
           } else if (e.data === 'stop') {
             clearInterval(interval);
           }
         };`
      ], { type: "application/javascript" });
      worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = () => {
        const now = Date.now();
        const totalElapsed = (now - playbackStartTimeRef.current) / 1000;
        lastCheckTimeRef.current = now;

        if (totalElapsed >= currentTrackDuration - 0.25) {
          onTrackEnd();
          playbackStartTimeRef.current = Date.now(); // Reset for next track
        } else if (onBackgroundTick) {
          onBackgroundTick();
        }
      };

      worker.postMessage("start");
    } catch (err) {
      console.warn("Worker fallback:", err);
    }

    // Main interval (1 second)
    mainInterval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = (now - playbackStartTimeRef.current) / 1000;
      lastCheckTimeRef.current = now;

      if (totalElapsed >= currentTrackDuration - 0.25) {
        onTrackEnd();
        playbackStartTimeRef.current = Date.now();
      } else if (onBackgroundTick) {
        onBackgroundTick();
      }
    }, 1000);

    // 🔥 AGGRESSIVE INTERVAL (500ms) - Only for background tabs 🔥
    aggressiveInterval = setInterval(() => {
      if (document.hidden && onBackgroundTick) {
        // console.log("Aggressive background tick");
        onBackgroundTick();
      }
    }, 500);

    return () => {
      if (worker) {
        worker.postMessage("stop");
        worker.terminate();
      }
      if (mainInterval) clearInterval(mainInterval);
      if (aggressiveInterval) clearInterval(aggressiveInterval);
    };
  }, [isPlaying, currentTrackDuration, onTrackEnd, onBackgroundTick]);

  // Cleanup oscillator on unmount
  useEffect(() => {
    return () => {
      try {
        oscillatorRef.current?.stop();
      } catch { }
      oscillatorRef.current = null;

      audioContextRef.current?.close().catch(() => { });
    };
  }, []);

  const resetPlaybackTimer = useCallback(() => {
    lastCheckTimeRef.current = Date.now();
    playbackStartTimeRef.current = Date.now();
  }, []);

  return useMemo(() => ({
    resetPlaybackTimer,
    isTabActive: isTabActiveRef.current
  }), [resetPlaybackTimer]);
}
