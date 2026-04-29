import { useState, useEffect } from "react";
import { Track } from "../data/tracks";
import { searchYouTubeMusic } from "../utils/youtube";

export function useRecommendedTracks(track: Track | null, enabled: boolean) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled || !track) return;

        let cancelled = false;
        setLoading(true);

        const fetchRecommendations = async () => {
            try {
                let res: Track[] = [];

                if (track.youtubeId) {
                    res = await searchYouTubeMusic("", {
                        mode: "recommend",
                        videoId: track.youtubeId
                    });
                }

                if (!res.length) {
                    res = await searchYouTubeMusic(
                        `${track.artist} top songs`
                    );
                }

                if (cancelled) return;

                const seen = new Set<string>();

                const filtered = res.filter(t => {
                    if (t.id === track.id) return false;

                    // Filter out tracks with the same or very similar title to avoid lyrics/live versions
                    if (t.title.toLowerCase().includes(track.title.toLowerCase()) || 
                        track.title.toLowerCase().includes(t.title.toLowerCase())) {
                        return false;
                    }

                    const key = t.youtubeId || t.id;
                    if (seen.has(key)) return false;

                    seen.add(key);
                    return true;
                });

                setTracks(filtered.slice(0, 20));
            } catch (err) {
                console.error(err);
                setTracks([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchRecommendations();

        return () => {
            cancelled = true;
        };
    }, [track?.youtubeId, enabled]);

    return { tracks, loading };
}