import { useCallback, useEffect, useRef, useState } from 'react';
import { Track } from '../data/tracks';

/**
 * Hook to manage Picture-in-Picture for background audio playback on Android.
 * Creates a canvas-based video element showing album art that can enter PiP,
 * keeping the browser process alive so the YouTube iframe audio continues.
 */
export function usePictureInPicture(
  isPlaying: boolean,
  currentTrack: Track | null
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  // Always show the button on mobile (we'll try PiP on tap)
  const isPiPSupported = typeof document !== 'undefined';

  // Lazy-initialize canvas + video (called on first PiP attempt or on mount)
  const ensureInitialized = useCallback(() => {
    if (initializedRef.current) return true;
    if (typeof document === 'undefined') return false;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      canvasRef.current = canvas;

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      (video as any).disablePictureInPicture = false;
      video.setAttribute('autopictureinpicture', 'true'); // Hint to browser for automatic PiP
      
      // Do not use autoplay = true here, as it causes the browser tab to spin endlessly
      // waiting for stream data. We call play() manually in enterPiP.
      video.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;';
      document.body.appendChild(video);

      // Draw an initial frame so the stream isn't completely empty
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);
      }

      const stream = canvas.captureStream(1);
      video.srcObject = stream;
      videoRef.current = video;

      video.addEventListener('enterpictureinpicture', () => setIsPiPActive(true));
      video.addEventListener('leavepictureinpicture', () => setIsPiPActive(false));

      initializedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  // Try to initialize on mount
  useEffect(() => {
    ensureInitialized();
    return () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture();
        }
      } catch {}
      video.remove();
      initializedRef.current = false;
    };
  }, [ensureInitialized]);

  // Draw album art onto canvas whenever track changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill dark background first
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 512, 512);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512);

      // Gradient overlay at bottom
      const grad = ctx.createLinearGradient(0, 360, 0, 512);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 360, 512, 152);

      // Track title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(currentTrack.title.slice(0, 22), 16, 460);

      // Artist
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '20px sans-serif';
      ctx.fillText(currentTrack.artist.slice(0, 30), 16, 496);
    };
    img.onerror = () => {
      ctx.fillStyle = '#1DB954';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(currentTrack.title.slice(0, 18), 24, 260);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '22px sans-serif';
      ctx.fillText(currentTrack.artist.slice(0, 25), 24, 300);
    };
    img.src = currentTrack.thumbnail;

    // Keep the video actively playing in the background so autoPictureInPicture can trigger
    const video = videoRef.current;
    if (video && video.paused) {
      video.play().catch(() => {});
    }
  }, [currentTrack?.id, currentTrack?.thumbnail]);

  // Animate the canvas slightly so the stream stays "alive" (required for PiP)
  useEffect(() => {
    if (!isPiPActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.01})`;
      ctx.fillRect(0, 0, 1, 1);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPiPActive]);

  const enterPiP = useCallback(async () => {
    // Lazy init on user gesture (important for mobile!)
    ensureInitialized();

    const video = videoRef.current;
    if (!video) {
      alert('Picture-in-Picture is not supported on this browser.');
      return;
    }

    try {
      await video.play();
      if (typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
      } else {
        alert('Picture-in-Picture is not supported on this browser. Try using Chrome.');
      }
    } catch (e: any) {
      console.warn('PiP request failed:', e);
      alert(`PiP failed: ${e?.message || 'Not supported on this device.'}`);
    }
  }, [ensureInitialized]);

  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await exitPiP();
    } else {
      await enterPiP();
    }
  }, [isPiPActive, enterPiP, exitPiP]);

  return {
    isPiPActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
    togglePiP,
  };
}
