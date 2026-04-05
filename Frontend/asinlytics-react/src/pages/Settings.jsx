import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const toast = useToast();
  // We use a dummy UUID since the real auth context isn't fully integrated here yet
  const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000000";

  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    default_asin: "B001",
    seller_id: "A1X",
    scrape_interval: 30,
    default_region: "North TN",
    alert_email: "",
    high_severity_alerts: true,
    auto_apply_prices: false
  });

  // Fetch settings on mount
  useEffect(() => {
    fetch(`http://localhost:8000/settings/${DUMMY_USER_ID}`)
      .then(res => {
        if (res.ok) return res.json();
        // If 404, we'll just keep local defaults
        throw new Error("No settings found");
      })
      .then(data => {
        // Only load if valid
        if (data.id) setSettings(data);
        setIsLoading(false);
      })
      .catch((err) => setIsLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    toast("Saving settings...", "info");
    
    // Check if we need to POST (create) or PUT (update) based on id existence
    const method = settings.id ? "PUT" : "POST";
    const url = settings.id 
      ? `http://localhost:8000/settings/${DUMMY_USER_ID}` 
      : `http://localhost:8000/settings/`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, user_id: DUMMY_USER_ID }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      const updatedData = await res.json();
      setSettings(updatedData);
      toast("Settings saved correctly!", "success");
    } catch (err) {
      console.error(err);
      toast("Error saving settings.", "error");
    }
  };

  if (isLoading) return <div className="page-content" style={{ padding: "2rem" }}>Loading settings...</div>;

  return (
    <div className="page-content">
      <div className="panel" style={{ maxWidth: "640px" }}>
        <div className="ph"><h3>General Settings</h3></div>
        <div className="pb" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="fg">
            <label className="fl">Default ASIN</label>
            <input name="default_asin" value={settings.default_asin || ""} onChange={handleChange} className="fi" style={{ fontFamily: "var(--font-m)" }} />
          </div>
          <div className="fg">
            <label className="fl">Seller ID</label>
            <input name="seller_id" value={settings.seller_id || ""} onChange={handleChange} className="fi" style={{ fontFamily: "var(--font-m)" }} />
          </div>
          <div className="fg">
            <label className="fl">Scrape Interval</label>
            <select name="scrape_interval" value={settings.scrape_interval || 30} onChange={handleChange} className="fs">
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 1 hour</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">Default Region</label>
            <select name="default_region" value={settings.default_region || "West TN"} onChange={handleChange} className="fs">
              <option value="North TN">North TN</option>
              <option value="West TN">West TN</option>
              <option value="South TN">South TN</option>
              <option value="Central TN">Central TN</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">Alert Email</label>
            <input name="alert_email" value={settings.alert_email || ""} onChange={handleChange} className="fi" type="email" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted2)", flex: 1 }}>Email alerts for HIGH severity</span>
            <input name="high_severity_alerts" checked={!!settings.high_severity_alerts} onChange={handleChange} type="checkbox" style={{ accentColor: "var(--green)", width: "15px", height: "15px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted2)", flex: 1 }}>Auto-apply recommended prices</span>
            <input name="auto_apply_prices" checked={!!settings.auto_apply_prices} onChange={handleChange} type="checkbox" style={{ accentColor: "var(--green)", width: "15px", height: "15px" }} />
          </div>
          <button className="btn btn-green" style={{ alignSelf: "flex-start" }} onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>

      {/* <div className="panel" style={{ maxWidth: "640px", marginTop: "1rem" }}>
        <div className="ph">
          <div>
            <h3>API Connection</h3>
            <div className="sub">Backend · PostgreSQL · Scraper</div>
          </div>
        </div>
        <div className="pb" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.83rem" }}>Backend API (localhost:5000)</span>
            <span className="sp on" id="apis">● CONNECTED</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.83rem" }}>PostgreSQL Database</span>
            <span className="sp on" id="dbs">● CONNECTED</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.83rem" }}>Python Scraper</span>
            <span className="sp on" id="scrs">● RUNNING</span>
          </div>
          <button className="btn btn-outline" style={{ alignSelf: "flex-start", marginTop: "0.3rem" }}
            onClick={testConn}>
            Test Connections
          </button>
        </div> */}
      {/* </div> */}
    </div>
  );
}
