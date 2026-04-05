import React, { useState } from "react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";

export default function RuleModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("Competitive");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minMargin, setMinMargin] = useState("");
  const toast = useToast();

    function submit() {
    if (!name.trim()) { toast("Enter a rule name", "error"); return; }
    onSubmit({ name: name.trim(), asin: "All", strategy, minMargin, lastRun: "Never" });
    setName(""); setStrategy("Competitive"); setMinPrice(""); setMaxPrice(""); setMinMargin("");
  }


  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Reprice Rule"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={submit}>Save Rule</button>
        </>
      }
    >
      <div className="fg">
        <label className="fl">Rule Name</label>
        <input className="fi" id="rname" placeholder="Beat Lowest FBA"
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="fg">
        <label className="fl">Strategy</label>
        <select className="fs" id="rstrat2" value={strategy}
          onChange={(e) => setStrategy(e.target.value)}>
          <option>Competitive</option>
          <option>Margin-First</option>
          <option>Midpoint</option>
        </select>
      </div>
      <div className="frow">
        <div className="fg">
          <label className="fl">Min Price (₹)</label>
          <input className="fi" id="rmin" type="number" placeholder="2000"
            value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
             />
        </div>
        <div className="fg">
          <label className="fl">Max Price (₹)</label>
          <input className="fi" id="rmax" type="number" placeholder="3000"
            value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
         <div className="fg">
        <label className="fl">Minimum Margin (%)</label>
        <input className="fi" id="rminmargin" type="number" placeholder="15"
          value={minMargin} onChange={(e) => setMinMargin(e.target.value)} />
      </div>
      </div>
    </Modal>
  );
}
