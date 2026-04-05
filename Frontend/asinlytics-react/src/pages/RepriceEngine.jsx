import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import RuleModal from "../modals/RuleModal";

function calcPrice(cost, mg, comp, avg, strategy) {
  let p;
  if (strategy === "competitive") p = comp - 1;
  else if (strategy === "margin") p = Math.ceil(cost * (1 + mg / 100));
  else p = Math.ceil((comp + avg) / 2);
  return Math.max(p, Math.ceil(cost * 1.05));
}

export default function RepriceEngine({ asin, sellerId, onApplyPrice, repriceConfig, setRepriceConfig }) {
  const toast = useToast();
  
  // Destructure config gracefully
  const { cost, margin, strategy } = repriceConfig;
  
  const [comp, setComp] = useState(2199);
  const [avg, setAvg] = useState(2380);
  
  const [dbRules, setDbRules] = useState([]);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  useEffect(() => {
    if (!asin) return;
    // Pre-fill fields from live market
    fetch(`http://localhost:8000/reprice/prices?asin=${asin}`)
      .then(res => {
        if (!res.ok) throw new Error("Price data missing");
        return res.json();
      })
      .then(data => {
        if (data.lowest_price) setComp(data.lowest_price);
        if (data.market_avg) setAvg(data.market_avg);
      })
      .catch(err => console.error("Market fetch override: ", err));
  }, [asin]);

  const fetchRules = () => {
    fetch("http://localhost:8000/reprice/rules")
      .then(res => res.json())
      .then(data => setDbRules(data))
      .catch(console.error);
  };
  
  useEffect(() => {
    fetchRules();
  }, []);

  const price = calcPrice(cost, margin, comp, avg, strategy);
  const profit = price - cost;
  const marginPct = cost ? ((profit / cost) * 100).toFixed(1) : "0.0";

  async function applyPrice() {
    if (!asin || !sellerId) {
      toast("No ASIN or Seller ID selected", "error");
      return;
    }
    try {
      const payload = {
        asin,
        seller_id: sellerId,
        price,
        strategy_used: strategy
      };
      
      const res = await fetch("http://localhost:8000/reprice/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast(`Price ₹${price.toLocaleString("en-IN")} applied ✓`, "success");
        // Trigger dashboard sync globally in App.jsx
        onApplyPrice({
           price, 
           cost, 
           profit, 
           marginPct, 
           comp, 
           avg, 
           strategy 
        });
      } else {
         toast("Failed to apply price externally.", "error");
      }
    } catch (e) {
      toast("API error during Apply", "error");
    }
  }

  async function handleAddRule(rule) {
     try {
       const res = await fetch("http://localhost:8000/reprice/rules", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           name: rule.name,
           asin: rule.asin,
           strategy: rule.strategy,
           min_margin: parseFloat(rule.minMargin) || 12.0,
           min_price: parseFloat(rule.minPrice) || null,
           max_price: parseFloat(rule.maxPrice) || null
         })
       });
       if (res.ok) {
         toast(`Rule "${rule.name}" added`, "success");
         setRuleModalOpen(false);
         fetchRules();
       } else {
         toast("Error creating server rule (check backend limits)", "error");
       }
     } catch(e) { console.error(e); }
  }

  async function handleDeleteRule(id) {
    try {
       const res = await fetch(`http://localhost:8000/reprice/rules/${id}`, { method: "DELETE" });
       if (res.ok) {
         toast("Rule deleted", "info");
         fetchRules();
       }
    } catch(e) { console.error(e); }
  }

  async function handleToggleRule(id) {
    try {
       const res = await fetch(`http://localhost:8000/reprice/rules/${id}/toggle`, { method: "PATCH" });
       if (res.ok) {
         toast("Rule status toggled", "info");
         fetchRules();
       }
    } catch(e) { console.error(e); }
  }

  if (!asin) {
    return (
       <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div style={{ color: "var(--muted)", fontFamily: "var(--font-m)", fontSize: "1.1rem" }}>
            -- No ASIN Selected --
          </div>
       </div>
    );
  }

  return (
    <div className="page-content">
      <div className="g2">
        {/* Calculator */}
        <div className="panel">
          <div className="ph">
            <div>
              <h3>Reprice Calculator</h3>
              <div className="sub">Enter your constraints</div>
            </div>
          </div>
          <div className="pb">
            <div className="fg">
              <label className="fl">Your Cost Price (₹)</label>
              <input className="fi" id="rcost" type="number" value={cost}
                onChange={(e) => setRepriceConfig({ ...repriceConfig, cost: +e.target.value || 0 })} />
            </div>
            <div className="fg">
              <label className="fl">Minimum Margin (%)</label>
              <input className="range" id="rmargin" type="range" min="5" max="40" value={margin}
                onChange={(e) => setRepriceConfig({ ...repriceConfig, margin: +e.target.value })} />
              <div style={{ fontFamily: "var(--font-m)", fontSize: "0.72rem", color: "var(--green)", marginTop: "0.3rem" }}>
                {margin}%
              </div>
            </div>
            <div className="frow">
              <div className="fg">
                <label className="fl">Lowest Competitor (₹)</label>
                <input className="fi" id="rcomp" type="number" value={comp}
                  onChange={(e) => setComp(+e.target.value || 0)} />
              </div>
              <div className="fg">
                <label className="fl">Market Average (₹)</label>
                <input className="fi" id="ravg" type="number" value={avg}
                  onChange={(e) => setAvg(+e.target.value || 0)} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">Strategy</label>
              <select className="fs" id="rstrat" value={strategy}
                onChange={(e) => setRepriceConfig({ ...repriceConfig, strategy: e.target.value })}>
                <option value="competitive">Competitive (beat lowest by ₹1)</option>
                <option value="margin">Margin-First (cost + margin%)</option>
                <option value="mid">Midpoint (lowest + market avg / 2)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="panel">
          <div className="ph"><div><h3>Output</h3></div></div>
          <div className="pb" style={{ textAlign: "center", paddingTop: "2rem" }}>
            <div style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--green)", letterSpacing: "0.1em" }}>
               RECOMMENDED PRICE
            </div>
            <div id="rout" style={{ fontFamily: "var(--font-n)", fontSize: "3rem", fontWeight: 700, color: "var(--green)", margin: "0.5rem 0" }}>
              ₹{price.toLocaleString("en-IN")}
            </div>
            <div id="routsub" style={{ fontFamily: "var(--font-m)", fontSize: "0.72rem", color: "var(--muted2)" }}>
              Margin: {marginPct}% · ₹{profit.toLocaleString("en-IN")} profit/unit
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", marginTop: "1.5rem" }}>
              <div className="ri"><div className="ri-label">COST</div><div className="ri-val" id="roc">₹{cost.toLocaleString("en-IN")}</div></div>
              <div className="ri"><div className="ri-label">PROFIT</div><div className="ri-val" id="rop" style={{ color: "var(--green)" }}>₹{profit.toLocaleString("en-IN")}</div></div>
              <div className="ri"><div className="ri-label">MARGIN</div><div className="ri-val" id="rom" style={{ color: "var(--green)" }}>{marginPct}%</div></div>
            </div>
            <button className="btn btn-green" style={{ width: "100%", marginTop: "1.5rem" }} onClick={applyPrice}>
              ✓ Apply This Price
            </button>
          </div>
        </div>
      </div>

      {/* Automated Rules */}
      <div className="panel">
        <div className="ph">
          <div>
            <h3>Automated Rules</h3>
            <div className="sub">Run on every scrape cycle</div>
          </div>
          <button className="btn btn-green" onClick={() => setRuleModalOpen(true)}>+ Add Rule</button>
        </div>
        <div style={{ padding: 0 }}>
          <table className="dt">
            <thead>
              <tr><th>Rule Name</th><th>ASIN</th><th>Strategy</th><th>Min Margin</th><th>Status</th><th>Last Run</th><th>Actions</th></tr>
            </thead>
            <tbody id="rulebody">
              {dbRules.length === 0 ? (
                 <tr><td colSpan="7" style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)" }}>No rules found.</td></tr>
              ) : dbRules.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.75rem", color: "var(--green)" }}>{r.asin}</td>
                  <td style={{ fontSize: "0.78rem", color: "var(--muted2)" }}>{r.strategy}</td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.75rem", color: "var(--green)" }}>{r.min_margin ? `${r.min_margin}%` : "5%"}</td>
                  <td>
                     {r.status === "active" ? (
                        <span className="sp on">● ACTIVE</span>
                     ) : (
                        <span className="sp off">● PAUSED</span>
                     )}
                  </td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--muted)" }}>
                     {r.last_run ? new Date(r.last_run).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ display: "flex", gap: "0.4rem", padding: "0.7rem 0.8rem" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleToggleRule(r.id)}>{r.status === "active" ? "Pause" : "Resume"}</button>
                    <button className="btn btn-red btn-sm" onClick={() => handleDeleteRule(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RuleModal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSubmit={handleAddRule}
        defaultAsin={asin}
      />
    </div>
  );
}
