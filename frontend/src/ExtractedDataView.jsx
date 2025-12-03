import React, { useState, useEffect } from "react";
import "./index.css";
import { useNavigate } from "react-router-dom";

export default function ExtractedDataView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("raw");
  const [data, setData] = useState(null);

  useEffect(() => {
    const d = localStorage.getItem("lastExtractedData");
    if (d) {
      setData(JSON.parse(d));
    }
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="card app-shell">
          <p>No extracted data found</p>
          <button onClick={() => navigate("/")}>← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card app-shell">

        <button onClick={() => navigate("/")} className="back-btn">
          ← Back
        </button>

        <h2>📄 Full Data Extraction Viewer</h2>

        {/* TAB BUTTONS */}
        <div className="tab-buttons">
          <button 
            className={activeTab==="raw" ? "tab-active" : ""} 
            onClick={() => setActiveTab("raw")}
          >Raw Text</button>

          <button 
            className={activeTab==="kv" ? "tab-active" : ""} 
            onClick={() => setActiveTab("kv")}
          >Key-Value Summary</button>

          <button 
            className={activeTab==="stats" ? "tab-active" : ""} 
            onClick={() => setActiveTab("stats")}
          >Transaction Analysis</button>
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">

          {activeTab === "raw" && (
            <pre className="raw-text-box">
              {data.text}
            </pre>
          )}

          {activeTab === "kv" && (
            <div className="kv-list">
              {Object.entries(data.fields).map(([key, value]) => (
                <div className="kv-item" key={key}>
                  <label>{key}:</label>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="stats-box">
              <h3>Transaction Stats</h3>
              <p>Total lines detected: {data.text.split("\n").length}</p>
              <p>Total words detected: {data.text.split(/\s+/).length}</p>
              <p>Total characters: {data.text.length}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
