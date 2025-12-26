export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Your tickers (can override by adding ?tickers=AAPL,NVDA,...)
    const defaultTickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];
    const tickersParam = (req.query.tickers || "").toString().trim();
    const tickers = tickersParam
      ? tickersParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
      : defaultTickers;

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" + encodeURIComponent(tickers.join(",")) +
      "&apiKey=" + encodeURIComponent(apiKey);

    const r = await fetch(url);
    const data = await r.json();

    // If Polygon returns an error, show it on the clock (shortened)
    if (!r.ok || data?.status === "ERROR") {
      const msg = (data?.error || data?.message || `Polygon error ${r.status}`).toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: 42844, index: 0 }],
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // Build LaMetric frames: prefer last trade, then day close, then prev day close.
    const frames = items.slice(0, 20).map((t, i) => {
      const sym = t?.ticker || "???";

      const price =
        (t?.lastTrade?.p ?? null) ??
        (t?.lastQuote?.p ?? null) ??
        (t?.day?.c ?? null) ??
        (t?.prevDay?.c ?? null) ??
        (t?.min?.c ?? null);

      const p = (typeof price === "number" && isFinite(price)) ? price : 0;

      return {
        text: `${sym} ${p.toFixed(2)}`,
        icon: 42844,
        index: i,
      };
    });

    // If Polygon returns nothing, show a clear message
    if (!frames.length) {
      return res.status(200).json({
        frames: [{ text: "No data from Polygon", icon: 42844, index: 0 }],
      });
    }

    // Helps prevent weird caching issues
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error", icon: 42844, index: 0 }],
    });
  }
}
