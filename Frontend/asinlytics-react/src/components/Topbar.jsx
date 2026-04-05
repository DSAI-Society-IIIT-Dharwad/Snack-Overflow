import React, { useState } from "react";
import { SELLERS } from "../data/data";
import { useToast } from "../context/ToastContext";

export default function Topbar({ currentPage, meta, onSearchChange, onNav }) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastScrape, setLastScrape] = useState("2 min ago");
  const toast = useToast();

  function doRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastScrape("just now");
      toast("Data refreshed", "success");
    }, 1500);
  }

  function doExport() {
    const rows = [
      ["Seller", "Price", "Type", "Region", "Location"],
      ...SELLERS.map((s) => [s.name, s.price, s.type, s.region, s.loc]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "asinlytics_export.csv";
    a.click();
    toast("Exported to CSV", "success");
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1 id="ptitle">{meta?.t || "Dashboard"}</h1>
        <div className="page-sub" id="psub">{meta?.s || ""}</div>
        <div className="live-dot">Live · Last scraped <span id="lscrape">{lastScrape}</span></div>
      </div>
      <div className="topbar-right">
        <input
          className="gsearch"
          id="gsearch"
          placeholder="Search ASIN"
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {/* <button
          className="btn btn-outline"
          id="refbtn"
          onClick={doRefresh}
          disabled={refreshing}
        >
          {refreshing ? <><span className="spin"></span> Refreshing</> : "↺ Refresh"}
        </button> */}
        <button className="btn btn-green" onClick={doExport}>⬇ Export</button>
      </div>
    </div>
  );
}
