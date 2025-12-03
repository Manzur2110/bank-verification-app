import React, { useState, useEffect } from 'react';

export default function BankUpload(){
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(()=>{
    let timer;
    if (uploadId && status !== 'verified' && status !== 'manual_review') {
      timer = setInterval(async ()=>{
        try {
          const r = await fetch(`http://localhost:5000/api/v1/uploads/${uploadId}`);
          if (r.status === 200) {
            const j = await r.json();
            setStatus(j.status);
            setResult(j.extracted);
          } else {
            // ignore
          }
        } catch (err) {
          // ignore
        }
      }, 2000);
    }
    return ()=> clearInterval(timer);
  }, [uploadId, status]);

  async function handleUpload(e){
    e.preventDefault();
    setError(null);
    if (!file) return setError('Please choose a file');

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('http://localhost:5000/api/v1/uploads', { method: 'POST', body: fd });
      if (!res.ok) {
        const t = await res.json();
        setError(t.error || 'upload_failed');
        return;
      }
      const j = await res.json();
      setUploadId(j.id);
      setStatus(j.status);
      setResult(j.extracted);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <form onSubmit={handleUpload}>
        <input type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files[0])} />
        <div style={{ marginTop: 8 }}>
          <button type="submit">Upload</button>
        </div>
      </form>

      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}

      {status && <div style={{ marginTop: 12 }}>Status: <strong>{status}</strong></div>}

      {result && (
        <div style={{ marginTop: 12, background: '#fafafa', padding: 8, borderRadius: 6 }}>
          <h3>Extracted</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
