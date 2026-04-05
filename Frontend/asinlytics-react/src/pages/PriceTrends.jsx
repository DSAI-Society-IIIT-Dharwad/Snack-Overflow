import React, { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { CHART_OPTIONS } from "../data/data";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function buildTrendData(price_history = [], rangeStr = "7d") {
  if (!price_history || price_history.length === 0) return { labels: [], datasets: [] };
  
  let days = 7;
  if (rangeStr === "30d") days = 30;
  if (rangeStr === "90d") days = 90;

  const sliced = price_history.slice(-days);

  const labels = sliced.map(p => {
    const d = new Date(p.date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const mine = sliced.map(p => p.your_price || null);
  const market = sliced.map(p => p.market_avg || null);

  return {
    labels: labels,
    datasets: [
      {
        label: "Your Price",
        data: mine,
        borderColor: "#10e89a",
        backgroundColor: "rgba(16,232,154,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#10e89a",
        spanGaps: true
      },
      {
        label: "Market Avg",
        data: market,
        borderColor: "rgba(59,158,255,0.6)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        spanGaps: true
      },
    ],
  };
}

const volData = {
  labels: ["SEPT", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"],
  datasets: [{
    label: "No. of Sellers",
    data: [11, 8, 7, 12, 10, 9, 12],
    backgroundColor: "rgba(59,158,255,0.4)",
    borderColor: "#3b9eff",
    borderWidth: 1,
    borderRadius: 4,
  }],
};

const volOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#5e7296", font: { size: 9, family: "JetBrains Mono" } } },
    y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { size: 9, family: "JetBrains Mono" } } },
  },
};

export default function PriceTrends({ asin, sellerId }) {
  const [range, setRange] = useState("7d");
  const [trendsData, setTrendsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!asin) {
      setTrendsData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`http://localhost:8000/price-trends/?asin=${asin}&seller_id=${sellerId || ""}`)
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        setTrendsData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch price trends", err);
        setTrendsData(null);
        setIsLoading(false);
      });
  }, [asin, sellerId]);

  const priceChangeText = trendsData?.price_change_7d_pct !== undefined && trendsData?.price_change_7d_pct !== null
    ? `${trendsData.price_change_7d_pct > 0 ? "+" : ""}${trendsData.price_change_7d_pct}%`
    : "--";
    
  const priceChangeLabel = trendsData?.price_change_7d_pct !== undefined && trendsData?.price_change_7d_pct !== null
    ? (trendsData.price_change_7d_pct < 0 ? "Favourable" : "Rising")
    : "";
    
  const priceChangeColorClass = trendsData?.price_change_7d_pct !== undefined && trendsData?.price_change_7d_pct !== null
    ? (trendsData.price_change_7d_pct < 0 ? "du" : "dd")
    : "";

  return (
    <div className="page-content">
      <div className="kpi-row">
        <div className="kpi-card c-green">
          <div className="kpi-label">7D Price Change</div>
          <div className={"kpi-val " + (trendsData?.price_change_7d_pct < 0 ? "green" : "red")}>{priceChangeText}</div>
          <div className={"kpi-delta " + priceChangeColorClass}>{priceChangeLabel}</div>
        </div>
        <div className="kpi-card c-blue">
          <div className="kpi-label">30D Avg Price</div>
          <div className="kpi-val blue">{trendsData?.avg_price_30d ? `₹${trendsData.avg_price_30d.toLocaleString("en-IN")}` : "--"}</div>
        </div>
        <div className="kpi-card c-amber">
          <div className="kpi-label">Volatility</div>
          <div className="kpi-val amber" style={{ textTransform: "capitalize" }}>{trendsData?.volatility || "--"}</div>
        </div>
        <div className="kpi-card c-red">
          <div className="kpi-label">Spike Events</div>
          <div className="kpi-val red">{trendsData?.spike_events_30d !== undefined ? trendsData.spike_events_30d : "--"}</div>
          <div className="kpi-delta dd">Last 30 days</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <div>
             <h3>Market Price Trend</h3>
             <div className="sub">{trendsData?.product_title ? `ASIN ${asin} · ${trendsData.product_title}` : `ASIN ${asin || "--"}`}</div>
          </div>
          <div className="tabs">
            {["7d", "30d", "90d"].map((r) => (
              <button key={r} className={`tab${range === r ? " active" : ""}`}
                onClick={() => setRange(r)}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="pb">
           {!asin ? (
              <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontFamily: "var(--font-m)" }}>
                -- No ASIN Selected --
              </div>
           ) : isLoading ? (
              <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontFamily: "var(--font-m)" }}>
                Loading trend data...
              </div>
           ) : trendsData?.price_history && trendsData.price_history.length > 0 ? (
              <Line data={buildTrendData(trendsData.price_history, range)} options={CHART_OPTIONS} height={220} />
           ) : (
              <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontFamily: "var(--font-m)" }}>
                -- No Market Data Available --
              </div>
           )}
        </div>
      </div>

      <div className="panel">
        <div className="ph"><div><h3>Seller Volume Trend</h3></div></div>
        <div className="pb">
           {!asin ? (
              <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontFamily: "var(--font-m)" }}>
                -- No ASIN Selected --
              </div>
           ) : (
              <Bar data={volData} options={volOptions} height={140} />
           )}
        </div>
      </div>
    </div>
  );
}
