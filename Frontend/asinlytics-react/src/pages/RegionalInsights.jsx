import React, { useState, useEffect, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { REGDATA } from "../data/data";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const barData = {
  labels: ["North", "South", "West", "East"],
  datasets: [{
    label: "Avg Price",
    data: [2350, 2290, 2199, 2480],
    backgroundColor: ["rgba(59,158,255,0.5)", "rgba(16,232,154,0.5)", "rgba(16,232,154,0.8)", "rgba(245,166,35,0.5)"],
    borderColor: ["#3b9eff", "#10e89a", "#10e89a", "#f5a623"],
    borderWidth: 1,
    borderRadius: 5,
  }],
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0e1320",
      callbacks: { label: (c) => " ₹" + c.raw.toLocaleString("en-IN") },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#5e7296", font: { size: 10, family: "JetBrains Mono" } } },
    y: {
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: { color: "#5e7296", font: { size: 9, family: "JetBrains Mono" }, callback: (v) => "₹" + v.toLocaleString("en-IN") },
      min: 1800,
    },
  },
};

const regKpis = [
  { key: "north", label: "North India", val: "₹2,350", delta: "38 sellers · ▼1.0%", colorClass: "c-blue",  valClass: "blue",  deltaClass: "dd" },
  { key: "south", label: "South India", val: "₹2,290", delta: "41 sellers · ▲2.3%", colorClass: "c-green", valClass: "green", deltaClass: "du" },
  { key: "west",  label: "West India",  val: "₹2,199", delta: "29 sellers · ▼1.1%", colorClass: "c-amber", valClass: "amber", deltaClass: "dd" },
  { key: "east",  label: "East India",  val: "₹2,480", delta: "19 sellers · ▲1.2%", colorClass: "c-red",   valClass: "red",   deltaClass: "du" },
];

function makeRegLine() {
  return Array.from({ length: 7 }, () => 2100 + Math.floor(Math.random() * 400));
}

export default function RegionalInsights() {
  const [selectedKey, setSelectedKey] = useState("west");
  const [lineData, setLineData] = useState(makeRegLine());

  const region = REGDATA[selectedKey];

  function selectRegion(key) {
    setSelectedKey(key);
    setLineData(makeRegLine());
  }

  const regLineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Avg Price",
      data: lineData,
      borderColor: "var(--green)",
      backgroundColor: "rgba(16,232,154,0.07)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: "#10e89a",
    }],
  };

  const regLineOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 } } },
      y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 }, callback: (v) => "₹" + v } },
    },
  };

  return (
    <div className="page-content">
      <div className="kpi-row">
        {regKpis.map((k) => (
          <div key={k.key}
            className={`kpi-card ${k.colorClass}`}
            style={{ cursor: "pointer", borderColor: selectedKey === k.key ? "var(--green)" : "" }}
            onClick={() => selectRegion(k.key)}>
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-val ${k.valClass}`}>{k.val}</div>
            <div className={`kpi-delta ${k.deltaClass}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        <div className="panel">
          <div className="ph"><div><h3>Price by Region</h3></div></div>
          <div className="pb">
            <Bar data={barData} options={barOptions} height={220} />
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div>
              <h3>Selected: <span id="regname" style={{ color: "var(--green)" }}>{region.name}</span></h3>
              <div className="sub" id="regcities">{region.cities}</div>
            </div>
          </div>
          <div className="pb">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
              <div className="ri"><div className="ri-label">AVG PRICE</div><div className="ri-val" id="rdavg">{region.avg}</div></div>
              <div className="ri"><div className="ri-label">LOWEST</div><div className="ri-val" id="rdlow" style={{ color: "var(--green)" }}>{region.low}</div></div>
              <div className="ri"><div className="ri-label">SELLERS</div><div className="ri-val" id="rdsel">{region.sel}</div></div>
            </div>
            <Line key={selectedKey} data={regLineData} options={regLineOptions} height={160} />
          </div>
        </div>
      </div>
    </div>
  );
}
