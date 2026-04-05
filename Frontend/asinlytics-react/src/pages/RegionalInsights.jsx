import React, { useState, useEffect } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// One color config per sub-region (order matches _REGION_META in backend)
const REGION_COLORS = {
  "North TN":       { bar: "rgba(59,158,255,0.55)",   border: "#3b9eff",  valClass: "blue",  colorClass: "c-blue"  },
  "West TN":        { bar: "rgba(16,232,154,0.55)",   border: "#10e89a",  valClass: "green", colorClass: "c-green" },
  "South TN":       { bar: "rgba(245,166,35,0.55)",   border: "#f5a623",  valClass: "amber", colorClass: "c-amber" },
  "Central TN":     { bar: "rgba(180,100,255,0.55)",  border: "#b464ff",  valClass: "blue",  colorClass: "c-blue"  },
  "South-East TN":  { bar: "rgba(255,80,80,0.55)",    border: "#ff5050",  valClass: "red",   colorClass: "c-red"   },
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0e1320",
      callbacks: { label: (c) => " ₹" + (c.raw ?? 0).toLocaleString("en-IN") },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#5e7296", font: { size: 10, family: "JetBrains Mono" } } },
    y: {
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: { color: "#5e7296", font: { size: 9, family: "JetBrains Mono" }, callback: (v) => "₹" + v.toLocaleString("en-IN") },
    },
  },
};

const regLineOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 } } },
    y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 }, callback: (v) => "₹" + v } },
  },
};

export default function RegionalInsights({ asin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (!asin) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`http://localhost:8000/regional-insights/?asin=${asin}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        // Auto-select the first region that has data, else first region
        const firstWithData = json.regions.find((r) => r.avg_price != null);
        setSelectedKey((firstWithData || json.regions[0])?.region ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [asin]);

  // ── Loading / error / no-asin states ──────────────────────────────────────
  if (!asin) {
    return (
      <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", color: "var(--muted2)", fontSize: "0.9rem" }}>
        Search for an ASIN in the top bar to load Regional Insights.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content" style={{ padding: "2rem", color: "var(--muted2)" }}>
        Loading regional data for <b>{asin}</b>…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-content" style={{ padding: "2rem", color: "var(--red)" }}>
        Failed to load Regional Insights: {error || "No data returned."}
      </div>
    );
  }

  const regions = data.regions || [];
  const selected = regions.find((r) => r.region === selectedKey) || regions[0];

  // ── Bar chart ──────────────────────────────────────────────────────────────
  const barData = {
    labels: regions.map((r) => r.display_name),
    datasets: [{
      label: "Avg Price",
      data: regions.map((r) => r.avg_price ?? 0),
      backgroundColor: regions.map((r) => REGION_COLORS[r.region]?.bar ?? "rgba(100,100,100,0.4)"),
      borderColor: regions.map((r) => REGION_COLORS[r.region]?.border ?? "#888"),
      borderWidth: 1,
      borderRadius: 5,
    }],
  };

  // ── Line chart (weekly trend for selected region) ──────────────────────────
  const weeklyPoints = selected?.weekly_trend ?? [];
  const regLineData = {
    labels: weeklyPoints.map((p) => p.day),
    datasets: [{
      label: "Avg Price",
      data: weeklyPoints.map((p) => p.avg_price),
      borderColor: "var(--green)",
      backgroundColor: "rgba(16,232,154,0.07)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: "#10e89a",
      spanGaps: true,
    }],
  };

  return (
    <div className="page-content">
      {/* KPI region cards */}
      <div className="kpi-row">
        {regions.map((r) => {
          const col = REGION_COLORS[r.region] || { valClass: "blue", colorClass: "c-blue" };
          const changePct = r.price_change_pct;
          const changeStr = changePct != null
            ? `${r.seller_count} sellers · ${changePct >= 0 ? "▲" : "▼"}${Math.abs(changePct)}%`
            : `${r.seller_count} sellers`;
          const isUp = changePct != null && changePct >= 0;
          return (
            <div key={r.region}
              className={`kpi-card ${col.colorClass}`}
              style={{ cursor: "pointer", borderColor: selectedKey === r.region ? "var(--green)" : "" }}
              onClick={() => setSelectedKey(r.region)}
            >
              <div className="kpi-label">{r.display_name}</div>
              <div className={`kpi-val ${col.valClass}`}>
                {r.avg_price != null ? `₹${r.avg_price.toLocaleString("en-IN")}` : "--"}
              </div>
              <div className={`kpi-delta ${isUp ? "du" : "dd"}`}>{changeStr}</div>
            </div>
          );
        })}
      </div>

      <div className="g2">
        {/* Bar chart */}
        <div className="panel">
          <div className="ph"><div><h3>Price by Region</h3></div></div>
          <div className="pb">
            {regions.some((r) => r.avg_price != null)
              ? <Bar data={barData} options={barOptions} height={220} />
              : <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)" }}>No price data yet</div>
            }
          </div>
        </div>

        {/* Detail panel for selected region */}
        <div className="panel">
          <div className="ph">
            <div>
              <h3>Selected: <span id="regname" style={{ color: "var(--green)" }}>{selected?.display_name}</span></h3>
              <div className="sub" id="regcities">{selected?.cities?.join(" · ")}</div>
            </div>
          </div>
          <div className="pb">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
              <div className="ri">
                <div className="ri-label">AVG PRICE</div>
                <div className="ri-val" id="rdavg">
                  {selected?.avg_price != null ? `₹${selected.avg_price.toLocaleString("en-IN")}` : "--"}
                </div>
              </div>
              <div className="ri">
                <div className="ri-label">LOWEST</div>
                <div className="ri-val" id="rdlow" style={{ color: "var(--green)" }}>
                  {selected?.lowest_price != null ? `₹${selected.lowest_price.toLocaleString("en-IN")}` : "--"}
                </div>
              </div>
              <div className="ri">
                <div className="ri-label">SELLERS</div>
                <div className="ri-val" id="rdsel">{selected?.seller_count ?? "--"}</div>
              </div>
            </div>
            {weeklyPoints.some((p) => p.avg_price != null)
              ? <Line key={selectedKey} data={regLineData} options={regLineOptions} height={160} />
              : <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontSize: "0.82rem" }}>No weekly trend data yet</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
