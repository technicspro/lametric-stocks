export default async function handler(req, res) {
  try {
    // --- Tickers you want ---
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    // --- Your Polygon API key (set in Vercel env vars) ---
    const apiKey = process.env.POLYGON_API_KEY;

    // --- LaMetric icon IDs (YOU set these) ---
    // Upload a GREEN UP arrow icon + RED DOWN arrow icon in LaMetric Icon Gallery
    // Then paste the icon IDs below.
    const ICON_UP = Number(process.env.LAMETRIC_ICON_UP || 0);     // green up arrow icon id
    const ICON_DOWN = Number(process.env.LAMETRIC_ICON_DOWN || 0); // red down arrow icon id
    const ICON_FLAT = Number(process.env.LAMETRIC_ICON_FLAT || 0); // optional (grey/white dash), can be 0
    const ICON_DEFAULT = 42844; // fallback icon if you don't set any

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: ICON_DEFAULT }],
      });
    }

    // --- Polygon Snapshot endpoint (multiple tickers) ---
    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    // Polygon sometimes returns {status:"ERROR", error:"..."}
    if (!response.ok || data?.status === "ERROR") {
      const msg = (data?.error || data?.message || `Polygon error (${response.status})`).toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: ICON_DEFAULT }],
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // --- Determine market status message ---
    // Free Polygon plans can be delayed; you noticed ~15 mins. We'll surface that.
    // We also detect "no last trade yet" situations.
    let statusText = "Market: OK";
    let anyMissingLast = false;

    // You can tweak this: premarket/open can still be missing lastTrade early in session.
    for (const t of items) {
      if (!t?.lastTrade?.p) {
        anyMissingLast = true;
        break;
      }
    }

    // Try to infer "open vs closed" roughly:
    // If none have lastTrade but they have day.c/prevDay.c, often market is closed or just not printing yet.
    if (items.length && anyMissingLast) {
      statusText = "Market: NO LAST";
    }

    // --- Build LaMetric frames ---
    // First frame = status
    const frames = [
      {
        text: statusText,
        icon: ICON_DEFAULT,
        index: 0,
      },
    ];

    // Next frames = each ticker
    items
      .filter((t) => tickers.includes(t?.ticker))
      .sort((a, b) => tickers.indexOf(a.ticker) - tickers.indexOf(b.ticker))
      .forEach((t, i) => {
        const symbol = t.ticker;

        // Best-effort "current" price:
        // 1) lastTrade.p (most direct)
        // 2) lastQuote.p (if available)
        // 3) day.c (close so far / last close when closed)
        // 4) prevDay.c (previous close)
        const price =
          t?.lastTrade?.p ??
          t?.lastQuote?.p ??
          t?.day?.c ??
          t?.prevDay?.c ??
          null;

        // Previous close for up/down comparison
        const prevClose = t?.prevDay?.c ?? null;

        // Decide direction
        let direction = "flat";
        if (price != null && prevClose != null) {
          if (price > prevClose) direction = "up";
          else if (price < prevClose) direction = "down";
        }

        // Choose icon based on direction (if you set them)
        let iconToUse = ICON_DEFAULT;
        if (direction === "up" && ICON_UP) iconToUse = ICON_UP;
        else if (direction === "down" && ICON_DOWN) iconToUse = ICON_DOWN;
        else if (direction === "flat" && ICON_FLAT) iconToUse = ICON_FLAT;

        // If we STILL don't have a price, show N/A
        const text =
          price == null
            ? `${symbol} N/A`
            : `${symbol} ${Number(price).toFixed(2)}`;

        frames.push({
          text,
          icon: iconToUse,
          index: i + 1,
        });
      });

    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error", icon: 42844 }],
    });
  }
}
