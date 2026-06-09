import { useState, useEffect } from "react";
import { Track } from "../data/tracks";
import { searchDeezerMusic } from "../utils/deezer";

export const isCompilation = (title: string) => {
  const t = title.toLowerCase();
  return (
    t.includes("mix") ||
    t.includes("playlist") ||
    t.includes("compilation") ||
    t.includes("full album") ||
    t.includes("top songs of") ||
    t.includes("most streamed") ||
    t.includes("non-stop") ||
    t.includes("nonstop") ||
    t.includes("best of") ||
    t.includes("top 10") ||
    t.includes("top 5") ||
    t.includes("megamix") ||
    t.includes("medley") ||
    t.includes("mashup")
  );
};

export function useSuggestedSongs(followedArtists: any[]) {
  const [suggestedSongs, setSuggestedSongs] = useState<Track[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchSuggestedSongs = async () => {
      try {
        const artistsToFetch: string[] = [];
        if (followedArtists && followedArtists.length > 0) {
          followedArtists.forEach(fa => {
            if (fa.name && !artistsToFetch.includes(fa.name)) {
              artistsToFetch.push(fa.name);
            }
          });
        }

        const fallbackArtists = [
          "Sabrina Carpenter", "Bruno Mars", "Billie Eilish", "The Weeknd",
          "SZA", "Dua Lipa", "Post Malone", "Taylor Swift", "Drake",
          "Rihanna", "Justin Bieber", "Ariana Grande", "Lady Gaga", "Coldplay",
          "Ed Sheeran", "Beyoncé"
        ];

        for (const name of fallbackArtists) {
          if (artistsToFetch.length >= 40) break;
          if (!artistsToFetch.includes(name)) {
            artistsToFetch.push(name);
          }
        }

        const uniqueFiltered: Track[] = [];
        const seenTitles = new Set<string>();
        const seenIds = new Set<string>();

        for (const artistName of artistsToFetch) {
          if (uniqueFiltered.length >= 40) break;

          const results = await searchDeezerMusic(`${artistName}`);
          const filtered = (results || []).filter(t => !isCompilation(t.title));

          for (const t of filtered) {
            const lowerTitle = t.title.toLowerCase().trim().replace(/official video|music video|official audio|\(|\)|\[|\]/g, "").trim();
            if (!seenTitles.has(lowerTitle) && !seenIds.has(t.id)) {
              seenTitles.add(lowerTitle);
              seenIds.add(t.id);
              uniqueFiltered.push(t);
              break; // take exactly 1 unique song per artist
            }
          }
        }

        if (uniqueFiltered.length < 40) {
          const fallbackResults = await searchDeezerMusic("top charts");
          const filteredFallback = (fallbackResults || []).filter(t => !isCompilation(t.title));
          for (const t of filteredFallback) {
            if (uniqueFiltered.length >= 40) break;
            const lowerTitle = t.title.toLowerCase().trim().replace(/official video|music video|official audio|\(|\)|\[|\]/g, "").trim();
            if (!seenTitles.has(lowerTitle) && !seenIds.has(t.id)) {
              seenTitles.add(lowerTitle);
              seenIds.add(t.id);
              uniqueFiltered.push(t);
            }
          }
        }

        if (isMounted && uniqueFiltered.length > 0) {
          setSuggestedSongs(uniqueFiltered.slice(0, 20));
        }
      } catch (err) {
        console.error("Error fetching suggested songs:", err);
      }
    };
    fetchSuggestedSongs();
    return () => { isMounted = false; };
  }, [followedArtists.length]);

  return { suggestedSongs };
}
