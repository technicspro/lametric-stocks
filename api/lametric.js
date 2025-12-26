export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Your default tickers (can also override via ?tickers=AAPL,NVDA,...)
    const defaultTickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    const tickersParam = (req.query.tickers || "").toString().trim();
    const tickers = tickersParam
      ? tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : defaultTickers;

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" + encodeURIComponent(tickers.join(",")) +
      "&apiKey=" + encodeURIComponent(apiKey);

    const r = await fetch(url);
    const data = await r.json();

    // If Polygon errors, show it on the clock (helps debugging)
    if (!r.ok || data.status === "ERROR") {
      const msg = data.error || data.message || `Polygon error (${r.status})`;
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: 42844, index: 0 }],
      });
    }

    const items = Array.isArray(data.tickers) ? data.tickers : [];

    // Map ticker -> best available price
    const frames = tickers.map((sym, i) => {
      const t = items.find((x) => x.ticker === sym);

      const price =
        t?.lastTrade?.p ??
        t?.min?.c ??
        t?.day?.c ??
        t?.prevDay?.c ??
        null;

      const text =
        price == null || Number.isNaN(Number(price))
          ? `${sym} --`
          : `${sym} ${Number(price).toFixed(2)}`;

      return { text, icon: 42844, index: i };
    });

    // Light caching so LaMetric polling doesn’t hammer Polygon
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error", icon: 42844, index: 0 }],
    });
  }
}
