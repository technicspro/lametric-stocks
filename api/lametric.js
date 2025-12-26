export default async function handler(req, res) {
  try {
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD"];
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY" }]
      });
    }

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    // Polygon sometimes returns an error JSON with "error" or "message"
    if (!response.ok || data?.status === "ERROR") {
      const msg = (data?.error || data?.message || `Polygon error ${response.status}`).toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 25) }]
      });
    }

    const items = Array.isArray(data?.tickers) ? data.tickers : [];

    // Helper: pick the best available price without defaulting to 0
    const pickPrice = (t) => {
      const last = t?.lastTrade?.p;
      if (Number.isFinite(last) && last > 0) return last;

      const dayClose = t?.day?.c;
      if (Number.isFinite(dayClose) && dayClose > 0) return dayClose;

      const prevClose = t?.prevDay?.c;
      if (Number.isFinite(prevClose) && prevClose > 0) return prevClose;

      return null;
    };

    // OPTIONAL: show a quick market hint frame first
    // If any ticker has lastTrade price > 0, we call it "LIVE"
    const live = items.some((t) => Number.isFinite(t?.lastTrade?.p) && t.lastTrade.p > 0);
    const statusFrame = { text: live ? "Market: LIVE" : "Market: NO LAST" };

    const frames = items.length
      ? [statusFrame].concat(
          items.map((t, index) => {
            const symbol = t?.ticker || "???";
            const price = pickPrice(t);
            const text = price ? `${symbol} ${price.toFixed(2)}` : `${symbol} n/a`;

            return { text, icon: 42844, index: index + 1 };
          })
        )
      : [{ text: "No tickers returned" }];

    // IMPORTANT: LaMetric expects { frames: [...] }
    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Server error" }]
    });
  }
}
