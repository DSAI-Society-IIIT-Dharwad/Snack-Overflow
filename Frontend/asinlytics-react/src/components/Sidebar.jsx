import React from "react";
import { META } from "../data/data";
import {
  LayoutDashboard,
  Search,
  Users,
  TrendingUp,
  Zap,
  Map,
  Bell,
  Settings
} from "lucide-react";

export default function Sidebar({ currentPage, onNav, alertCount }) {
  const navItems = [
    { key: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { key: "asin", icon: <Search size={20} />, label: "ASIN Tracker" },
    { key: "sellers", icon: <Users size={20} />, label: "Seller Intel" },
    { key: "trends", icon: <TrendingUp size={20} />, label: "Price Trends" },
    { key: "reprice", icon: <Zap size={20} />, label: "Reprice Engine" },
    { key: "regions", icon: <Map size={20} />, label: "Regional Insights" },
    { key: "alerts", icon: <Bell size={20} />, label: "Alerts Center", badge: alertCount },
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
        <span className="nav-icon"><Settings size={20} /></span>Settings
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