export function getPlaylistColor(id: string): string {
    const colors = [
        "from-red-500 to-orange-500",
        "from-orange-400 to-amber-600",
        "from-amber-400 to-yellow-600",
        "from-lime-400 to-green-600",
        "from-green-400 to-emerald-600",
        "from-teal-400 to-cyan-600",
        "from-cyan-500 to-blue-500",
        "from-blue-500 to-indigo-600",
        "from-indigo-400 to-purple-600",
        "from-purple-500 to-fuchsia-600",
        "from-fuchsia-500 to-pink-600",
        "from-pink-500 to-rose-600"
    ];

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    hash = Math.abs(hash);
    
    return `bg-gradient-to-br ${colors[hash % colors.length]}`;
}
