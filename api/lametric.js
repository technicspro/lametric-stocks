export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Your tickers (you can edit this list anytime)
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    const data = await r.json();

    // If Polygon returns an error, show it on the clock (helpful for debugging)
    if (!r.ok || data?.status === "ERROR") {
      const msg = data?.error || data?.message || `Polygon error (${r.status})`;
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: 42844, index: 0 }],
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // Build 1 frame per ticker (LaMetric will rotate them)
    const frames = tickers.map((sym, i) => {
      const t = items.find((x) => x.ticker === sym);

      // Best-available price order:
      // 1) lastTrade.p (if market is open / recent trade)
      // 2) day.c (today close if present)
      // 3) prevDay.c (yesterday close - works when market is closed)
      const price =
        t?.lastTrade?.p ??
        t?.day?.c ??
        t?.prevDay?.c ??
        null;

      const text = price == null
        ? `${sym} --`
        : `${sym} ${Number(price).toFixed(2)}`;

      return { text, icon: 42844, index: i };
    });

    // Avoid caching so your LaMetric polling stays fresh
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error", icon: 42844, index: 0 }],
    });
  }
}
