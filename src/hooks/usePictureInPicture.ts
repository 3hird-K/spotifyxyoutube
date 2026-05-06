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
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Initialize canvas + video element once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.pictureInPictureEnabled) return;

    setIsPiPSupported(true);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    canvasRef.current = canvas;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    // Off-screen but in DOM (required for PiP)
    video.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;';
    document.body.appendChild(video);

    const stream = canvas.captureStream(1);
    video.srcObject = stream;
    videoRef.current = video;

    video.addEventListener('enterpictureinpicture', () => setIsPiPActive(true));
    video.addEventListener('leavepictureinpicture', () => setIsPiPActive(false));

    return () => {
      try {
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture();
        }
      } catch {}
      video.remove();
    };
  }, []);

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
      // Fallback: just show text
      ctx.fillStyle = '#1DB954';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(currentTrack.title.slice(0, 18), 24, 260);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '22px sans-serif';
      ctx.fillText(currentTrack.artist.slice(0, 25), 24, 300);
    };
    img.src = currentTrack.thumbnail;
  }, [currentTrack?.id, currentTrack?.thumbnail]);

  // Animate the canvas slightly so the stream stays "alive" (required for PiP)
  useEffect(() => {
    if (!isPiPActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      // Tiny invisible pixel change to keep the stream active
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
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      await video.play();
      await video.requestPictureInPicture();
    } catch (e) {
      console.warn('PiP request failed:', e);
    }
  }, []);

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
