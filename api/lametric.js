export default async function handler(req, res) {
  try {
    const tickers = ["AAPL", "NVDA", "MSFT", "NFLX", "GME", "TSLA", "GOOGL", "AMD", "SPY", "QQQ"];

    const apiKey = process.env.POLYGON_API_KEY;
    const ICON_UP = parseInt(process.env.ICON_UP || "", 10);
    const ICON_DOWN = parseInt(process.env.ICON_DOWN || "", 10);

    if (!apiKey) {
      return res.status(200).json({
        frames: [{ text: "Missing POLYGON_API_KEY", icon: 42844, index: 0 }],
      });
    }

    // Polygon snapshot for multiple tickers
    const url =
      "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers" +
      "?tickers=" +
      encodeURIComponent(tickers.join(",")) +
      "&apiKey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    // If Polygon errors, show it on the clock for quick debugging
    if (!response.ok || data?.status === "ERROR") {
      const msg = (data?.error || data?.message || `Polygon error ${response.status}`).toString();
      return res.status(200).json({
        frames: [{ text: msg.slice(0, 26), icon: 42844, index: 0 }],
      });
    }

    const list = Array.isArray(data?.tickers) ? data.tickers : [];

    // Determine market status if provided
    const marketStatus =
      (data?.market_status || data?.marketStatus || "").toString().toUpperCase() || "OK";

    // Count tickers with no last trade yet (common right at the open or illiquid names)
    let noLastCount = 0;

    // Header frame first
    const frames = [
      { text: `Market: ${marketStatus}`, icon: 42844, index: 0 },
    ];

    list.forEach((t, i) => {
      const symbol = t?.ticker || "???";

      const last = t?.lastTrade?.p;
      const close = t?.day?.c;        // today close so far (intraday)
      const prevClose = t?.prevDay?.c; // yesterday close

      // Pick a "best available" price
      let price =
        (typeof last === "number" && last) ? last :
        (typeof close === "number" && close) ? close :
        (typeof prevClose === "number" && prevClose) ? prevClose :
        0;

      if (!last) noLastCount += 1;

      // % change: prefer Polygon's computed value if present
      let pct =
        (typeof t?.todaysChangePerc === "number")
          ? t.todaysChangePerc
          : (typeof close === "number" && typeof prevClose === "number" && prevClose !== 0)
            ? ((close - prevClose) / prevClose) * 100
            : 0;

      const isUp = pct >= 0;

      // IMPORTANT:
      // Text is white on LaMetric. To get green/red, you must swap ICONS.
      const iconToUse =
        isUp ? (Number.isFinite(ICON_UP) ? ICON_UP : 42844)
             : (Number.isFinite(ICON_DOWN) ? ICON_DOWN : 42844);

      const pctText = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      const priceText = price ? price.toFixed(2) : "0.00";

      frames.push({
        text: `${symbol} ${priceText} ${pctText}`.slice(0, 26),
        icon: iconToUse,
        index: i + 1,
      });
    });

    // If lots of "no last" at the open, call it out (like you saw earlier)
    if (noLastCount > 0) {
      frames[0] = { text: `Market: NO LAST ${noLastCount}`, icon: 42844, index: 0 };
    }

    return res.status(200).json({ frames });
  } catch (err) {
    return res.status(200).json({
      frames: [{ text: "Error loading prices", icon: 42844, index: 0 }],
    });
  }
}
