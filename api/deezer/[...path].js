// Vercel Serverless Function — proxies requests to the Deezer API
// This avoids CORS issues and edge-blocking that happen with simple rewrites

export default async function handler(req, res) {
  // Extract the Deezer path from the catch-all route
  const { path } = req.query;
  const deezerPath = Array.isArray(path) ? path.join("/") : path || "";

  // Build the full Deezer API URL with query params
  const url = new URL(`https://api.deezer.com/${deezerPath}`);

  // Forward all query params except "path" (used by Vercel catch-all)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: req.method || "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "SpotifyXYouTube/1.0",
      },
    });

    const data = await response.json();

    // Set CORS headers so the browser accepts the response
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    // Cache for 5 minutes to reduce Deezer API load
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    res.status(response.status).json(data);
  } catch (error) {
    console.error("Deezer proxy error:", error);
    res.status(502).json({ error: "Failed to fetch from Deezer API" });
  }
}
