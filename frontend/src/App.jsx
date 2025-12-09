// App.jsx — Toby Glass UI Edition

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fields, setFields] = useState({});
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  useEffect(() => {
    loadHistory();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const loadHistory = async () => {
    const res = await fetch("http://localhost:5000/api/v1/history");
    const data = await res.json();
    setHistory(data);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setSelectedFile(f);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please choose a file.");

    setLoading(true);

    const fd = new FormData();
    fd.append("file", selectedFile);

    const res = await fetch("http://localhost:5000/api/v1/uploads", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert("Extraction failed: " + data.error);
      return;
    }

    setFields(data.fields);
    setRawText(data.rawText);

    localStorage.setItem(
      "lastExtractedData",
      JSON.stringify({
        fields: data.fields,
        text: data.rawText,
      })
    );

    loadHistory();
  };

  return (
    <div className="page">
      <div className="card">

        {/* Header */}
        <div className="header">
          <div className="logo-circle">🏦</div>
          <div>
            <h2>Bank Document Extractor</h2>
            <div className="subtitle">Modern OCR + MICR pipeline</div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="close-btn" onClick={() => setShowHistoryPanel(!showHistoryPanel)}>
              {showHistoryPanel ? "Hide History" : "View History"}
            </button>

            <button className="close-btn" onClick={() => navigate("/extracted")}>
              Full Viewer
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="upload-box">
          <div className="upload-label" style={{ marginBottom: 8 }}>
            Upload Bank Document
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="file" accept=".pdf,image/*" onChange={handleFileChange} />

            <button onClick={handleUpload} disabled={loading}>
              {loading ? "Processing..." : "Upload & Extract"}
            </button>

            {Object.keys(fields).length > 0 && (
              <button className="btn-secondary" onClick={() => navigate("/extracted")}>
                Full Extraction Viewer
              </button>
            )}
          </div>

          {previewUrl && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Preview</div>
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  maxWidth: 220,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.7)",
                }}
              />
            </div>
          )}
        </div>

        {/* Extracted Viewer Panel */}
        {Object.keys(fields).length > 0 && (
          <>
            <div className="section-title">Extracted Cheque Information</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              <div className="glass-box">
                <div>Account Name</div>
                <b>{fields.accountName || "—"}</b>

                <div style={{ marginTop: 12 }}>Bank Name</div>
                <b>{fields.bankName || "—"}</b>

                <div style={{ marginTop: 12 }}>Branch</div>
                <b>{fields.branch || "—"}</b>
              </div>

              <div className="glass-box">
                <div>Routing Number</div>
                <b>{fields.routingNumber || "—"}</b>

                <div style={{ marginTop: 12 }}>Account Number</div>
                <b>{fields.accountNumber || "—"}</b>

                <div style={{ marginTop: 12 }}>Check #</div>
                <b>{fields.checkNumber || "—"}</b>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div>Full OCR Text</div>
              <pre className="raw-text-box">{rawText}</pre>
            </div>
          </>
        )}

        {/* History Panel */}
        {showHistoryPanel && (
          <div className="history-panel">
            <h3>History</h3>
            <table className="history-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Acc #</th><th>Routing</th>
                  <th>Check</th><th>Bank</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>{h.accountName}</td>
                    <td>{h.accountNumber}</td>
                    <td>{h.routingNumber}</td>
                    <td>{h.checkNumber}</td>
                    <td>{h.bankName}</td>
                    <td>{h.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
