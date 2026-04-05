import React, { useState } from "react";

export default function AlertsCenter({ alerts, onMarkRead, onMarkAllRead }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.sev === filter);
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="page-content">
      <div className="panel">
        <div className="ph">
          <div>
            <h3>Alerts Center</h3>
            <div className="sub" id="alertpgsub">{unread} active alerts</div>
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
              <div className="al-icon">{a.icon}</div>
              <div className="al-body">
                <div className="al-title">{a.title}</div>
                <div className="al-desc">{a.desc}</div>
                <div className="al-time">
                  {a.time}{a.read ? <> · <span style={{ color: "var(--muted)" }}>Read</span></> : ""}
                </div>
              </div>
              <span className={`al-sev s${a.sev.charAt(0)}`}>{a.sev.toUpperCase()}</span>
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
