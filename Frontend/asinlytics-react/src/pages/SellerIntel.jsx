import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import SellerModal from "../modals/SellerModal";

export default function SellerIntel({ asin }) {
  const [regionFilter, setRegionFilter] = useState("all");
  const [stats, setStats] = useState({ total_sellers: 0, fba_sellers: 0, fbm_sellers: 0, new_this_week: 0 });
  const [directory, setDirectory] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const regions = ["all", "North", "South", "West", "East"];

  useEffect(() => {
    if (!asin) {
      setStats({ total_sellers: "--", fba_sellers: "--", fbm_sellers: "--", new_this_week: "--" });
      return;
    }
    
    // Fetch stats
    let url = "http://localhost:8000/seller/stats";
    url += `?asin=${asin}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Stats fetch error:", err));
  }, [asin]);

  useEffect(() => {
    if (!asin) {
      setDirectory([]);
      setIsLoading(false);
      return;
    }
    
    // Fetch directory
    setIsLoading(true);
    let url = "http://localhost:8000/seller/directory";
    const params = new URLSearchParams();
    if (regionFilter !== "all") params.append("region", regionFilter);
    params.append("asin", asin);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setDirectory(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Directory fetch error:", err);
        setIsLoading(false);
      });
  }, [regionFilter, asin]);

  const trendColor = (t) =>
    t === "growing" ? "var(--green)" : t === "declining" ? "var(--red)" : "var(--muted2)";
    
  const formatTrendStr = (t) => 
    t === "growing" ? "↑ Growing" : t === "declining" ? "↓ Declining" : "→ Stable";

  const handleRowClick = async (seller) => {
    if (!seller.seller_id) {
       toast("Seller ID not available completely", "error");
       return;
    }
    try {
      const res = await fetch(`http://localhost:8000/seller/${seller.seller_id}`);
      if (res.ok) {
        const fullProfile = await res.json();
        setSelectedSeller({
          id: fullProfile.seller_id,
          name: fullProfile.seller_name,
          loc: fullProfile.location || "Unknown",
          price: fullProfile.current_price || seller.avg_price || 0,
          products: fullProfile.total_products,
          sales: fullProfile.est_sales ? `₹${fullProfile.est_sales.toLocaleString("en-IN")}` : "Unknown",
          type: fullProfile.fba_status,
          region: fullProfile.region,
          trend: formatTrendStr(fullProfile.trend)
        });
      } else {
        toast("Failed to load seller profile", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Network error loading profile", "error");
    }
  };
  
  const handleWatch = async () => {
    if(!selectedSeller) return;
    try {
      const res = await fetch(`http://localhost:8000/seller/${selectedSeller.id}/watch`, { method: "POST" });
      if(res.ok) {
        toast("Added to watchlist", "success");
      }
    } catch(err) {
      console.error(err);
      toast("Error adding to watchlist", "error");
    } finally {
      setSelectedSeller(null);
    }
  };

  return (
    <div className="page-content">
      <div className="kpi-row">
        <div className="kpi-card c-green"><div className="kpi-label">Total Sellers</div><div className="kpi-val green">{stats.total_sellers}</div></div>
        <div className="kpi-card c-blue"><div className="kpi-label">FBA Sellers</div><div className="kpi-val blue">{stats.fba_sellers}</div></div>
        <div className="kpi-card c-amber"><div className="kpi-label">FBM Sellers</div><div className="kpi-val amber">{stats.fbm_sellers}</div></div>
        <div className="kpi-card c-red"><div className="kpi-label">New This Week</div><div className="kpi-val red">{stats.new_this_week}</div></div>
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
              <tr><th>Seller</th><th>Price</th><th>Products</th><th>Type</th><th>Region</th><th>Trend</th><th></th></tr>
            </thead>
            <tbody id="sptbody">
              {!asin ? (
                 <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--muted2)" }}>-- No ASIN Selected --</td></tr>
              ) : isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Loading directory...</td></tr>
              ) : directory.length === 0 ? (
                 <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>No sellers found in this region.</td></tr>
              ) : (
                directory.map((s, idx) => (
                  <tr key={`${s.seller_id}-${idx}`} style={{ cursor: "pointer" }} onClick={() => handleRowClick(s)}>
                    <td><div className="sn">{s.seller_name}</div><div className="sl">📍 {s.location || "Unknown"}</div></td>
                    <td><div className="pv">₹{s.avg_price ? s.avg_price.toLocaleString("en-IN") : "--"}</div></td>
                    <td style={{ fontFamily: "var(--font-m)", fontSize: "0.78rem", color: "var(--muted2)" }}>{s.product_count} ASINs</td>
                    <td><span className={`tag t-${s.fba_status?.toLowerCase() || 'fbm'}`}>{s.fba_status || 'FBM'}</span></td>
                    <td style={{ color: "var(--muted2)", fontSize: "0.78rem" }}>{s.region || "Unknown"}</td>
                    <td style={{ fontSize: "0.78rem", color: trendColor(s.trend) }}>{formatTrendStr(s.trend)}</td>
                    <td>
                      <button className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); toast(`${s.seller_name} added to watchlist`, "success"); }}>
                        Watch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SellerModal
        seller={selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onWatch={handleWatch}
      />
    </div>
  );
}
