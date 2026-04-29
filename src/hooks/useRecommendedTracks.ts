import { useState, useEffect } from "react";
import { Track } from "../data/tracks";
import { searchYouTubeMusic } from "../utils/youtube";

export function useRecommendedTracks(track: Track | null, enabled: boolean) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled || !track) return;
        setLoading(true);
        searchYouTubeMusic(`${track.artist} ${track.title} related music`)
            .then(res => setTracks(res.filter(t => t.id !== track.id)))
            .finally(() => setLoading(false));
    }, [track, enabled]);

    return { tracks, loading };
}