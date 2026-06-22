// Vercel Serverless Function — proxies requests to the Deezer API
// Uses .mjs extension for explicit ESM support in Vercel's runtime
import https from "https";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // Extract the Deezer path from the catch-all route
  const { path: pathSegments, ...queryParams } = req.query;
  const deezerPath = Array.isArray(pathSegments)
    ? pathSegments.join("/")
    : pathSegments || "";

  // Build query string from remaining params
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else {
      qs.set(key, String(value));
    }
  }

  const deezerUrl = `https://api.deezer.com/${deezerPath}${qs.toString() ? "?" + qs.toString() : ""}`;

  try {
    const data = await new Promise((resolve, reject) => {
      const request = https.get(deezerUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; SpotifyXYouTube/1.0)",
        },
      }, (response) => {
        let body = "";
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: response.statusCode, body: { error: "Invalid JSON from Deezer", raw: body.slice(0, 200) } });
          }
        });
      });

      request.on("error", reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Deezer API request timed out"));
      });
    });

    // Set CORS + cache headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(data.status).json(data.body);
  } catch (error) {
    console.error("Deezer proxy error:", error?.message || error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(502).json({
      error: "Failed to fetch from Deezer API",
      detail: error?.message || "Unknown error",
    });
  }
}
