import React, { useState, useEffect } from "react";
import "./index.css";
import { useNavigate } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();

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
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const handleUpload = async () => {
    if (!file) return setErrorMsg("Please select a file.");
    setLoading(true);
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/v1/uploads", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (!json.success) {
        setErrorMsg("❗ Extraction failed: " + (json.error || "Unknown error"));
        setLoading(false);
        return;
      }

      setExtractedText(json.text || "");
      setFields(json.fields || {});
      setEditValues(json.fields || {});
      setIfscInfo(json.ifscVerification || null);

      localStorage.setItem("lastExtractedData", JSON.stringify(json));

    } catch (err) {
      setErrorMsg("❗ Backend error");
    }
    setLoading(false);
  };

  const saveEdits = async () => {
    console.log("Sending edit values...", editValues);

    const res = await fetch("http://localhost:5000/api/v1/updateRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editValues),
    });

    const json = await res.json();
    if (json.success) {
      alert("✔ Saved!");
      setEditing(false);
      setFields(editValues);
    } else {
      alert("Failed to save");
    }
  };

  const loadHistory = async () => {
    setErrorMsg("");
    setShowHistory(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/history");
      const json = await res.json();
      setHistory(Array.isArray(json) ? json : []);
    } catch (err) {
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
      }
    }, 350);

    setConfirmDeleteId(null);
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

    if (key === "accountNumber") {
      return direction === "asc"
        ? parseInt(a[key] || "0") - parseInt(b[key] || "0")
        : parseInt(b[key] || "0") - parseInt(a[key] || "0");
    }

    if (key === "createdAt") {
      return direction === "asc"
        ? new Date(a[key]) - new Date(b[key])
        : new Date(b[key]) - new Date(a[key]);
    }

    let valueA = (a[key] || "").toLowerCase();
    let valueB = (b[key] || "").toLowerCase();
    if (valueA < valueB) return direction === "asc" ? -1 : 1;
    if (valueA > valueB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const filteredHistory = sortedHistory.filter((h) =>
    (h.accountName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.accountNumber || "").includes(searchTerm) ||
    (h.ifsc || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.bankName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.branch || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCount = filteredHistory.length;
  const totalPages = Math.ceil(filteredCount / rowsPerPage);

  const pageData = filteredHistory.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="page">
      <div className="card app-shell">

        <header className="header">
          <div className="header-left">
            <div className="logo-circle">🏦</div>
            <div>
              <h1>Bank Document Extractor</h1>
              <p className="subtitle">Upload a bank PDF and verify details instantly</p>
            </div>
          </div>
        </header>

        <div className="upload-box">
          <label className="upload-label">Upload PDF Bank Document</label>
          <div className="upload-controls">
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={handleUpload} disabled={loading}>
              {loading ? "Processing..." : "Upload & Validate"}
            </button>
            <button onClick={loadHistory} style={{ background: "#555", marginLeft: "10px" }}>
              View History
            </button>
          </div>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {/* ============================================================= */}
        {/* VIEW EXTRACTED + EDIT BUTTONS */}
        {fields && (
          <div style={{ marginTop: "16px" }}>

            <button 
              onClick={() => navigate("/extracted")} 
              className="blue-btn"
              style={{
                padding: "10px",
                background: "#2563eb",
                color: "white",
                borderRadius: "6px",
                marginRight: "10px"
              }}
            >
              View Full Extracted Data →
            </button>

            {!editing ? (
              <button 
                onClick={() => setEditing(true)}
                className="green-btn"
                style={{
                  padding: "10px",
                  background: "#10b981",
                  color: "white",
                  borderRadius: "6px"
                }}
              >
                Edit Extracted Fields ✏️
              </button>
            ) : (
              <>
                <button 
                  onClick={saveEdits}
                  className="save-btn"
                  style={{
                    padding: "10px",
                    background: "#16a34a",
                    color: "white",
                    borderRadius: "6px",
                    marginRight: "10px"
                  }}
                >
                  Save ✔
                </button>

                <button 
                  onClick={() => setEditing(false)}
                  className="cancel-btn"
                  style={{
                    padding: "10px",
                    background: "#dc2626",
                    color: "white",
                    borderRadius: "6px"
                  }}
                >
                  Cancel ❌
                </button>
              </>
            )}
          </div>
        )}
        {/* ============================================================= */}

        {/* ============================================================= */}
        {/* EDITING UI FIELDS */}
        {editing && (
          <div className="edit-panel">

            <label className="edit-label">Account Name</label>
            <input
              className="edit-input"
              value={editValues.accountName || ""}
              onChange={(e) => setEditValues({ ...editValues, accountName: e.target.value })}
            />

            <label className="edit-label">Account Number</label>
            <input
              className="edit-input"
              value={editValues.accountNumber || ""}
              onChange={(e) => setEditValues({ ...editValues, accountNumber: e.target.value })}
            />

            <label className="edit-label">IFSC</label>
            <input
              className="edit-input"
              value={editValues.ifsc || ""}
              onChange={(e) => setEditValues({ ...editValues, ifsc: e.target.value })}
            />

            <label className="edit-label">Bank Name</label>
            <input
              className="edit-input"
              value={editValues.bankName || ""}
              onChange={(e) => setEditValues({ ...editValues, bankName: e.target.value })}
            />

            <label className="edit-label">Branch</label>
            <input
              className="edit-input"
              value={editValues.branch || ""}
              onChange={(e) => setEditValues({ ...editValues, branch: e.target.value })}
            />

          </div>
        )}
        {/* ============================================================= */}

        {/* HISTORY SECTION */}
        {showHistory && (
          <div className="history-panel">
            <h2 className="section-title">Saved Records</h2>

            <input
              type="text"
              placeholder="🔍 Search name, IFSC, bank, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            {filteredCount > 0 && (
              <p className="pagination-summary">
                Showing {(currentPage - 1) * rowsPerPage + 1}–
                {Math.min(currentPage * rowsPerPage, filteredCount)} of {filteredCount}
              </p>
            )}

            {filteredCount === 0 ? (
              <p>No records found.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("accountName")}>Name</th>
                    <th onClick={() => handleSort("accountNumber")}>Account Number</th>
                    <th onClick={() => handleSort("ifsc")}>IFSC</th>
                    <th onClick={() => handleSort("bankName")}>Bank</th>
                    <th onClick={() => handleSort("branch")}>Branch</th>
                    <th onClick={() => handleSort("createdAt")}>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((h) => (
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

            {filteredCount > rowsPerPage && (
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>◀ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={currentPage === i + 1 ? "active-page" : ""}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next ▶</button>
              </div>
            )}

            <button onClick={() => setShowHistory(false)} className="icon-btn close-btn">
              ✖ Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
