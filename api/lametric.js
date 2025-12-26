export default async function handler(req, res) {
  try {
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Your tickers (edit if you want)
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const r = await fetch(url);
    const data = await r.json();

    // If Polygon returns an error, show it on the clock
    if (!r.ok || data?.status === "ERROR") {
      const msg = data?.error || data?.message || `Polygon error (${r.status})`;
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25), icon: 42844, index: 0 }],
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // Build a quick lookup by symbol
    const bySymbol = {};
    for (const it of items) {
      if (it?.ticker) bySymbol[it.ticker.toUpperCase()] = it;
    }

    const frames = tickers.map((sym, index) => {
      const t = bySymbol[sym];

      // Best available price depending on market state
      const price =
        t?.lastTrade?.p ??
        t?.day?.c ??
        t?.prevDay?.c ??
        null;

      const text =
        price == null
          ? `${sym} --`
          : `${sym} ${Number(price).toFixed(2)}`;

      return { text, icon: 42844, index };
    });

    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error", icon: 42844, index: 0 }],
    });
  }
}
