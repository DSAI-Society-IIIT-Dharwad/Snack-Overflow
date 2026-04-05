import React from "react";
import { META } from "../data/data";


export default function Sidebar({ currentPage, onNav, alertCount }) {
  const navItems = [
    { key: "dashboard", icon: "⬛", label: "Dashboard" },
    { key: "asin", icon: "🔍", label: "ASIN Tracker" },
    { key: "sellers", icon: "👥", label: "Seller Intel" },
    { key: "trends", icon: "📈", label: "Price Trends" },
    { key: "reprice", icon: "⚡", label: "Reprice Engine" },
    { key: "regions", icon: "🗺️", label: "Regional Insights" },
    { key: "alerts", icon: "🔔", label: "Alerts Center", badge: alertCount },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand">ASIN<span>Lytics</span></div>
        <div className="brand-sub">PRICING INTELLIGENCE</div>
      </div>

      <div className="nav-sec">Main Menu</div>
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`nav-item${currentPage === item.key ? " active" : ""}`}
          onClick={() => onNav(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.badge > 0 && (
            <span className="nav-badge" id="abadge">{item.badge}</span>
          )}
        </div>
      ))}

      <div className="nav-sec">System</div>
      <div
        className={`nav-item${currentPage === "settings" ? " active" : ""}`}
        onClick={() => onNav("settings")}
      >
        <span className="nav-icon">⚙️</span>Settings
      </div>

      <div className="sb-footer">
        <div className="pro-pill">
          <div className="pro-label">PRO PLAN</div>
          <div className="pro-bar-bg"><div className="pro-bar"></div></div>
          <div className="pro-sub">275 / 500 ASINs tracked</div>
        </div>
      </div>
    </aside>
  );
}
