import React, { useState } from "react";
import "./index.css";
import { ToastProvider } from "./context/ToastContext";
import { META, SELLERS, INITIAL_ALERTS, INITIAL_ASINS, INITIAL_RULES } from "./data/data";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import AsinTracker from "./pages/AsinTracker";
import SellerIntel from "./pages/SellerIntel";
import PriceTrends from "./pages/PriceTrends";
import RepriceEngine from "./pages/RepriceEngine";
import RegionalInsights from "./pages/RegionalInsights";
import AlertsCenter from "./pages/AlertsCenter";
import Settings from "./pages/Settings";
import Landing from "./pages/Landing";


export default function App() {
  const [page, setPage] = useState("dashboard");
  const [authed, setAuthed] = useState(false);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [asins, setAsins] = useState(INITIAL_ASINS);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAsin, setActiveAsin] = useState("B08XYZ2");
  const [sellerId, setSellerId] = useState("SELLER_12345");

  const alertCount = alerts.filter((a) => !a.read).length;

  function markRead(id) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }

  function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }

  function addAsin(asin) {
    setAsins((prev) => [...prev, asin]);
  }

  function deleteAsin(code) {
    setAsins((prev) => prev.filter((a) => a.asin !== code));
  }

  function addRule(rule) {
    setRules((prev) => [...prev, rule]);
  }

  function deleteRule(index) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

 function renderPage() {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            asin={activeAsin}             // <--- Add your dynamic ASIN state or variable here
            sellerId={sellerId}    // <--- Add your dynamic Seller ID state or variable here
            alerts={alerts}
            onNav={setPage}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            searchQuery={searchQuery}
          />
        );
      case "asin":
        return <AsinTracker asins={asins} onAdd={addAsin} onDelete={deleteAsin} />;
      case "sellers":
        return <SellerIntel sellers={SELLERS} />;
      case "trends":
        return <PriceTrends />;
      case "reprice":
        return <RepriceEngine rules={rules} onAddRule={addRule} onDeleteRule={deleteRule} />;
      case "regions":
        return <RegionalInsights />;
      case "alerts":
        return <AlertsCenter alerts={alerts} onMarkRead={markRead} onMarkAllRead={markAllRead} />;
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  }

  if (!authed) {
  return (
    <ToastProvider>
      <Landing onLogin={() => setAuthed(true)} />
    </ToastProvider>
  );
}

return (
  <ToastProvider>
    <div style={{display: 'flex', width: '100%', height: '100vh'}}>
      <Sidebar currentPage={page} onNav={setPage} alertCount={alertCount} />
      <div className="main">
        <Topbar
          currentPage={page}
          meta={META[page]}
          onSearchChange={setSearchQuery}
          onNav={setPage}
        />
        {renderPage()}
      </div>
    </div>
  </ToastProvider>
);
}