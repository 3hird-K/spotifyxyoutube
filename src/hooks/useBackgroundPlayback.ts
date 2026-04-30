import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to keep audio playback alive in background tabs
 * Solves the issue of audio pausing when a tab becomes inactive
 */
export function useBackgroundPlayback(
  isPlaying: boolean,
  currentTrackDuration: number | undefined,
  onTrackEnd: () => void
) {
  const rafIdRef = useRef<number | null>(null);
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
      audioContextRef.current.resume().catch(() => {});
    }

    // Keep oscillator running to prevent browser from stopping playback
    if (audioContextRef.current && !oscillatorRef.current) {
      try {
        const osc = audioContextRef.current.createOscillator();
        osc.frequency.value = 1; // 1 Hz, inaudible
        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.001; // Very low volume
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

  // Use RAF for continuous playback tracking
  useEffect(() => {
    if (!isPlaying || !currentTrackDuration) return;

    let elapsedSinceLastCheck = 0;

    const checkPlayback = () => {
      const now = Date.now();
      const timeSinceLastCheck = (now - lastCheckTimeRef.current) / 1000;

      elapsedSinceLastCheck += timeSinceLastCheck;
      lastCheckTimeRef.current = now;

      // Check if track should have ended
      // Add 0.5s buffer to account for timing differences
      if (elapsedSinceLastCheck >= currentTrackDuration - 0.5) {
        onTrackEnd();
        return; // Stop checking after track ends
      }

      rafIdRef.current = requestAnimationFrame(checkPlayback);
    };

    rafIdRef.current = requestAnimationFrame(checkPlayback);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, currentTrackDuration, onTrackEnd]);

  // Cleanup oscillator on unmount
  useEffect(() => {
    return () => {
      try {
        oscillatorRef.current?.stop();
      } catch {}
      oscillatorRef.current = null;

      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const resetPlaybackTimer = useCallback(() => {
    lastCheckTimeRef.current = Date.now();
    playbackStartTimeRef.current = Date.now();
  }, []);

  return { resetPlaybackTimer, isTabActive: isTabActiveRef.current };
}
