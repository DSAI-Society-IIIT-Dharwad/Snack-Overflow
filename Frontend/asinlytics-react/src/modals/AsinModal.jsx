import React, { useState } from "react";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";

export default function AsinModal({ open, onClose, onSubmit }) {
  const [asin, setAsin] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const toast = useToast();

  function submit() {
    if (!asin.trim()) { toast("ASIN required", "error"); return; }
    onSubmit({ asin: asin.trim(), name: name.trim() || "Unknown", sellers: 0, lowest: "Scraping...", scraped: "Just added" });
    setAsin(""); setName(""); setPin("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Track New ASIN"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={submit}>Start Tracking</button>
        </>
      }
    >
      <div className="fg">
        <label className="fl">ASIN Code</label>
        <input className="fi" id="masin" placeholder="B08XYZ2ABC"
          style={{ fontFamily: "var(--font-m)" }}
          value={asin} onChange={(e) => setAsin(e.target.value)} />
      </div>
      <div className="fg">
        <label className="fl">Product Name</label>
        <input className="fi" id="mname" placeholder="SKF 6205 Bearing"
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="frow">
        <div className="fg">
          <label className="fl">PIN Code</label>
          <input className="fi" id="mpin" placeholder="400001"
            value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
        <div className="fg">
          <label className="fl">Category</label>
          <select className="fs">
            <option>Bearings</option>
            <option>Industrial</option>
            <option>Automotive</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
