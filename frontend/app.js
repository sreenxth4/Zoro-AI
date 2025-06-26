import React, { useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
    const [prompt, setPrompt] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");

    const handleGenerate = async () => {
        const response = await fetch("https://zoro-ai.onrender.com/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
    
        const data = await response.json();
        setGeneratedCode(data.code);
    };

    return (
        <div>
            <h1>AI Code Generator</h1>
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter your project idea..." />
            <button onClick={handleGenerate}>Generate</button>
            <Editor height="400px" language="html" value={generatedCode} onChange={setGeneratedCode} />
        </div>
    );
}

export default App;
