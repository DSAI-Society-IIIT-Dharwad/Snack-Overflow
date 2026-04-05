import React, { useState } from "react";
import { useToast } from "../context/ToastContext";
import SellerModal from "../modals/SellerModal";

export default function SellerIntel({ sellers }) {
  const [regionFilter, setRegionFilter] = useState("all");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const toast = useToast();

  const regions = ["all", "North", "South", "West", "East"];

  const filtered = regionFilter === "all"
    ? sellers
    : sellers.filter((s) => s.region === regionFilter);

  const trendColor = (t) =>
    t.includes("↑") ? "var(--green)" : t.includes("↓") ? "var(--red)" : "var(--muted2)";

  return (
    <div className="page-content">
      <div className="kpi-row">
        <div className="kpi-card c-green"><div className="kpi-label">Total Sellers</div><div className="kpi-val green">127</div></div>
        <div className="kpi-card c-blue"><div className="kpi-label">FBA Sellers</div><div className="kpi-val blue">84</div></div>
        <div className="kpi-card c-amber"><div className="kpi-label">FBM Sellers</div><div className="kpi-val amber">43</div></div>
        <div className="kpi-card c-red"><div className="kpi-label">New This Week</div><div className="kpi-val red">6</div></div>
      </div>

      <div className="panel">
        <div className="ph">
          <div>
            <h3>Seller Directory</h3>
            <div className="sub">Click a row for full profile</div>
          </div>
          <div className="tabs" id="sptabs">
            {regions.map((r) => (
              <button key={r} className={`tab${regionFilter === r ? " active" : ""}`}
                onClick={() => setRegionFilter(r)}>
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 0 }}>
          <table className="dt">
            <thead>
              <tr><th>Seller</th><th>Price</th>{/* <th>Products</th> */}<th>Type</th><th>Region</th><th>Trend</th><th></th></tr>
            </thead>
            <tbody id="sptbody">
              {filtered.map((s) => (
                <tr key={s.name} style={{ cursor: "pointer" }} onClick={() => setSelectedSeller(s)}>
                  <td><div className="sn">{s.name}</div><div className="sl">📍 {s.loc}</div></td>
                  <td><div className="pv">₹{s.price.toLocaleString("en-IN")}</div></td>
                  {/* <td style={{ fontFamily: "var(--font-m)", fontSize: "0.78rem", color: "var(--muted2)" }}>{s.products}</td> */}
                  <td><span className={`tag t-${s.type.toLowerCase()}`}>{s.type}</span></td>
                  <td style={{ color: "var(--muted2)", fontSize: "0.78rem" }}>{s.region}</td>
                  <td style={{ fontSize: "0.78rem", color: trendColor(s.trend) }}>{s.trend}</td>
                  <td>
                    <button className="btn btn-outline btn-sm"
                      onClick={(e) => { e.stopPropagation(); toast(`${s.name} added to watchlist`, "success"); }}>
                      Watch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SellerModal
        seller={selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onWatch={() => { toast("Added to watchlist", "success"); setSelectedSeller(null); }}
      />
    </div>
  );
}
