import React, { useState } from "react";
import { useToast } from "../context/ToastContext";
import RuleModal from "../modals/RuleModal";

function calcPrice(cost, mg, comp, avg, strategy) {
  let p;
  if (strategy === "competitive") p = comp - 1;
  else if (strategy === "margin") p = Math.ceil(cost * (1 + mg / 100));
  else p = Math.ceil((comp + avg) / 2);
  return Math.max(p, Math.ceil(cost * 1.05));
}

export default function RepriceEngine({ rules, onAddRule, onDeleteRule }) {
  const toast = useToast();
  const [cost, setCost] = useState(1950);
  const [margin, setMargin] = useState(12);
  const [comp, setComp] = useState(2199);
  const [avg, setAvg] = useState(2380);
  const [strategy, setStrategy] = useState("margin");
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  const price = calcPrice(cost, margin, comp, avg, strategy);
  const profit = price - cost;
  const marginPct = ((profit / cost) * 100).toFixed(1);

  function applyPrice() {
    toast(`Price ₹${price.toLocaleString("en-IN")} applied ✓`, "success");
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
                onChange={(e) => setCost(+e.target.value || 0)} />
            </div>
            <div className="fg">
              <label className="fl">Minimum Margin (%)</label>
              <input className="range" id="rmargin" type="range" min="5" max="40" value={margin}
                onChange={(e) => setMargin(+e.target.value)} />
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
                onChange={(e) => setStrategy(e.target.value)}>
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
              {rules.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.75rem", color: "var(--green)" }}>{r.asin}</td>
                  <td style={{ fontSize: "0.78rem", color: "var(--muted2)" }}>{r.strategy}</td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.75rem", color: "var(--green)" }}>{r.minMargin ? `${r.minMargin}%` : "5%"}</td>
                  <td><span className="sp on">● ACTIVE</span></td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--muted)" }}>{r.lastRun}</td>
                  <td style={{ display: "flex", gap: "0.4rem", padding: "0.7rem 0.8rem" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => toast("Rule paused", "info")}>Pause</button>
                    <button className="btn btn-red btn-sm" onClick={() => { onDeleteRule(i); toast("Rule deleted", "info"); }}>Delete</button>
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
        onSubmit={(rule) => { onAddRule(rule); setRuleModalOpen(false); toast(`Rule "${rule.name}" added`, "success"); }}
      />
    </div>
  );
}
