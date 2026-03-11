'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  User, 
  Play, 
  Plus, 
  Trash2, 
  FileText, 
  Settings, 
  Info,
  CheckCircle2,
  AlertCircle,
  Eraser
} from 'lucide-react';

// CDN link for pdf-lib to avoid heavy local dependencies for the prototype
const PDF_LIB_URL = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";

export default function PDFAutomatorPage() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [libLoaded, setLibLoaded] = useState(false);
  const [students, setStudents] = useState([
    { id: 1, name: "Shriyansh", roll: "2021CS01" },
    { id: 2, name: "Rahul", roll: "2021CS02" }
  ]);
  
  // Updated Configuration with Eraser (Whiteout) settings and Top-Left toggle
  const [config, setConfig] = useState({
    // Coordinates and dimensions
    nameX: 320, nameY: 620, nameW: 310, nameH: 30,
    rollX: 320, rollY: 684, rollW: 310, rollH: 50,
    
    // Styling
    fontSize: 20,
    color: '#000000',
    bgColor: '#ffffff', // Background color for the eraser box
    
    // Logic toggles
    useTopLeft: true, // Auto-converts from SigniFlow web tools
    eraseOld: true    // Toggles the whiteout rectangle
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  // Load the PDF library on the client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement("script");
      script.src = PDF_LIB_URL;
      script.async = true;
      script.onload = () => setLibLoaded(true);
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateName(file.name);
    const bytes = await file.arrayBuffer();
    setPdfBytes(bytes);
    setStatus({ type: 'success', message: "Template uploaded successfully!" });
  };

  const addStudent = () => {
    setStudents([...students, { id: Date.now(), name: "", roll: "" }]);
  };

  const removeStudent = (id: number) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const updateStudent = (id: number, field: 'name' | 'roll', value: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const generatePDFs = async () => {
    if (!pdfBytes || !libLoaded) {
      setStatus({ type: 'error', message: "Please upload a PDF template first." });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: 'info', message: "Generating PDFs... Please wait." });

    try {
      // @ts-ignore - Accessing global library loaded via CDN
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      
      const textColor = hexToRgb(config.color);
      const bgColor = hexToRgb(config.bgColor);
      const pdfTextColor = rgb(textColor.r, textColor.g, textColor.b);
      const pdfBgColor = rgb(bgColor.r, bgColor.g, bgColor.b);

      for (const student of students) {
        if (!student.name || !student.roll) continue;

        const doc = await PDFDocument.load(pdfBytes);
        
        // Embed both the bold and regular fonts into the document
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const regularFont = await doc.embedFont(StandardFonts.Helvetica);
        
        const pages = doc.getPages();
        const firstPage = pages[0];
        const pageHeight = firstPage.getHeight();

        // Helper function to handle Whiteout + Text writing with Top-Left conversion
        const drawOverlay = (text: string, x: number, y: number, w: number, h: number, fontToUse: any) => {
          // If using Top-Left coordinates (from web tools), we need to invert the Y axis.
          // PDF-lib draws from the bottom-left. 
          const rectY = config.useTopLeft ? (pageHeight - y - h) : y;
          const textBaselineY = rectY + (h - config.fontSize) / 2 + 2; // Rough vertical centering

          if (config.eraseOld) {
            // Draw the "Whiteout" Eraser Box
            firstPage.drawRectangle({
              x: x,
              y: rectY,
              width: w,
              height: h,
              color: pdfBgColor,
            });
          }

          // Draw the New Text
          firstPage.drawText(text, {
            x: x + 4, // 4px slight padding from left edge
            y: textBaselineY,
            size: config.fontSize,
            font: fontToUse, // Apply the dynamically selected font here
            color: pdfTextColor,
          });
        };

        // Process Name (Bold) and Roll No (Regular)
        drawOverlay(student.name, config.nameX, config.nameY, config.nameW, config.nameH, boldFont);
        drawOverlay(student.roll, config.rollX, config.rollY, config.rollW, config.rollH, regularFont);

        const modifiedBytes = await doc.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${student.name.replace(/\s+/g, '_')}_IIS_Frontpage.pdf`;
        link.click();
        
        // Short delay to avoid browser/OS download queue congestion
        await new Promise(r => setTimeout(r, 300));
        URL.revokeObjectURL(url);
      }

      setStatus({ type: 'success', message: `Successfully generated ${students.length} PDFs!` });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "Failed to process PDFs. Check console for details." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-10 text-neutral-900 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-black tracking-tight flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <FileText size={32} />
              </div>
              PDF Automator
            </h1>
            <p className="text-neutral-500 mt-2 text-lg font-medium">Automate & Edit college frontpages for your entire class.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-white px-4 py-2 rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${libLoaded ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                {libLoaded ? "Engine Ready" : "Loading Engine"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step 1: Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-5 border-b border-neutral-100 bg-neutral-50/50">
                <h2 className="font-bold flex items-center gap-2 text-neutral-700">
                  <Upload size={18} className="text-indigo-600" /> 
                  1. PDF Template
                </h2>
              </div>
              <div className="p-5">
                <label className={`
                  relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
                  ${pdfBytes ? 'border-emerald-200 bg-emerald-50/30' : 'border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50/20'}
                `}>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Download className={`w-8 h-8 mb-2 ${pdfBytes ? 'text-emerald-500' : 'text-neutral-300'}`} />
                    <p className="text-sm font-semibold text-neutral-600">
                      {templateName || "Upload PDF Template"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 2: Placement & Eraser */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-5 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2 text-neutral-700">
                  <Settings size={18} className="text-indigo-600" /> 
                  2. Editor Settings
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-neutral-500">Enable Whiteout</span>
                  <input type="checkbox" checked={config.eraseOld} onChange={(e) => setConfig({...config, eraseOld: e.target.checked})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
              </div>
              
              <div className="p-5 space-y-5">
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 leading-relaxed flex gap-2">
                  <Info size={16} className="shrink-0 text-amber-600" />
                  <span>
                    Imagine the Plane in Third Quadrant
                    {/* <strong>Top-Left Mode is Active.</strong> The X/Y coords from SigniFlow will work perfectly. Adjust Width (W) & Height (H) to draw a box over the old text to erase it! */}
                  </span>
                </div>
                
                {/* Name Config */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 border-b pb-1">Name Box</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">X Coord</label>
                      <input type="number" value={config.nameX} onChange={(e) => setConfig({...config, nameX: +e.target.value})} className="w-full bg-neutral-100 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Y Coord</label>
                      <input type="number" value={config.nameY} onChange={(e) => setConfig({...config, nameY: +e.target.value})} className="w-full bg-neutral-100 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Width</label>
                      <input type="number" value={config.nameW} onChange={(e) => setConfig({...config, nameW: +e.target.value})} className="w-full bg-indigo-50 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Height</label>
                      <input type="number" value={config.nameH} onChange={(e) => setConfig({...config, nameH: +e.target.value})} className="w-full bg-indigo-50 border-none rounded p-2 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Roll No Config */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 border-b pb-1">Roll Number Box</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">X Coord</label>
                      <input type="number" value={config.rollX} onChange={(e) => setConfig({...config, rollX: +e.target.value})} className="w-full bg-neutral-100 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Y Coord</label>
                      <input type="number" value={config.rollY} onChange={(e) => setConfig({...config, rollY: +e.target.value})} className="w-full bg-neutral-100 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Width</label>
                      <input type="number" value={config.rollW} onChange={(e) => setConfig({...config, rollW: +e.target.value})} className="w-full bg-indigo-50 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Height</label>
                      <input type="number" value={config.rollH} onChange={(e) => setConfig({...config, rollH: +e.target.value})} className="w-full bg-indigo-50 border-none rounded p-2 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="pt-3 border-t border-neutral-100 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Font Size</label>
                      <input type="number" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: +e.target.value})} className="w-full bg-neutral-100 border-none rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1">Text Color</label>
                      <input type="color" value={config.color} onChange={(e) => setConfig({...config, color: e.target.value})} className="w-full h-9 rounded border-none cursor-pointer bg-neutral-100 p-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 block mb-1 flex items-center gap-1"><Eraser size={10}/> Eraser Color</label>
                      <input type="color" value={config.bgColor} onChange={(e) => setConfig({...config, bgColor: e.target.value})} className="w-full h-9 rounded border-none cursor-pointer bg-neutral-100 p-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2 text-neutral-700 text-lg">
                  <User size={20} className="text-indigo-600" />
                  Student Directory
                </h2>
                <button 
                  onClick={addStudent}
                  className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-200"
                >
                  <Plus size={16} /> Add Classmate
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[400px] p-2">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-black uppercase text-neutral-400">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Full Name</div>
                  <div className="col-span-4">Roll Number</div>
                  <div className="col-span-1 text-right"></div>
                </div>
                
                <div className="space-y-1">
                  {students.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2 rounded-xl hover:bg-neutral-50 group transition-colors">
                      <div className="col-span-1 text-xs font-bold text-neutral-300">{i + 1}</div>
                      <div className="col-span-6">
                        <input 
                          type="text" 
                          value={s.name}
                          placeholder="e.g. John Doe"
                          onChange={(e) => updateStudent(s.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-neutral-200"
                        />
                      </div>
                      <div className="col-span-4">
                        <input 
                          type="text" 
                          value={s.roll}
                          placeholder="CS001"
                          onChange={(e) => updateStudent(s.id, 'roll', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-mono text-indigo-600 focus:ring-0 placeholder:text-neutral-200"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button onClick={() => removeStudent(s.id)} className="text-neutral-200 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-neutral-100 bg-neutral-50/50">
                <div className="flex flex-col items-center">
                  {status.message && (
                    <div className={`mb-4 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full ${
                      status.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                      status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {status.message}
                    </div>
                  )}

                  <button 
                    disabled={!pdfBytes || isProcessing || !libLoaded}
                    onClick={generatePDFs}
                    className={`
                      w-full max-w-md py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-xl
                      ${(!pdfBytes || isProcessing || !libLoaded) 
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play size={24} className="fill-current" />
                        Run Automation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}