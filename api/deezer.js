// Vercel Serverless Function — proxies /api/deezer/* to https://api.deezer.com/*
// All /api/deezer/* paths are rewritten to this function via vercel.json
// The deezer path is passed as ?deezerPath=... and original query params are merged
import https from "node:https";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // Get the Deezer path from the rewrite's query parameter
  const deezerPath = req.query.deezerPath || "";

  // Build query string from remaining params (exclude deezerPath itself)
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "deezerPath") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => queryParams.append(key, v));
    } else {
      queryParams.set(key, String(value));
    }
  }

  const qs = queryParams.toString();
  const deezerUrl = `https://api.deezer.com/${deezerPath}${qs ? "?" + qs : ""}`;

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
            resolve({
              status: response.statusCode,
              body: { error: "Invalid JSON from Deezer", raw: body.slice(0, 500) },
            });
          }
        });
      });

      request.on("error", reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Deezer API request timed out"));
      });
    });

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
      targetUrl: deezerUrl,
    });
  }
}
