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
  }, []);

  const loadHistory = async () => {
    const res = await fetch("http://localhost:5000/api/v1/checks");
    const json = await res.json();
    setHistory(json.data || []);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setSelectedFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Choose a file");

    setLoading(true);

    const fd = new FormData();
    fd.append("file", selectedFile);

    const res = await fetch("http://localhost:5000/api/v1/checks/extract", {
      method: "POST",
      body: fd,
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) {
      alert("Extraction failed: " + json.error);
      return;
    }

    setFields(json.data.fields);
    setRawText(json.data.rawText);
    loadHistory();
  };

  return (
    <div className="page">
      <div className="card">

        <div className="header">
          <div className="logo-circle">🏦</div>
          <h2>Bank Document Extractor</h2>

          <button onClick={() => setShowHistoryPanel(!showHistoryPanel)}>
            {showHistoryPanel ? "Hide History" : "View History"}
          </button>
        </div>

        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Processing..." : "Upload & Extract"}
        </button>

        {previewUrl && <img src={previewUrl} width="160" />}

        {Object.keys(fields).length > 0 && (
          <>
            <h3>Extracted Data</h3>
            <pre>{JSON.stringify(fields, null, 2)}</pre>
            <h4>Raw OCR</h4>
            <pre>{rawText}</pre>
          </>
        )}

        {showHistoryPanel && (
          <div className="history-panel">
            <h3>History</h3>
            {history.map((h) => (
              <div key={h.id}>
                #{h.id} — {h.accountName} — {h.accountNumber}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
