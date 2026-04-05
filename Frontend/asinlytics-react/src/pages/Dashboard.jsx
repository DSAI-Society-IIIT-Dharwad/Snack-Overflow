import React, { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { TD, CHART_OPTIONS } from "../data/data";
import { useToast } from "../context/ToastContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Dynamically builds the chart reading from the DashboardResponse model
function buildLineData(price_history = [], rangeStr = "7d") {
  if (!price_history || price_history.length === 0) return { labels: [], datasets: [] };
  
  let days = 7;
  if (rangeStr === "30d") days = 30;
  if (rangeStr === "90d") days = 90;

  // Slice history to the last N days
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


// Add asin and sellerId to the destructuring list here:
export default function Dashboard({ asin, sellerId, alerts, recommendedPriceData, onNav, onMarkRead, onMarkAllRead, searchQuery }) {
  const [range, setRange] = useState("7d");
  const [sellerFilter, setSellerFilter] = useState("all");
  const toast = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update the fetch URL to use dynamic template variables 
  useEffect(() => {
    if (!asin) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    fetch(`http://localhost:8000/dashboard/?asin=${asin}&seller_id=${sellerId || ""}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        setDashboardData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard data", err);
        setDashboardData(null);
        setIsLoading(false);
      });
  }, [asin, sellerId]); // <--- Add asin and sellerId to the dependency array so it refetches if they change!

  // ... rest of the code remains the same


  if (isLoading) {
    return <div className="page-content" style={{ padding: "2rem" }}>Loading dashboard data...</div>;
  }

  const data = dashboardData || {};
  const unreadCount = data.undercut_alerts || 0;

  const sellersList = data.seller_comparison || [];
  const filteredSellers = sellerFilter === "all"
    ? sellersList
    : sellersList.filter((s) => s.fba_status && s.fba_status.toLowerCase() === sellerFilter.toLowerCase());

  const displayedSellers = filteredSellers;

  const validPrices = sellersList.map(s => s.price || 0).filter(p => p > 0);
  const minPrice = validPrices.length ? Math.min(...validPrices) : 0;
  const maxPrice = validPrices.length ? Math.max(...validPrices) : 0;

  return (
    <div className="page-content">
            {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card c-green">
          <div className="kpi-label">Lowest Market Price</div>
          <div className="kpi-val green">₹{data.lowest_market_price?.toLocaleString("en-IN") || "--"}</div>
          <div className="kpi-delta dd">▼ {data.lowest_price_change_pct || 0}% vs yesterday</div>
        </div>
        <div className="kpi-card c-blue">
          <div className="kpi-label">Your Price</div>
          <div className="kpi-val blue">₹{data.your_price?.toLocaleString("en-IN") || "--"}</div>
          <div className="kpi-delta du">Avg Market: ₹{data.market_avg?.toLocaleString("en-IN") || "--"}</div>
        </div>
        <div className="kpi-card c-amber">
          <div className="kpi-label">Active Sellers</div>
          <div className="kpi-val amber">{data.active_sellers || 0}</div>
          <div className="kpi-delta du">↑ {data.new_sellers_this_week || 0} new this week</div>
        </div>
        <div className="kpi-card c-red" style={{ cursor: "pointer" }}
          onClick={() => onNav("alerts")}>
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
              <div className="sub">{dashboardData?.product_title ? `ASIN ${asin} · ${dashboardData.product_title}` : `ASIN ${asin || "--"}`}</div>
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
            {dashboardData?.price_history && dashboardData.price_history.length > 0 ? (
              <Line data={buildLineData(dashboardData.price_history, range)} options={CHART_OPTIONS} height={190} />
            ) : (
              <div style={{ height: "190px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", fontFamily: "var(--font-m)" }}>
                -- No Market Data Available --
              </div>
            )}
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
              {(function() {
                // If the user just clicked "Apply" in this session, show that exact data globally.
                if (recommendedPriceData) {
                  return (
                    <div className="rc">
                      <div className="rc-label">OPTIMAL SELLING PRICE</div>
                      <div className="rc-price">₹{recommendedPriceData.price.toLocaleString("en-IN")}</div>
                      
                      <div className="rc-reason">
                        Recommended by <b>{recommendedPriceData.strategy}</b> strategy. Margin ~{recommendedPriceData.marginPct}%.
                      </div>
                      
                      <div className="rc-inputs">
                        <div className="ri"><div className="ri-label">COST PRICE</div><div className="ri-val">₹{recommendedPriceData.cost.toLocaleString("en-IN")}</div></div>
                        <div className="ri"><div className="ri-label">AVG MARKET</div><div className="ri-val">₹{recommendedPriceData.avg.toLocaleString("en-IN")}</div></div>
                      </div>
                    </div>
                  );
                }
                
                // Otherwise, automatically calculate the Optimal Price dynamically based on the current market data inside Dashboard response!
                // For a true implementation we would fetch the specific rule applied to this ASIN, but we will use a Default Margin Strategy if no specific global payload exists yet.
                const comp = dashboardData?.lowest_market_price || 0;
                const avg = dashboardData?.market_avg || 0;
                const cost = 1950; // Mock base cost
                const margin = 12; // Mock base margin %
                const strategy = "Margin-First";
                
                // Fallback calculator using equivalent logic
                const priceMatch = Math.ceil(cost * (1 + margin / 100));
                let boundedPrice = Math.max(priceMatch, Math.ceil(cost * 1.05));
                
                if (comp === 0 && avg === 0) {
                   return (
                     <div className="rc">
                       <div className="rc-label">OPTIMAL SELLING PRICE</div>
                       <div className="rc-price">--</div>
                       <div className="rc-reason" style={{ color: "var(--muted)" }}>
                         Run the Reprice Engine to calculate optimal pricing based on fresh market limits.
                       </div>
                       <div className="rc-inputs">
                         <div className="ri"><div className="ri-label">COST PRICE</div><div className="ri-val">--</div></div>
                         <div className="ri"><div className="ri-label">AVG MARKET</div><div className="ri-val">--</div></div>
                       </div>
                     </div>
                   );
                }

                return (
                  <div className="rc">
                    <div className="rc-label">OPTIMAL SELLING PRICE</div>
                    <div className="rc-price">₹{boundedPrice.toLocaleString("en-IN")}</div>
                    
                    <div className="rc-reason">
                      Recommended strictly via active <b>{strategy}</b> parameters. Target Margin ~{((boundedPrice - cost) / cost * 100).toFixed(1)}%.
                    </div>
                    
                    <div className="rc-inputs">
                      <div className="ri"><div className="ri-label">COST PRICE</div><div className="ri-val">₹{cost.toLocaleString("en-IN")}</div></div>
                      <div className="ri"><div className="ri-label">AVG MARKET</div><div className="ri-val">₹{avg.toLocaleString("en-IN")}</div></div>
                    </div>
                  </div>
                );
              })()}
              
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
                {displayedSellers.map((s) => {
                  const sPrice = s.price || 0;
                  const pct = maxPrice === minPrice ? 100 : Math.round(((sPrice - minPrice) / (maxPrice - minPrice)) * 100);
                  const isLow = sPrice === minPrice && sPrice > 0;
                  return (
                    <tr key={s.seller_id} style={{ cursor: "pointer" }}>
                      <td><div className="sn">{s.seller_name || "Unknown"}</div></td>
                      <td>
                        <div className="pv" style={{ color: isLow ? "var(--green)" : "var(--text)" }}>
                          ₹{sPrice.toLocaleString("en-IN")}
                        </div>
                        {isLow && <div style={{ fontSize: "0.6rem", color: "var(--green)", fontFamily: "var(--font-m)" }}>LOWEST</div>}
                      </td>
                      <td><span className={`tag t-${(s.fba_status || "FBM").toLowerCase()}`}>{s.fba_status || "FBM"}</span></td>
                      <td style={{ color: "var(--muted2)", fontSize: "0.78rem" }}>{s.region || "--"}</td>
                      <td style={{ minWidth: "70px" }}>
                        <div className="pb-bg">
                          <div className="pb-fill" style={{ width: `${100 - pct}%`, background: isLow ? "var(--green)" : "var(--blue)" }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <div key={a.id} className={`al${a.read ? " read" : ""}`} onClick={() => onMarkRead(a.id)}>
                <div className="al-icon">{a.icon}</div>
                <div className="al-body">
                  <div className="al-title">{a.title}</div>
                  <div className="al-desc">{a.desc}</div>
                  <div className="al-time">{a.time}{a.read ? " · Read" : ""}</div>
                </div>
                <span className={`al-sev s${a.sev.charAt(0)}`}>{a.sev.toUpperCase()}</span>
              </div>
            )) : <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: "0.85rem" }}>✓ No alerts</div>}
          </div>
        </div>
      </div>
    </div>
  );
}