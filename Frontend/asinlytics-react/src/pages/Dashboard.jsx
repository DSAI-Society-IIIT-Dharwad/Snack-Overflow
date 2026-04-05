import React, { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { TD, CHART_OPTIONS } from "../data/data";
import { useToast } from "../context/ToastContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function buildLineData(range) {
  const d = TD[range];
  return {
    labels: d.labels,
    datasets: [
      {
        label: "Your Price",
        data: d.mine,
        borderColor: "#10e89a",
        backgroundColor: "rgba(16,232,154,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#10e89a",
      },
      {
        label: "Market Avg",
        data: d.market,
        borderColor: "rgba(59,158,255,0.6)",
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

export default function Dashboard({ sellers, alerts, onNav, onMarkRead, onMarkAllRead, searchQuery }) {
  const [range, setRange] = useState("7d");
  const [sellerFilter, setSellerFilter] = useState("all");
  const toast = useToast();

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const filteredSellers = sellerFilter === "all"
    ? sellers
    : sellers.filter((s) => s.fba_status === sellerFilter);

  const displayedSellers = searchQuery
    ? filteredSellers.filter(
        (s) =>
          s.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredSellers;

  return (
    <div className="page-content">
      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card c-green">
          {/* <div className="kpi-icon">💰</div> */}
          <div className="kpi-label">Lowest Market Price</div>
          <div className="kpi-val green">₹2,199</div>
          <div className="kpi-delta dd">▼ 5% from yesterday</div>
        </div>
        <div className="kpi-card c-blue">
          {/* <div className="kpi-icon">🎯</div> */}
          <div className="kpi-label">Recommended Price</div>
          <div className="kpi-val blue">₹2,249</div>
          <div className="kpi-delta du">✓ Optimal margin</div>
        </div>
        <div className="kpi-card c-amber">
          {/* <div className="kpi-icon">👥</div> */}
          <div className="kpi-label">Active Sellers</div>
          <div className="kpi-val amber">127</div>
          <div className="kpi-delta du">↑ 3 new this week</div>
        </div>
        <div className="kpi-card c-red" style={{ cursor: "pointer" }}
          onClick={() => onNav("alerts")}>
          {/* <div className="kpi-icon">⚠️</div> */}
          <div className="kpi-label">Undercut Alerts</div>
          <div className="kpi-val red" id="kav">{unreadCount}</div>
          <div className="kpi-delta dd">Click to view</div>
        </div>
      </div>

      {/* Price Chart + Recommendation */}
      <div className="g2">
        <div className="panel">
          <div className="ph">
            <div>
              <h3>Market Price Trend</h3>
              <div className="sub">ASIN B08XYZ2 · SKF 6205 Bearing</div>
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
            <Line data={buildLineData(range)} options={CHART_OPTIONS} height={190} />
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="ph">
              <div>
                <h3>Pricing Recommendation</h3>
                <div className="sub">Rule-based engine</div>
              </div>
              <span className="sp on">● ACTIVE</span>
            </div>
            <div className="pb" style={{ paddingTop: "0.8rem" }}>
              <div className="rc">
                <div className="rc-label">OPTIMAL SELLING PRICE</div>
                <div className="rc-price">₹2,249</div>
                <div className="rc-reason">₹50 above lowest competitor (₹2,199), below market avg (₹2,380). Margin ~12%.</div>
                <div className="rc-inputs">
                  <div className="ri"><div className="ri-label">COST PRICE</div><div className="ri-val">₹1,950</div></div>
                  <div className="ri"><div className="ri-label">AVG MARKET</div><div className="ri-val">₹2,380</div></div>
                </div>
              </div>
              <button className="btn btn-green" style={{ width: "100%", marginTop: "0.3rem" }}
                onClick={() => onNav("reprice")}>
                Open Reprice Engine →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Comparison + Alerts mini */}
      <div className="g2">
        <div className="panel">
          <div className="ph">
            <div>
              <h3>Seller Comparison</h3>
              <div className="sub">All sellers for tracked ASIN</div>
            </div>
            <div className="tabs" id="sftabs">
              {["all", "FBA", "FBM"].map((f) => (
                <button key={f} className={`tab${sellerFilter === f ? " active" : ""}`}
                  onClick={() => setSellerFilter(f)}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: 0 }}>
            <table className="dt">
              <thead>
                <tr><th>Seller</th><th>Price</th><th>Type</th><th>Region</th><th>Rel.</th></tr>
              </thead>
              <tbody id="stbody">
                {displayedSellers.map((s) => (
                  <tr key={s.seller_name} style={{ cursor: "pointer" }}>
                    <td><div className="sn">{s.seller_name}</div><div className="sl">📍 {s.location}</div></td>
                    <td>
                      <div className="pv" style={{ color: s.is_lowest ? "var(--green)" : "var(--text)" }}>
                        ₹{s.price.toLocaleString("en-IN")}
                      </div>
                      {s.is_lowest && <div style={{ fontSize: "0.6rem", color: "var(--green)", fontFamily: "var(--font-m)" }}>LOWEST</div>}
                    </td>
                    <td><span className={`tag t-${s.fba_status.toLowerCase()}`}>{s.fba_status}</span></td>
                    <td style={{ color: "var(--muted2)", fontSize: "0.78rem" }}>{s.region}</td>
                    <td style={{ minWidth: "70px" }}>
                      <div className="pb-bg">
                        <div className="pb-fill" style={{ width: `${s.relevance_score}%`, background: s.is_lowest ? "var(--green)" : "var(--blue)" }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div>
              <h3>Alerts</h3>
              <div className="sub" id="apanelsub">{unreadCount} active</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onMarkAllRead}>Mark All Read</button>
          </div>
          <div className="pb" id="alertsmini">
            {alerts.slice(0, 4).length ? alerts.slice(0, 4).map((a) => (
              <div key={a.id} className={`al${a.is_read ? " read" : ""}`} onClick={() => onMarkRead(a.id)}>
                <div className="al-icon">{a.icon}</div>
                <div className="al-body">
                  <div className="al-title">{a.title}</div>
                  <div className="al-desc">{a.message}</div>
                  <div className="al-time">{a.detected_at}{a.is_read ? " · Read" : ""}</div>
                </div>
                <span className={`al-sev s${a.severity.charAt(0)}`}>{a.severity.toUpperCase()}</span>
              </div>
            )) : <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: "0.85rem" }}>✓ No alerts</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
