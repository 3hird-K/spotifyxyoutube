import { useSearchMusic } from "../hooks/useSearchMusic";

export function useTrendingTracks(selectedGenre: string, shouldFetch: boolean) {
    const query = selectedGenre !== "All" ? `${selectedGenre} music trending` : "Most trending music";
    return useSearchMusic(query, shouldFetch);
}