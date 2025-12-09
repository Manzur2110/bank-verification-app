// ExtractedDataView.jsx — reads lastExtractedData from localStorage and shows tabs
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ExtractedDataView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("raw");

  useEffect(() => {
    const saved = localStorage.getItem("lastExtractedData");
    if (saved) setData(JSON.parse(saved));
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="card">
          <p>No extracted data found.</p>
          <button onClick={() => navigate("/")}>← Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <button onClick={() => navigate("/")} className="back-btn">← Back</button>

        <h2>📄 Full Extraction Viewer</h2>

        <div className="tab-buttons">
          <button className={activeTab === "raw" ? "tab-active" : ""} onClick={() => setActiveTab("raw")}>Raw Text</button>
          <button className={activeTab === "kv" ? "tab-active" : ""} onClick={() => setActiveTab("kv")}>Key-Value Summary</button>
          <button className={activeTab === "stats" ? "tab-active" : ""} onClick={() => setActiveTab("stats")}>Stats</button>
        </div>

        <div className="tab-content">
          {activeTab === "raw" && <pre className="raw-text-box">{data.text}</pre>}

          {activeTab === "kv" && (
            <div className="kv-list">
              {Object.entries(data.fields).map(([k, v]) => (
                <div key={k} className="kv-item">
                  <label>{k}</label>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="stats-box">
              <h3>Stats</h3>
              <p>Lines: {data.text.split("\n").length}</p>
              <p>Words: {data.text.split(/\s+/).length}</p>
              <p>Characters: {data.text.length}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
