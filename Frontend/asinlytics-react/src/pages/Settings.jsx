import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const toast = useToast();
  const [apiStatus, setApiStatus] = useState("on");
  const [dbStatus, setDbStatus] = useState("on");
  const [scraperStatus, setScraperStatus] = useState("on");

  function testConn() {
    toast("Testing...", "info");
    setTimeout(() => toast("All systems connected ✓", "success"), 1200);
  }

  return (
    <div className="page-content">
      <div className="panel" style={{ maxWidth: "640px" }}>
        <div className="ph"><h3>General Settings</h3></div>
        <div className="pb" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="fg">
            <label className="fl">Default ASIN</label>
            <input className="fi" defaultValue="B08XYZ2ABC" style={{ fontFamily: "var(--font-m)" }} />
          </div>
          <div className="fg">
            <label className="fl">Seller ID</label>
            <input className="fi" defaultValue="A1XXXXXXXXXXXX" style={{ fontFamily: "var(--font-m)" }} />
          </div>
          <div className="fg">
            <label className="fl">Scrape Interval</label>
            <select className="fs" defaultValue="Every 30 minutes">
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every 1 hour</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">Default Region</label>
            <select className="fs" defaultValue="West">
              <option>All India</option>
              <option>North</option>
              <option>West</option>
              <option>South</option>
              <option>East</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">Alert Email</label>
            <input className="fi" defaultValue="johndoe@gmail.com" type="email" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted2)", flex: 1 }}>Email alerts for HIGH severity</span>
            <input type="checkbox" defaultChecked style={{ accentColor: "var(--green)", width: "15px", height: "15px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted2)", flex: 1 }}>Auto-apply recommended prices</span>
            <input type="checkbox" style={{ accentColor: "var(--green)", width: "15px", height: "15px" }} />
          </div>
          <button className="btn btn-green" style={{ alignSelf: "flex-start" }}
            onClick={() => toast("Settings saved", "success")}>
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
