import React, { useState } from "react";
const DR_STAGES = {
  "0": { 
    title: "No DR", 
    color: "#4ade80", 
    desc: "Диабеттік ретинопатия белгілері жоқ. Көз торқабы сау." 
  },
  "1": { 
    title: "Mild", 
    color: "#a3e635", 
    desc: "Жеңіл саты. Микроаневризмалардың болуы." 
  },
  "2": { 
    title: "Moderate", 
    color: "#facc15", 
    desc: "Орташа саты. Қан кету ошақтары және экссудаттар." 
  },
  "3": { 
    title: "Severe", 
    color: "#fb923c", 
    desc: "Ауыр саты. Тамырлардың айтарлықтай зақымдануы." 
  },
  "4": { 
    title: "Proliferative DR", 
    color: "#f87171", 
    desc: "Пролиферативті саты. Жаңа тамырлардың өсуі (қауіпті жағдай)." 
  }
};

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    } else if (selectedFile) {
      alert("Тек сурет файлдарын жүктеңіз (Please upload images only)");
    }
  };

  // Обработка событий Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Отправка на сервер
  const sendFile = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://huggingface.co/spaces/TYNYSHTYK/DIABETICRETINOPATHY?logs=container/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      
      setTimeout(() => setResult(data), 600);
      
    } catch (error) {
      alert("Қате: Сервермен байланыс орнатылмады (Порт 7000)");
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const getStageData = (label) => {
    if (DR_STAGES[label]) return DR_STAGES[label];
    const foundKey = Object.keys(DR_STAGES).find(key => DR_STAGES[key].title === label);
    if (foundKey) return DR_STAGES[foundKey];
    return { title: label, color: "#94a3b8", desc: "Талдау аяқталды" };
  };

  const mainResult = result?.top?.[0];
  const mainStage = mainResult ? getStageData(mainResult.label) : null;

  return (
    <div className="app-container">
      <div className="card">
        <header>
          <h1 className="app-title">RetinaAI Pro</h1>
          <p className="app-subtitle">Жасанды интеллект арқылы көз торқабын диагностикалайтын заманауи клиникалық сервис.</p>
        </header>

        <div className="content-grid">
          {/* Зона загрузки с Drag & Drop */}
          <div className="upload-section">
            <label 
              className={`drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input type="file" onChange={onFileChange} accept="image/*" hidden />
              
              {preview ? (
                <img src={preview} alt="Scan" className="preview-image" />
              ) : (
                <div className="placeholder-text">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '10px', opacity: 0.6}}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>Суретті осы жерге сүйреңіз</p>
                  <span style={{fontSize: '0.85em', opacity: 0.7}}>(немесе басып таңдаңыз)</span>
                </div>
              )}
            </label>

            <button 
              className="analyze-btn"
              onClick={sendFile} 
              disabled={!file || loading}
            >
              {loading ? <span className="loader"></span> : "Талдауды бастау"}
            </button>
          </div>

          {/* Результат */}
          {mainResult && (
            <div className="result-panel">
              <div className="diagnosis-header">
                <span className="confidence-badge">Confidence: {(mainResult.probability * 100).toFixed(1)}%</span>
                <h2 
                  className="main-stage-title" 
                  style={{ color: mainStage.color, textShadow: `0 0 25px ${mainStage.color}50` }}
                >
                  {mainStage.title}
                </h2>
                <p className="stage-description">{mainStage.desc}</p>
              </div>

              <div className="stats-list">
                {result.top.map((item, idx) => {
                  const stage = getStageData(item.label);
                  const percent = (item.probability * 100).toFixed(1);
                  
                  return (
                    <div key={idx} className="stat-item">
                      <div className="stat-header">
                        <span>{stage.title}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${percent}%`, 
                            backgroundColor: stage.color,
                            boxShadow: `0 0 10px ${stage.color}80` 
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
