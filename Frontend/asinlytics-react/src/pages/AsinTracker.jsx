import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";

export default function AsinTracker() {
  const [asinInput, setAsinInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [trackedAsins, setTrackedAsins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchAsins = async () => {
    try {
      const res = await fetch("http://localhost:8000/asin-tracker/");
      if (res.ok) {
        const data = await res.json();
        setTrackedAsins(data);
      }
    } catch (err) {
      console.error("Failed to fetch ASIN trackers", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAsins();
  }, []);

  async function addAsin() {
    const code = asinInput.trim();
    if (!code) { toast("Enter an ASIN code", "error"); return; }
    
    // Check if it already exists locally just for quick UI feedback
    if (trackedAsins.some(a => a.asin === code)) {
      toast("ASIN is already being tracked", "warning");
      return;
    }

    try {
      toast("Adding ASIN...", "info");
      const res = await fetch("http://localhost:8000/asin-tracker/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          asin: code, 
          title: nameInput.trim() || "Unknown Product", 
          pincode: pinInput.trim() || "400001" 
        })
      });

      const responseData = await res.json();

      if (res.ok) {
        toast("Now tracking " + code, "success");
        setAsinInput(""); setNameInput(""); setPinInput("");
        fetchAsins(); // Re-fetch to guarantee database sync
      } else {
        toast(responseData.detail || "Failed to add ASIN", "error");
      }
    } catch (err) {
       console.error(err);
       toast("Network error occurred", "error");
    }
  }

  async function removeAsin(code) {
    try {
      toast(`Removing ${code}...`, "info");
      const res = await fetch(`http://localhost:8000/asin-tracker/${code}`, {
        method: "DELETE"
      });

      if (res.ok || res.status === 204) {
        toast("Removed " + code, "success");
        setTrackedAsins(prev => prev.filter(a => a.asin !== code));
      } else {
        const errorData = await res.json();
        toast(errorData.detail || "Failed to remove ASIN", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error removing ASIN", "error");
    }
  }

  return (
    <div className="page-content">
      <div className="panel">
        <div className="ph"><h3>Track a New ASIN</h3></div>
        <div className="pb">
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg" style={{ flex: 1, minWidth: "150px", marginBottom: 0 }}>
              <label className="fl">ASIN Code</label>
              <input className="fi" id="ainput" placeholder="B08XYZ2ABC"
                style={{ fontFamily: "var(--font-m)" }}
                value={asinInput} onChange={(e) => setAsinInput(e.target.value)} />
            </div>
            <div className="fg" style={{ flex: 2, minWidth: "200px", marginBottom: 0 }}>
              <label className="fl">Product Name</label>
              <input className="fi" id="ninput" placeholder="SKF 6205 Deep Groove Ball Bearing"
                value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            </div>
            <div className="fg" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
              <label className="fl">PIN Code</label>
              <input className="fi" id="pinput" placeholder="400001"
                style={{ fontFamily: "var(--font-m)" }}
                value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
            </div>
            <button className="btn btn-green" style={{ height: "38px" }} onClick={addAsin}>+ Track</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <div>
            <h3>Tracked ASINs</h3>
            <div className="sub">Click row for details · Scrapes every 30 min</div>
          </div>
          <span className="sp on">● Scraper Running</span>
        </div>
        <div style={{ padding: 0 }}>
          <table className="dt">
            <thead>
              <tr>
                <th>ASIN</th><th>Product</th><th>Sellers</th>
                <th>Lowest Price</th><th>Last Scraped</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="atbody">
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
              ) : trackedAsins.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>No ASINs tracked yet.</td></tr>
              ) : (
                trackedAsins.map((a) => (
                  <tr key={a.asin}>
                    <td style={{ fontFamily: "var(--font-m)", fontSize: "0.78rem", color: "var(--green)" }}>{a.asin}</td>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td style={{ fontFamily: "var(--font-n)", fontSize: "1rem", fontWeight: 700, color: "var(--blue)" }}>{a.seller_count}</td>
                    <td>
                      <div className="pv" style={{ color: "var(--green)" }}>
                        {a.lowest_price ? `₹${a.lowest_price.toLocaleString("en-IN")}` : "--"}
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--muted)" }}>
                      {a.last_scraped ? new Date(a.last_scraped).toLocaleDateString() : "Pending"}
                    </td>
                    <td><span className={`sp ${a.status === "active" ? "on" : "off"}`}>● {a.status?.toUpperCase()}</span></td>
                    <td style={{ display: "flex", gap: "0.4rem", padding: "0.7rem 0.8rem" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => toast(`Scraping ${a.asin}...`, "info")}>
                        Scrape Now
                      </button>
                      <button className="btn btn-red btn-sm" onClick={() => removeAsin(a.asin)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
