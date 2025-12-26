export default async function handler(req, res) {
  try {
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    const apiKey = process.env.POLYGON_API_KEY;

    // Optional: set these in Vercel Environment Variables after you upload icons to LaMetric
    // If not set, it will just use fallbackIcon for everything.
    const iconUp = parseInt(process.env.LAMETRIC_ICON_UP || "", 10);
    const iconDown = parseInt(process.env.LAMETRIC_ICON_DOWN || "", 10);
    const iconFlat = parseInt(process.env.LAMETRIC_ICON_FLAT || "", 10);

    // Your current/fallback icon (works even if you don't set arrow icons)
    const fallbackIcon = 42844;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: fallbackIcon, index: 0 }],
      });
    }

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, { headers: { "User-Agent": "lametric-stocks" } });
    const data = await response.json();

    // If Polygon errors, show it on the device (helps debugging)
    if (!response.ok || data.status === "ERROR") {
      const msg = data.error || data.message || `Polygon error (${response.status})`;
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: fallbackIcon, index: 0 }],
      });
    }

    const items = Array.isArray(data.tickers) ? data.tickers : [];

    // If nothing came back, show a clear message
    if (!items.length) {
      return res.status(200).json({
        frames: [{ text: "No ticker data", icon: fallbackIcon, index: 0 }],
      });
    }

    // Build frames
    const frames = [];

    // Optional “status” frame if lastTrade is missing on many tickers (common right after open / off hours)
    const missingLast = items.filter((t) => !t.lastTrade || typeof t.lastTrade.p !== "number").length;
    if (missingLast > 0) {
      frames.push({
        text: `Market: NO LAST ${missingLast}`,
        icon: fallbackIcon,
        index: 0,
      });
    }

    // Then one frame per ticker
    items.forEach((t, i) => {
      const sym = t.ticker || "???";

      const last = t.lastTrade && typeof t.lastTrade.p === "number" ? t.lastTrade.p : null;
      const dayClose = t.day && typeof t.day.c === "number" ? t.day.c : null;
      const prevClose = t.prevDay && typeof t.prevDay.c === "number" ? t.prevDay.c : null;

      // Pick best available “current price”
      const price = last ?? dayClose ?? prevClose;

      // Compute change vs prev close (only if we have prev close + price)
      let change = null;
      let pct = null;
      if (price != null && prevClose != null && prevClose !== 0) {
        change = price - prevClose;
        pct = (change / prevClose) * 100;
      }

      // Decide direction
      let direction = "FLAT";
      if (change != null) {
        if (change > 0) direction = "UP";
        else if (change < 0) direction = "DOWN";
      }

      // Choose icon (prefer your arrow icons if you set them)
      let icon = fallbackIcon;
      if (direction === "UP" && Number.isFinite(iconUp)) icon = iconUp;
      if (direction === "DOWN" && Number.isFinite(iconDown)) icon = iconDown;
      if (direction === "FLAT" && Number.isFinite(iconFlat)) icon = iconFlat;

      // Compose text
      // Keep it short so it fits nicely on LaMetric
      let text;
      if (price == null) {
        text = `${sym} --`;
      } else if (pct == null) {
        text = `${sym} ${price.toFixed(2)}`;
      } else {
        const sign = change > 0 ? "+" : "";
        text = `${sym} ${price.toFixed(2)} ${sign}${pct.toFixed(2)}%`;
      }

      frames.push({
        text,
        icon,
        index: frames.length, // important: keep index sequential
      });
    });

    // Return LaMetric format
    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Error loading prices", icon: 42844, index: 0 }],
    });
  }
}
