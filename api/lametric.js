export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Your tickers
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const r = await fetch(url);
    const data = await r.json();

    const list = Array.isArray(data?.tickers) ? data.tickers : [];

    // Build frames in your original ticker order
    const frames = tickers.map((sym, i) => {
      const t = list.find((x) => x.ticker === sym);

      // Best-available price order (works when market is closed too)
      const price =
        t?.lastTrade?.p ??
        t?.day?.c ??
        t?.prevDay?.c ??
        null;

      const text =
        price == null ? `${sym} N/A` : `${sym} ${Number(price).toFixed(2)}`;

      return { text, icon: 42844, index: i };
    });

    // Helpful caching behavior for LaMetric polling
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Error loading prices", icon: 42844, index: 0 }],
    });
  }
}
