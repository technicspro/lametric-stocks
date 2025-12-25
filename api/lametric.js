export default async function handler(req, res) {
  try {
    const tickers = ["AAPL","NVDA","MSFT","NFLX","GME","TSLA","GOOGL","AMD"];
    const apiKey = process.env.POLYGON_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY" }]
      });
    }

    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" + tickers.join(",") +
      "&apiKey=" + apiKey;

    const response = await fetch(url);
    const data = await response.json();

    const frames = (data.tickers || []).map(t => {
      const price = t.lastTrade?.p || t.day?.c || 0;
      return { text: `${t.ticker} ${price.toFixed(2)}` };
    });

    res.status(200).json({ frames });

  } catch (err) {
    res.status(200).json({
      frames: [{ text: "Error loading prices" }]
    });
  }
}
