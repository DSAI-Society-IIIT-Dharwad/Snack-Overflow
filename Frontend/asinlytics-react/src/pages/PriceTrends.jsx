import React, { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { TD, CHART_OPTIONS } from "../data/data";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function buildTrendData(range) {
  const d = TD[range];
  return {
    labels: d.labels,
    datasets: [
      {
        label: "Your Price",
        data: d.mine,
        borderColor: "#10e89a",
        backgroundColor: "rgba(16,232,154,0.07)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#10e89a",
      },
      {
        label: "Market Avg",
        data: d.market,
        borderColor: "rgba(59,158,255,0.5)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [4, 3],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
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

export default function PriceTrends() {
  const [range, setRange] = useState("7d");

  return (
    <div className="page-content">
      <div className="kpi-row">
        <div className="kpi-card c-green">
          <div className="kpi-label">7D Price Change</div>
          <div className="kpi-val green">-4.8%</div>
          <div className="kpi-delta du">Favourable</div>
        </div>
        <div className="kpi-card c-blue">
          <div className="kpi-label">30D Avg Price</div>
          <div className="kpi-val blue">₹2,312</div>
        </div>
        <div className="kpi-card c-amber">
          <div className="kpi-label">Volatility</div>
          <div className="kpi-val amber">Medium</div>
        </div>
        <div className="kpi-card c-red">
          <div className="kpi-label">Spike Events</div>
          <div className="kpi-val red">3</div>
          <div className="kpi-delta dd">Last 30 days</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <div><h3>Market Price Trend</h3></div>
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
          <Line data={buildTrendData(range)} options={CHART_OPTIONS} height={220} />
        </div>
      </div>

      <div className="panel">
        <div className="ph"><div><h3>Seller Volume Trend</h3></div></div>
        <div className="pb">
          <Bar data={volData} options={volOptions} height={140} />
        </div>
      </div>
    </div>
  );
}
