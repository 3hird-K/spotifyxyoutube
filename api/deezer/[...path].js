// Vercel Serverless Function — proxies requests to the Deezer API
// Uses CommonJS to avoid ESM issues with Vercel's serverless runtime
const https = require("https");
const url = require("url");

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // Parse the actual request URL to get the full path after /api/deezer/
  const parsed = url.parse(req.url, true);
  const fullPath = parsed.pathname || "";
  
  // Remove the /api/deezer prefix to get the Deezer API path
  const deezerPath = fullPath.replace(/^\/api\/deezer\/?/, "");

  // Build query string from the original URL's query parameters
  const queryString = parsed.search || "";
  
  const deezerUrl = `https://api.deezer.com/${deezerPath}${queryString}`;

  console.log("[Deezer Proxy] Forwarding to:", deezerUrl);

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
          } catch (e) {
            resolve({ status: response.statusCode, body: { error: "Invalid JSON from Deezer", raw: body.slice(0, 500) } });
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
      url: deezerUrl,
    });
  }
};
