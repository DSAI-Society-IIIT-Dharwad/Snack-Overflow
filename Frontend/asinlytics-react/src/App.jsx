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
  const [alerts, setAlerts] = useState([]);
  const [asins, setAsins] = useState(INITIAL_ASINS);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAsin, setActiveAsin] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [recommendedPriceData, setRecommendedPriceData] = useState(null);
  const [repriceConfig, setRepriceConfig] = useState({ cost: 1950, margin: 12, strategy: "margin" });

  const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000000";

  React.useEffect(() => {
    fetch(`http://localhost:8000/settings/${DUMMY_USER_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          if (data.seller_id) setSellerId(data.seller_id);
          if (data.default_asin) setActiveAsin(data.default_asin);
        }
      })
      .catch(err => console.log("No settings yet"));

    if (activeAsin) {
      fetchAlerts(activeAsin, sellerId);
    }
  }, [activeAsin, sellerId]);

  function fetchAlerts(asin, sid) {
    if (!asin) return;
    fetch(`http://localhost:8000/alerts/?asin=${asin}&seller_id=${sid || ""}`)
      .then(res => res.json())
      .then(data => {
        // Map backend alerts to frontend structure if necessary
        // Backend: { alerts: [ { alert_type, title, message, severity, detected_at, is_read } ] }
        const mapped = (data.alerts || []).map(a => ({
          id: a.id,
          title: a.title,
          desc: a.message,
          detected_at: a.detected_at, // Keep raw ISO string for relative time calc
          sev: a.severity,
          read: a.is_read,
          alert_type: a.alert_type
        }));
        setAlerts(mapped);
      })
      .catch(console.error);
  }

  const alertCount = alerts.filter((a) => !a.read).length;

  function markRead(id) {
    if (id < 0) {
      // Synthetic alert (like "New Competitor") - just mark local
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
      return;
    }
    fetch(`http://localhost:8000/alerts/${id}/read`, { method: 'PATCH' })
      .then(() => {
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
      })
      .catch(console.error);
  }

  function markAllRead() {
    if (!activeAsin) return;
    fetch(`http://localhost:8000/alerts/mark-all-read?asin=${activeAsin}`, { method: 'POST' })
      .then(() => {
        setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      })
      .catch(console.error);
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
            recommendedPriceData={recommendedPriceData}
            onNav={setPage}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            searchQuery={searchQuery}
          />
        );
      case "asin":
        return <AsinTracker asins={asins} onAdd={addAsin} onDelete={deleteAsin} />;
      case "sellers":
        return <SellerIntel asin={activeAsin} />;
      case "trends":
        return <PriceTrends asin={activeAsin} sellerId={sellerId} />;
      case "reprice":
        return <RepriceEngine rules={rules} onAddRule={addRule} onDeleteRule={deleteRule} asin={activeAsin} sellerId={sellerId} onApplyPrice={setRecommendedPriceData} repriceConfig={repriceConfig} setRepriceConfig={setRepriceConfig} />;
      case "regions":
        return <RegionalInsights asin={activeAsin} />;
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
          onAsinSearch={setActiveAsin}
          onNav={setPage}
        />
        {renderPage()}
      </div>
    </div>
  </ToastProvider>
);
}