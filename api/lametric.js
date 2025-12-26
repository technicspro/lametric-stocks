export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    // Optional: set these in Vercel env vars if you upload icons to LaMetric
    // (green up arrow icon id, red down arrow icon id)
    const UP_ICON = parseInt(process.env.LAMETRIC_UP_ICON || "", 10);
    const DOWN_ICON = parseInt(process.env.LAMETRIC_DOWN_ICON || "", 10);

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Default tickers (you can override with ?tickers=AAPL,NVDA,...)
    const defaultTickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];
    const tickersParam = (req.query.tickers || "").toString().trim();
    const tickers = tickersParam
      ? tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : defaultTickers;

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const data = await r.json();

    // If Polygon errors, show the message on the clock
    if (!r.ok || data.status === "ERROR") {
      const msg = (data.error || data.message || `Polygon error ${r.status}`).toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: 42844, index: 0 }],
      });
    }

    const items = Array.isArray(data.tickers) ? data.tickers : [];

    // Build frames per ticker
    const frames = items.map((t, idx) => {
      const symbol = t.ticker || "???";

      // Price fallback chain (prevents constant 0.00)
      const lastTrade = t.lastTrade?.p;
      const lastQuote = t.lastQuote?.p;
      const dayClose = t.day?.c;
      const prevClose = t.prevDay?.c;

      const price =
        (Number.isFinite(lastTrade) && lastTrade) ||
        (Number.isFinite(lastQuote) && lastQuote) ||
        (Number.isFinite(dayClose) && dayClose) ||
        (Number.isFinite(prevClose) && prevClose) ||
        null;

      // Change % (use Polygon field if present, otherwise compute from prev close)
      let chgPct = null;
      if (Number.isFinite(t.todaysChangePerc)) {
        chgPct = t.todaysChangePerc;
      } else if (price != null && Number.isFinite(prevClose) && prevClose) {
        chgPct = ((price - prevClose) / prevClose) * 100;
      }

      // Decide arrow/icon
      const isUp = chgPct != null ? chgPct >= 0 : null;
      const arrow = isUp == null ? "" : isUp ? "▲" : "▼";

      const icon =
        isUp == null
          ? 42844
          : isUp
          ? (Number.isFinite(UP_ICON) ? UP_ICON : 42844)
          : (Number.isFinite(DOWN_ICON) ? DOWN_ICON : 42844);

      // Build text
      const priceText = price == null ? "NO LAST" : price.toFixed(2);
      const pctText =
        chgPct == null ? "" : ` ${arrow}${Math.abs(chgPct).toFixed(2)}%`;

      return {
        text: `${symbol} ${priceText}${pctText}`.slice(0, 25), // LaMetric safe length
        icon,
        index: idx + 1,
      };
    });

    // Market status frame
    const anyHasLast = frames.some((f) => !f.text.includes("NO LAST"));
    const marketFrame = {
      text: anyHasLast ? `Market: OPEN ${frames.length}` : `Market: NO LAST ${frames.length}`,
      icon: 42844,
      index: 0,
    };

    res.status(200).json({ frames: [marketFrame, ...frames] });
  } catch (err) {
    res.status(200).json({
      frames: [{ text: "Server error", icon: 42844, index: 0 }],
    });
  }
}
