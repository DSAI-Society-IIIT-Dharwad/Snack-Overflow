import React, { useState } from "react";

const ICON_MAP = {
  undercut: "⚡",
  spike: "📈",
  price_drop: "📉",
  price_change: "⚙️",
  new_competitor: "👥",
};

export default function AlertsCenter({ alerts, onMarkRead, onMarkAllRead }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.sev === filter);
  const unreadCount = alerts.filter((a) => !a.read).length;

  function getTimeAgo(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="page-content">
      <div className="panel">
        <div className="ph">
          <div>
            <h3>Alerts Center</h3>
            <div className="sub" id="alertpgsub">{unreadCount} active alerts</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div className="tabs" id="alftabs">
              {["all", "high", "med", "low"].map((f) => (
                <button key={f} className={`tab${filter === f ? " active" : ""}`}
                  onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-outline btn-sm" onClick={onMarkAllRead}>Mark All Read</button>
          </div>
        </div>
        <div className="pb" id="alertspg">
          {filtered.length ? filtered.map((a) => (
            <div key={a.id} className={`al${a.read ? " read" : ""}`} onClick={() => onMarkRead(a.id)}>
              <div className="al-icon">{ICON_MAP[a.alert_type] || "🔔"}</div>
              <div className="al-body">
                <div className="al-title">{a.title}</div>
                <div className="al-desc">{a.desc}</div>
                <div className="al-time">
                  {getTimeAgo(a.detected_at || a.time)}{a.read ? <> · <span style={{ color: "var(--muted)" }}>Read</span></> : ""}
                </div>
              </div>
              <span className={`al-sev s${a.sev?.charAt(0) || 'l'}`}>{a.sev?.toUpperCase() || 'LOW'}</span>
            </div>
          )) : (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: "0.85rem" }}>
              ✓ No alerts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
