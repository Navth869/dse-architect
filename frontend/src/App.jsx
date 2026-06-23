import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Maximize2, ShieldAlert, Shuffle, Zap, Download, Upload
} from 'lucide-react';

const INITIAL_BANK = [
  {
    id: "q-1",
    qNum: "1.",
    spaceSize: "small",
    qImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
    aImage: "https://images.unsplash.com/photo-1509228468518-180dd482180c?w=800&auto=format&fit=crop&q=80",
    width: 240,
    height: 110,
    aspectRatio: 2.18,
    sortOrder: 1
  },
  {
    id: "q-2",
    qNum: "2.",
    spaceSize: "middle",
    qImage: "https://images.unsplash.com/photo-1509228468518-180dd482180c?w=800&auto=format&fit=crop&q=80",
    aImage: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80",
    width: 260,
    height: 180,
    aspectRatio: 1.44,
    sortOrder: 2
  }
];

export default function App() {
  const [questions, setQuestions] = useState(INITIAL_BANK);
  const [currentView, setCurrentView] = useState('question');
  const [activeTab, setActiveTab] = useState('editor');
  const [scrambleSeed, setScrambleSeed] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState("q-1");
  const [pdfQuestionFile, setPdfQuestionFile] = useState(null);
  const [pdfAnswerFile, setPdfAnswerFile] = useState(null);
  const [isUploadingPdfs, setIsUploadingPdfs] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const deterministicShuffle = (array, seed) => {
    let shuffled = [...array];
    let currentSeed = seed;
    const nextRandom = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const pages = useMemo(() => {
    let sortedList = [...questions];
    if (scrambleSeed > 0) {
      sortedList = deterministicShuffle(sortedList, scrambleSeed);
    } else {
      sortedList.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const layouts = [];

    sortedList.forEach((q) => {
      const neededHeight = q.spaceSize === 'small' ? 0.3333 : q.spaceSize === 'middle' ? 0.50 : 1.0;
      let placed = false;

      for (let i = 0; i < layouts.length; i++) {
        const page = layouts[i];
        const currentSum = page.slots.reduce((sum, s) => sum + (s.spaceSize === 'small' ? 0.3333 : s.spaceSize === 'middle' ? 0.50 : 1.0), 0);

        // Epsilon tracking tolerance correction prevents infinite canvas splitting loops
        if (currentSum + neededHeight <= 1.01) {
          page.slots.push(q);
          placed = true;
          break;
        }
      }

      if (!placed) {
        layouts.push({ pageNum: layouts.length + 1, slots: [q] });
      }
    });

    return layouts;
  }, [questions, scrambleSeed]);

  const packingEfficiency = useMemo(() => {
    if (pages.length === 0) return 100;
    const totalAllocated = pages.reduce((sum, p) => sum + p.slots.reduce((sSum, s) => sSum + (s.spaceSize === 'small' ? 0.3333 : s.spaceSize === 'middle' ? 0.50 : 1.0), 0), 0);
    return Math.round((totalAllocated / pages.length) * 100);
  }, [pages]);

  // Unified automatic token classifier block
  const getCalculatedSizeClassification = (pixelHeight) => {
    if (pixelHeight > 220) return 'large';
    if (pixelHeight > 146) return 'middle';
    return 'small';
  };

  const runAutoLayoutOptimizer = () => {
    setQuestions(prevQuestions => prevQuestions.map(q => ({
      ...q,
      spaceSize: getCalculatedSizeClassification(q.height)
    })));
  };

  // The Fix: Manual scale mutations auto-update token weights to drive reactive FFD re-packing
  const handleUpdateDimensions = (id, newWidth, newHeight) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        const structuralHeight = Math.round(newHeight);
        return {
          ...q,
          width: Math.round(newWidth),
          height: structuralHeight,
          spaceSize: getCalculatedSizeClassification(structuralHeight) // Keeps FFD loop in continuous sync
        };
      }
      return q;
    }));
  };

  const handleUpdateSpaceSize = (id, newSize) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        // Enforce baseline canvas height presets when user manually swaps dropdowns
        const structuralHeight = newSize === 'small' ? 120 : newSize === 'middle' ? 180 : 300;
        return { ...q, spaceSize: newSize, height: structuralHeight, width: Math.round(structuralHeight * q.aspectRatio) };
      }
      return q;
    }));
  };

  const handlePdfUpload = async (questionFile, answerFile) => {
    if (!questionFile || !answerFile) return;
    const formData = new FormData();
    formData.append("question_pdf", questionFile);
    formData.append("answer_pdf", answerFile);

    setIsUploadingPdfs(true);
    try {
      const response = await fetch("http://localhost:8000/api/extract", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.status === "success") {
        setQuestions(result.questions);
        if (Array.isArray(result.questions) && result.questions.length > 0) {
          setActiveQuestionId(result.questions[0].id);
        }
      } else {
        alert("Extraction failed.");
      }
    } catch (err) {
      console.error("Connection error with FastAPI backend: ", err);
      alert("Connection error with FastAPI backend. See console for details.");
    } finally {
      setIsUploadingPdfs(false);
    }
  };

  const handleCompileExport = async () => {
    setIsCompiling(true);
    try {
      const response = await fetch("http://localhost:8000/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: "dse_math_2026",
          pages: pages,
        }),
      });

      if (!response.ok) throw new Error("Compilation failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.setAttribute("download", "DSE_Compiled_Exam.pdf");
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    } catch (error) {
      console.error("PDF generation pipeline encountered an error: ", error);
      alert("FastAPI compiler failure. Check system logs.");
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (pdfQuestionFile && pdfAnswerFile) {
      handlePdfUpload(pdfQuestionFile, pdfAnswerFile);
    }
  }, [pdfQuestionFile, pdfAnswerFile]);

  const handleImportLayoutSchema = (event) => {
    const fileTarget = event.target.files?.[0];
    if (!fileTarget) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const blueprint = JSON.parse(e.target?.result);
        if (!blueprint.questions || !Array.isArray(blueprint.questions)) throw new TypeError();
        const sanitized = blueprint.questions.map((q) => ({
          id: String(q.id), qNum: String(q.qNum),
          spaceSize: ['small', 'middle', 'large'].includes(q.spaceSize) ? q.spaceSize : 'small',
          qImage: String(q.qImage), aImage: String(q.aImage),
          width: Number(q.width) || 240, height: Number(q.height) || 110,
          aspectRatio: Number(q.aspectRatio) || 2.0, sortOrder: Number(q.sortOrder) || 1
        }));
        setQuestions(sanitized);
        if (sanitized.length > 0) setActiveQuestionId(sanitized[0].id);
      } catch (err) {
        alert("Verification Failed: Invalid schema structural fingerprint.");
      }
    };
    fileReader.readAsText(fileTarget);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">DSE Spatial Architect</h1>
          <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">WYSIWYG Production Workspace</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-black">Packing Efficiency</span>
            <span className={`text-sm font-black font-mono ${packingEfficiency >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{packingEfficiency}%</span>
          </div>
          {packingEfficiency < 80 && (
            <div className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 rounded max-w-[160px] leading-tight">Low performance. Optimize sizing constraints.</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold border border-slate-700">
            <Upload size={14} /> Import Schema
            <input type="file" accept=".json" onChange={handleImportLayoutSchema} className="hidden" />
          </label>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Editor</button>
            <button onClick={() => setActiveTab('preview')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Blueprint ({pages.length})</button>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6">
        <section className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
            <h2 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Optimization Controls</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={runAutoLayoutOptimizer} className="p-3 bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold flex flex-col gap-2"><Zap size={16} />Auto-Fit Slots</button>
              <button onClick={() => setScrambleSeed(prev => prev === 0 ? 101 : 0)} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold flex flex-col gap-2"><Shuffle size={16} />{scrambleSeed > 0 ? "Reset Order" : "Scramble Booklets"}</button>
            </div>
            <div className="grid gap-3">
              <label className="flex flex-col text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 cursor-pointer hover:border-indigo-500">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide">Question PDF</span>
                <span className="mt-1 text-[12px] text-slate-100">{pdfQuestionFile?.name || 'Select the question PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfQuestionFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <label className="flex flex-col text-xs font-bold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 cursor-pointer hover:border-indigo-500">
                <span className="text-slate-400 text-[10px] uppercase tracking-wide">Answer PDF</span>
                <span className="mt-1 text-[12px] text-slate-100">{pdfAnswerFile?.name || 'Select the answer PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfAnswerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {isUploadingPdfs && <div className="text-[10px] text-slate-400">Uploading and extracting PDF slices...</div>}
            </div>
            <button onClick={handleCompileExport} disabled={isCompiling} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg">
              <Download size={14} />{isCompiling ? 'Compiling PDF...' : 'Export Clean Layout'}
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl flex-1 flex flex-col gap-4 overflow-hidden">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Accumulation Pool</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {questions.map(q => (
                <div key={q.id} onClick={() => setActiveQuestionId(q.id)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center ${activeQuestionId === q.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-900/40 border-slate-850'}`}>
                  <span className="text-xs font-bold text-white">Question {q.qNum}</span>
                  <select value={q.spaceSize} onChange={(e) => handleUpdateSpaceSize(q.id, e.target.value)} className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5">
                    <option value="small">Small (33.33%)</option>
                    <option value="middle">Middle (50.00%)</option>
                    <option value="large">Large (100.00%)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex justify-end bg-slate-950/40 p-4 border border-slate-850/80 rounded-2xl">
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button onClick={() => setCurrentView('question')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${currentView === 'question' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Questions</button>
              <button onClick={() => setCurrentView('answer')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${currentView === 'answer' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Marking Schemes</button>
            </div>
          </div>

          {activeTab === 'editor' ? (
            <div className="flex-1 flex items-center justify-center bg-slate-950/20 rounded-3xl p-6 border border-slate-850/40">
              {(() => {
                const targetQ = questions.find(q => q.id === activeQuestionId);
                if (!targetQ) return <p className="text-slate-500 text-xs">Select a question slice.</p>;
                return <MillimeterGridCanvas><ResizableSlot spaceSize={targetQ.spaceSize} parentHeight={440} qImage={targetQ.qImage} aImage={targetQ.aImage} qNum={targetQ.qNum} currentView={currentView} aspectRatio={targetQ.aspectRatio} width={targetQ.width} height={targetQ.height} onResize={(w, h) => handleUpdateDimensions(targetQ.id, w, h)} /></MillimeterGridCanvas>;
              })()}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-12 pr-2 max-h-[70vh] flex flex-col items-center">
              {pages.map(page => (
                <div key={page.pageNum} className="bg-white text-slate-950 p-12 rounded-[24px] shadow-2xl w-full max-w-[500px] aspect-[1/1.414] flex flex-col border-2 border-slate-300 relative overflow-hidden">
                  <span className="absolute top-4 right-6 text-[10px] font-mono text-slate-400 font-bold">PAGE {page.pageNum} OF {pages.length}</span>
                  <div className="flex-1 flex flex-col justify-start mt-4 h-full relative">
                    {page.slots.map(q => {
                      const limitHeight = q.spaceSize === 'small' ? 146 : q.spaceSize === 'middle' ? 220 : 440;
                      const isOver = q.height > limitHeight;
                      const slotHeightClass = q.spaceSize === 'small' ? 'h-[33.33%]' : q.spaceSize === 'middle' ? 'h-[50%]' : 'h-full';

                      return (
                        <div key={q.id} className={`border-b border-dashed border-slate-200 p-3 flex flex-col justify-between overflow-hidden ${slotHeightClass} ${isOver ? 'bg-rose-50/50 border-rose-400' : ''}`}>
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-sm font-serif">{q.qNum}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] text-white ${isOver ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}>
                              {isOver ? "OVERFLOW ALERT" : q.spaceSize.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 bg-slate-50 rounded overflow-hidden flex items-center justify-center m-2 border border-slate-100">
                            <img src={currentView === 'question' ? q.qImage : q.aImage} style={{ width: `${q.width}px`, height: `${q.height}px`, maxWidth: '90%', maxHeight: '85%' }} className="object-contain" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MillimeterGridCanvas({ children }) {
  return (
    <div
      className="relative w-[311px] h-[440px] bg-white shadow-2xl overflow-hidden border border-slate-300 rounded-xl"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(99, 102, 241, 0.03) 1mm, transparent 1mm),
          linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 1mm, transparent 1mm),
          linear-gradient(to right, rgba(99, 102, 241, 0.08) 10mm, transparent 10mm),
          linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 10mm, transparent 10mm)
        `,
        backgroundSize: '2.5mm 2.5mm, 2.5mm 2.5mm, 25mm 25mm, 25mm 25mm'
      }}
    >
      {children}
    </div>
  );
}

function ResizableSlot({ spaceSize, parentHeight, qImage, aImage, qNum, currentView, aspectRatio, width, height, onResize }) {
  const containerRef = useRef(null);
  const slotRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const sizeFactor = spaceSize === 'small' ? 0.3333 : spaceSize === 'middle' ? 0.50 : 1.0;
  const allowedHeight = Math.round(parentHeight * sizeFactor);
  const [isOverflowed, setIsOverflowed] = useState(false);

  useEffect(() => {
    if (slotRef.current) {
      const bounds = slotRef.current.getBoundingClientRect();
      setIsOverflowed(bounds.height > (allowedHeight - 8));
    }
  }, [width, height, allowedHeight]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let nextWidth = Math.max(120, Math.min(290, e.clientX - rect.left));
      onResize(nextWidth, nextWidth / aspectRatio);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, aspectRatio, onResize]);

  return (
    <div ref={containerRef} style={{ height: `${allowedHeight}px` }} className={`relative w-full border-b flex flex-col justify-between p-4 transition-colors ${isOverflowed ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'}`}>
      <div className="flex justify-between items-center z-10 pointer-events-none">
        <span className="font-serif font-black text-slate-800 text-sm">{qNum}</span>
        {isOverflowed && <span className="flex items-center gap-0.5 bg-rose-600 text-white text-[7px] font-black px-1 py-0.5 rounded shadow-sm"><ShieldAlert size={8} />OVERFLOW</span>}
      </div>
      <div ref={slotRef} style={{ width: `${width}px`, height: `${height}px` }} className="relative rounded-lg overflow-hidden ring-1 ring-indigo-500/10 self-center">
        <img src={currentView === 'question' ? qImage : aImage} className="w-full h-full object-cover object-top" />
        <div onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 text-white flex items-center justify-center cursor-se-resize rounded-tl-lg"><Maximize2 size={8} className="rotate-90" /></div>
      </div>
      <div className="text-[8px] font-mono font-bold text-slate-400 text-right">{Math.round(height)}px / {allowedHeight}px</div>
    </div>
  );
}