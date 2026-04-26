import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState("");

  const upload = async () => {
    const fd = new FormData();
    fd.append("file", file);

    await fetch(`${API}/upload`, {
      method: "POST",
      body: fd
    });
  };

  const ask = async () => {
    const r = await fetch(`${API}/ask`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({question: q})
    });

    const data = await r.json();
    setRes(data.answer);
  };

  return (
    <div>
      <h1>AI Assistant</h1>

      <input type="file" onChange={e => setFile(e.target.files[0])}/>
      <button onClick={upload}>Upload</button>

      <input value={q} onChange={e => setQ(e.target.value)} />
      <button onClick={ask}>Ask</button>

      <p>{res}</p>
    </div>
  );
}