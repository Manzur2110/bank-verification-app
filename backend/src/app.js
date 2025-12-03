import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {

    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append("file", file);

    // 📌 PLACE THE FETCH HERE
    const res = await fetch("http://localhost:5000/api/v1/uploads", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setText(data.text || "No text extracted");

    setLoading(false);
  };

  return (
    <div className="p-10">
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files[0])}
        className="border p-2"
      />

      <button 
        onClick={uploadFile} 
        className="bg-blue-500 text-white p-2 mt-3"
      >
        Upload
      </button>

      <pre className="mt-5 bg-gray-200 p-3">
        {text}
      </pre>
    </div>
  );
}
