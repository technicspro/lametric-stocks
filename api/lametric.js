export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    // PUT YOUR ICON IDS HERE (these are the colored arrows you create in LaMetric)
    const UP_ICON_ID = 12345;   // <-- green up arrow icon id
    const DOWN_ICON_ID = 67890; // <-- red down arrow icon id
    const FLAT_ICON_ID = 42844; // fallback (your existing icon)

    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: FLAT_ICON_ID, index: 0 }],
      });
    }

    // Polygon snapshot endpoint for multiple tickers
    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    // Basic error handling
    if (!response.ok || data?.status === "ERROR") {
      const msg = (data?.error || data?.message || "Polygon error").toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: FLAT_ICON_ID, index: 0 }],
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // Market status line (helps you see when Polygon is not giving lastTrade yet)
    const noLastCount = items.filter((t) => !t?.lastTrade?.p).length;
    const marketLine =
      noLastCount > 0 ? `Market: NO LAST ${noLastCount}` : "Market: OK";

    const frames = [];

    // Frame 0: market status
    frames.push({ text: marketLine, icon: FLAT_ICON_ID, index: 0 });

    // Frames 1..n: each ticker
    items.forEach((t, i) => {
      const symbol = t?.ticker || "";
      const last = t?.lastTrade?.p;

      // Prefer Polygon’s computed % if present, otherwise compute from day/prevDay close
      let pct =
        typeof t?.todaysChangePerc === "number"
          ? t.todaysChangePerc
          : null;

      if (pct === null) {
        const dayClose = t?.day?.c;
        const prevClose = t?.prevDay?.c;
        if (typeof dayClose === "number" && typeof prevClose === "number" && prevClose !== 0) {
          pct = ((dayClose - prevClose) / prevClose) * 100;
        }
      }

      // If no last trade yet (common around open/halts), show a clear message
      if (typeof last !== "number") {
        frames.push({
          text: `${symbol} NO LAST`,
          icon: FLAT_ICON_ID,
          index: i + 1,
        });
        return;
      }

      // Choose icon based on % direction
      let icon = FLAT_ICON_ID;
      if (typeof pct === "number") {
        if (pct > 0) icon = UP_ICON_ID;
        else if (pct < 0) icon = DOWN_ICON_ID;
      }

      // Format
      const priceStr = last.toFixed(2);
      const pctStr = typeof pct === "number" ? ` ${pct.toFixed(2)}%` : "";

      // Keep text short so it fits LaMetric nicely
      let text = `${symbol} ${priceStr}${pctStr}`;
      if (text.length > 16) text = text.slice(0, 16);

      frames.push({
        text,
        icon,
        index: i + 1,
      });
    });

    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Error loading prices", icon: 42844, index: 0 }],
    });
  }
}
