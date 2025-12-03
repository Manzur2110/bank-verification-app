import React, { useState } from "react";
import "./index.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [fields, setFields] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editing, setEditing] = useState(false);

  const [ifscInfo, setIfscInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleUpload = async () => {
    if (!file) return setErrorMsg("Please select a file.");

    setLoading(true);
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", file);

    let res;
    try {
      res = await fetch("http://localhost:5000/api/v1/uploads", {
        method: "POST",
        body: fd,
      });
    } catch (err) {
      setErrorMsg("❗ Cannot reach backend");
      setLoading(false);
      return;
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      setErrorMsg("❗ Invalid response from server");
      setLoading(false);
      return;
    }

    if (!json.success) {
      setErrorMsg("❗ Extraction failed: " + (json.error || "Unknown error"));
      setLoading(false);
      return;
    }

    setExtractedText(json.text || "");
    setFields(json.fields || {});
    setEditValues(json.fields || {});
    setIfscInfo(json.ifscVerification || null);

    setLoading(false);
  };

  const loadHistory = async () => {
    setErrorMsg("");
    setShowHistory(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/history");
      const json = await res.json();
      setHistory(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("History error:", err);
      setErrorMsg("❗ Failed to load history");
    }
  };

  const deleteRow = async (id) => {
    document.querySelector(`tr[data-row='${id}']`)?.classList.add("fade-out");

    setTimeout(async () => {
      const res = await fetch(`http://localhost:5000/api/v1/history/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        setHistory(history.filter((h) => h.id !== id));
      } else {
        alert("Delete failed");
      }
    }, 300);

    setConfirmDeleteId(null);
  };

  const saveEdits = async () => {
    const res = await fetch("http://localhost:5000/api/v1/updateRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editValues),
    });

    const json = await res.json();

    if (json.success) {
      setFields(editValues);
      setEditing(false);
    } else {
      alert("Failed to save changes");
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedHistory = [...history].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    // Numeric sorting for account number
    if (key === "accountNumber") {
      const numA = parseInt(a[key] || "0");
      const numB = parseInt(b[key] || "0");
      return direction === "asc" ? numA - numB : numB - numA;
    }

    // Numeric sorting for createdAt timestamp
    if (key === "createdAt") {
      const tA = new Date(a[key]);
      const tB = new Date(b[key]);
      return direction === "asc" ? tA - tB : tB - tA;
    }

    // String comparison sorting
    let valueA = (a[key] || "").toString().toLowerCase();
    let valueB = (b[key] || "").toString().toLowerCase();

    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="page">
      <div className="card app-shell">

        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            <div className="logo-circle">🏦</div>
            <div>
              <h1>Bank Document Extractor</h1>
              <p className="subtitle">Upload a bank PDF and verify details instantly</p>
            </div>
          </div>
        </header>

        {/* UPLOAD SECTION */}
        <div className="upload-box">
          <label className="upload-label">Upload PDF Bank Document</label>
          <div className="upload-controls">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button onClick={handleUpload} disabled={loading}>
              {loading ? "Processing..." : "Upload & Validate"}
            </button>
            <button
              onClick={loadHistory}
              style={{ background: "#555", marginLeft: "10px" }}
            >
              View History
            </button>
          </div>
          <p className="upload-hint">Only PDF files up to 5MB.</p>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {/* ============================================ */}
        {/* HISTORY PANEL */}
        {/* ============================================ */}
        {showHistory && (
          <div className="history-panel">
            <h2 className="section-title">Saved Records</h2>

            {/* Search field */}
            <input
              type="text"
              placeholder="🔍 Search name, IFSC, bank, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            {history.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                No records found yet.
              </p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("accountName")}>
                      Name {sortConfig.key === "accountName" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th onClick={() => handleSort("accountNumber")}>
                      Account Number {sortConfig.key === "accountNumber" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th onClick={() => handleSort("ifsc")}>
                      IFSC {sortConfig.key === "ifsc" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th onClick={() => handleSort("bankName")}>
                      Bank {sortConfig.key === "bankName" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th onClick={() => handleSort("branch")}>
                      Branch {sortConfig.key === "branch" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th onClick={() => handleSort("createdAt")}>
                      Created {sortConfig.key === "createdAt" ? (sortConfig.direction === "asc" ? "⬆" : "⬇") : ""}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory
                    .filter((h) =>
                      (h.accountName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (h.accountNumber || "").includes(searchTerm) ||
                      (h.ifsc || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (h.bankName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (h.branch || "").toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((h) => (
                      <tr key={h.id} data-row={h.id}>
                        <td><strong>{h.accountName}</strong></td>
                        <td>{h.accountNumber}</td>
                        <td>{h.ifsc}</td>
                        <td>{h.bankName}</td>
                        <td>{h.branch}</td>
                        <td>{h.createdAt ? h.createdAt.slice(0, 10) : ""}</td>
                        <td>
                          <button
                            onClick={() => setConfirmDeleteId(h.id)}
                            className="icon-btn delete-btn"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            <button
              onClick={() => setShowHistory(false)}
              className="icon-btn close-btn"
            >
              ✖ Close
            </button>
          </div>
        )}

        {confirmDeleteId && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Delete this record?</h3>
              <p>This action cannot be undone.</p>

              <div className="modal-actions">
                <button
                  className="modal-btn delete"
                  onClick={() => deleteRow(confirmDeleteId)}
                >
                  Yes, delete
                </button>
                <button
                  className="modal-btn cancel"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
