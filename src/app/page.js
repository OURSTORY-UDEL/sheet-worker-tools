'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabaseClient';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// ==========================================
// 1. KOMPONEN: TOAST NOTIFICATION (PROFESIONAL)
// ==========================================
function NotificationToast({ notif, onClose }) {
  if (!notif) return null;

  const typeStyles = {
    success: "bg-slate-900 border-l-4 border-emerald-500",
    error: "bg-slate-900 border-l-4 border-red-500",
    info: "bg-slate-900 border-l-4 border-blue-500",
    warning: "bg-slate-900 border-l-4 border-yellow-500"
  };

  return (
    <div className={`fixed bottom-6 right-6 ${typeStyles[notif.type]} text-white pl-4 pr-8 py-4 rounded-r shadow-2xl z-[10000] flex items-start gap-4 animate-slide-in-right max-w-sm`}>
      <div className="mt-0.5 text-lg">
        {notif.type === 'success' && '✓'}
        {notif.type === 'error' && '!'}
        {notif.type === 'info' && 'i'}
        {notif.type === 'warning' && '⚠'}
      </div>
      <div>
        <h4 className="font-bold text-sm uppercase tracking-wide mb-1">{notif.title}</h4>
        <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
      </div>
      <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-white transition">✕</button>
    </div>
  );
}

// ==========================================
// 2. KOMPONEN: EMAIL MODAL (INTERNAL)
// ==========================================
function EmailModal({ isOpen, onClose, data, onSend }) {
  if (!isOpen) return null;

  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      onSend();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-up">
        <div className="bg-[#1A1A1A] px-6 py-4 flex justify-between items-center text-white border-b border-gray-700">
          <h3 className="font-bold tracking-wide text-sm">COMPOSE EMAIL</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Penerima</label>
            <input type="email" defaultValue={data?.email} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 transition" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Subjek</label>
            <input type="text" defaultValue={`Invoice #${data?.no} - ${data?.customer}`} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 transition" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">Pesan</label>
            <textarea rows="4" className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 transition resize-none" defaultValue={`Yth. ${data?.customer},\n\nTerlampir invoice untuk layanan yang telah diselesaikan.\n\nTerima kasih.`}></textarea>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition">BATAL</button>
            <button type="submit" disabled={isSending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg flex items-center gap-2 disabled:opacity-50">
              {isSending ? 'MENGIRIM...' : 'KIRIM PESAN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 2.5. KOMPONEN: WORD COUNT MODAL
// ==========================================
function WordCountModal({ isOpen, onClose, textRef }) {
  if (!isOpen) return null;

  const getText = () => {
    if (!textRef.current) return { words: 0, chars: 0 };
    const text = textRef.current.innerText || "";
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    return { words, chars: text.length };
  };

  const { words, chars } = getText();

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-scale-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-900">Word Count</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-900">✕</button>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-slate-600">Words</span>
            <span className="font-bold text-slate-900 text-xl">{words}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-slate-600">Characters</span>
            <span className="font-bold text-slate-900 text-xl">{chars}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 transition text-white py-2.5 rounded font-bold text-sm uppercase tracking-wider">Close</button>
      </div>
    </div>
  );
}

// ==========================================
// 2.6. KOMPONEN: OPEN DOCUMENT MODAL
// ==========================================
function OpenDocumentModal({ isOpen, onClose, invoices, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Open Document ({invoices.length})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800">✕</button>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No active documents</div>
          ) : (
            invoices.map((inv, idx) => (
              <div key={idx} onClick={() => onSelect(idx)} className="p-3 hover:bg-emerald-50 cursor-pointer rounded border border-transparent hover:border-emerald-100 mb-1 transition flex justify-between items-center group">
                <div>
                  <div className="font-bold text-sm text-slate-800">#{inv.no || 'Untitled'}</div>
                  <div className="text-xs text-slate-500">{inv.customer || 'No Customer'}</div>
                </div>
                <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded group-hover:bg-emerald-100 group-hover:text-emerald-700 transition">OPEN</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 bg-slate-50 border-t border-gray-100 text-right">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.7. KOMPONEN: PAGE SETUP MODAL
// ==========================================
function PageSetupModal({ isOpen, onClose, settings, onSave }) {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-scale-up">
        <div className="p-5">
          <h3 className="font-bold text-lg text-slate-800 mb-4">Page Setup</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paper Size</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500" value={localSettings.size} onChange={e => setLocalSettings({ ...localSettings, size: e.target.value })}>
                <option value="A4">A4 (210mm x 297mm)</option>
                <option value="Letter">Letter (8.5" x 11")</option>
                <option value="Legal">Legal (8.5" x 14")</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Orientation</label>
              <div className="flex gap-2">
                <label className={`flex-1 border rounded p-2 text-center text-sm cursor-pointer transition ${localSettings.orientation === 'portrait' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" className="hidden" name="orient" checked={localSettings.orientation === 'portrait'} onChange={() => setLocalSettings({ ...localSettings, orientation: 'portrait' })} />
                  Portrait
                </label>
                <label className={`flex-1 border rounded p-2 text-center text-sm cursor-pointer transition ${localSettings.orientation === 'landscape' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" className="hidden" name="orient" checked={localSettings.orientation === 'landscape'} onChange={() => setLocalSettings({ ...localSettings, orientation: 'landscape' })} />
                  Landscape
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Margins</label>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[10px] text-slate-400">Top (mm)</span><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={localSettings.marginTop} onChange={e => setLocalSettings({ ...localSettings, marginTop: e.target.value })} /></div>
                <div><span className="text-[10px] text-slate-400">Bottom (mm)</span><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={localSettings.marginBottom} onChange={e => setLocalSettings({ ...localSettings, marginBottom: e.target.value })} /></div>
                <div><span className="text-[10px] text-slate-400">Left (mm)</span><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={localSettings.marginLeft} onChange={e => setLocalSettings({ ...localSettings, marginLeft: e.target.value })} /></div>
                <div><span className="text-[10px] text-slate-400">Right (mm)</span><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm" value={localSettings.marginRight} onChange={e => setLocalSettings({ ...localSettings, marginRight: e.target.value })} /></div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-sm font-bold">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.8. KOMPONEN: SIGNATURE MODAL (CANVAS)
// ==========================================
function SignatureModal({ isOpen, onClose, onInsert }) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  // --- DRAW TAB LOGIC ---
  useEffect(() => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 500;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [isOpen, activeTab]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // --- UPLOAD TAB LOGIC ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadedImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleInsert = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        onInsert(dataUrl);
      }
    } else {
      if (uploadedImage) onInsert(uploadedImage);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full animate-scale-up overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Insert Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800">✕</button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200">
          <button onClick={() => setActiveTab('draw')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'draw' ? 'bg-white text-emerald-600 border-b-2 border-emerald-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Draw</button>
          <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'upload' ? 'bg-white text-emerald-600 border-b-2 border-emerald-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Upload Image</button>
        </div>

        <div className="p-6 flex justify-center bg-gray-50 min-h-[250px] items-center">
          {activeTab === 'draw' ? (
            <canvas
              ref={canvasRef}
              className="bg-white border border-gray-300 rounded shadow-sm cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ width: '100%', maxWidth: '500px', height: '200px' }}
            />
          ) : (
            <div className="w-full text-center">
              {uploadedImage ? (
                <div className="relative group">
                  <img src={uploadedImage} alt="Preview" className="max-h-[200px] mx-auto border border-gray-300 rounded shadow-sm bg-white" />
                  <button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-emerald-500 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">PNG or JPG (Transparent recommended)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-between">
          <button onClick={() => { if (activeTab === 'draw') clearCanvas(); else setUploadedImage(null); }} className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">
            {activeTab === 'draw' ? 'Clear' : 'Remove'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">Cancel</button>
            <button onClick={handleInsert} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold uppercase tracking-wider shadow-lg">Insert Signature</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.9. KOMPONEN: RENAME MODAL
// ==========================================
function RenameModal({ isOpen, onClose, currentName, onRename }) {
  if (!isOpen) return null;
  const [name, setName] = useState(currentName);

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-scale-up p-6">
        <h3 className="font-bold text-lg text-slate-900 mb-4">Rename File</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:border-emerald-500 outline-none mb-6"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
          <button onClick={() => { onRename(name); onClose(); }} className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm hover:bg-slate-800">Rename</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.10. KOMPONEN: CONFIRM MODAL
// ==========================================
function ConfirmModal({ isOpen, onClose, title, message, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-scale-up p-6">
        <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-500">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.11. KOMPONEN: TABLE MODAL
// ==========================================
function TableModal({ isOpen, onClose, onInsert }) {
  if (!isOpen) return null;
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-scale-up p-5">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Insert Table</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Rows</label><input type="number" min="1" max="20" value={rows} onChange={e => setRows(parseInt(e.target.value))} className="w-full border rounded p-2 mt-1" /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Columns</label><input type="number" min="1" max="10" value={cols} onChange={e => setCols(parseInt(e.target.value))} className="w-full border rounded p-2 mt-1" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
          <button onClick={() => { onInsert(rows, cols); onClose(); }} className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm">Insert</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.12. KOMPONEN: HORIZONTAL LINE MODAL
// ==========================================
function LineModal({ isOpen, onClose, onInsert }) {
  if (!isOpen) return null;
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('1px');
  const [color, setColor] = useState('#000000');

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-scale-up p-5">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Line Settings</h3>
        <div className="space-y-4 mb-6">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Width</label><input type="text" value={width} onChange={e => setWidth(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="e.g. 100%, 50%, 200px" /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Thickness</label><select value={height} onChange={e => setHeight(e.target.value)} className="w-full border rounded p-2 mt-1"><option value="1px">Thin (1px)</option><option value="2px">Medium (2px)</option><option value="4px">Thick (4px)</option><option value="8px">Bold (8px)</option></select></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-10 border rounded mt-1 cursor-pointer" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
          <button onClick={() => { onInsert(width, height, color); onClose(); }} className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm">Insert</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.13. KOMPONEN: SYMBOL MODAL
// ==========================================
function SymbolModal({ isOpen, onClose, onInsert }) {
  if (!isOpen) return null;
  const symbols = "★☆☺☻♡♥☎☏☑☒⚠⚡❄✈✉✎✓✔✕✖✗✘➤➥➢➣➤➔➙VX➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➝➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➵➸➺➻➼➽➾←↑→↓↔↕↖↗↘↙↚↛↜↝↞↟↠↡↢↣↤↥↦↧↨↩↪↫↬↭↮↯↰↱↲↳↴↵↶↷↸↹↺↻↼↽↾↿⇀⇁⇂⇃⇄⇅⇆⇇⇈⇊⇋⇌⇍⇎⇏⇐⇑⇒⇓⇔⇕⇖⇗⇘⇙⇚⇛⇜⇝⇞⇟⇠⇡⇢⇣⇤⇥⇦⇧⇨⇩⇪⇫⇬⇭⇮⇯ কমলা⚘⚜⚝⚛⚡⚠❤❥❦❧☀☁☂★☆☐☑☒☜☝☞☟☠☢☣☮☯☸☹☺☻☼☽☾♔♕♖♗♘♙♚♛♜♝♞♟♡♢♤♧♩♪♫♬♭♮♯©®™€£¥$¢";

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full animate-scale-up p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">Insert Special Character</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800">✕</button>
        </div>
        <div className="grid grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-2 bg-gray-50 rounded border border-gray-200">
          {symbols.split('').map((char, i) => (
            <button key={i} onClick={() => { onInsert(char); onClose(); }} className="p-2 text-lg hover:bg-emerald-100 hover:text-emerald-700 rounded transition">{char}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2.14. KOMPONEN: IMAGE TOOLBAR (FLOATING)
// ==========================================
function ImageToolbar({ image, onUpdate, onDelete }) {
  if (!image) return null;

  return (
    <div className="absolute bg-slate-900/90 text-white rounded-lg shadow-xl backdrop-blur flex items-center gap-1 p-1 z-[50]" style={{ top: image.offsetTop - 50, left: image.offsetLeft }}>
      <button onClick={() => onUpdate({ width: '25%' })} className="px-2 py-1 text-xs font-bold hover:bg-white/20 rounded">25%</button>
      <button onClick={() => onUpdate({ width: '50%' })} className="px-2 py-1 text-xs font-bold hover:bg-white/20 rounded">50%</button>
      <button onClick={() => onUpdate({ width: '100%' })} className="px-2 py-1 text-xs font-bold hover:bg-white/20 rounded">100%</button>
      <div className="w-px h-4 bg-white/20 mx-1"></div>
      <button onClick={() => onUpdate({ style: { float: 'left', margin: '0 10px 10px 0' } })} className="p-1 hover:bg-white/20 rounded"><Icons.AlignLeft /></button>
      <button onClick={() => onUpdate({ style: { float: 'none', display: 'block', margin: '0 auto' } })} className="p-1 hover:bg-white/20 rounded"><Icons.AlignCenter /></button>
      <button onClick={() => onUpdate({ style: { float: 'right', margin: '0 0 10px 10px' } })} className="p-1 hover:bg-white/20 rounded"><Icons.AlignRight /></button>
      <div className="w-px h-4 bg-white/20 mx-1"></div>
      <button onClick={() => onUpdate({ className: 'rounded-xl shadow-lg border-4 border-white' })} className="px-2 py-1 text-xs hover:bg-white/20 rounded">Style</button>
      <button onClick={onDelete} className="p-1 hover:bg-red-500/50 text-red-300 hover:text-white rounded ml-1">✕</button>
    </div>
  );
}

// ==========================================
// 4. DATA MENU DROPDOWN (UPDATED)
// ==========================================
const MENU_DATA = {
  File: ['Share', 'New', 'Open', 'Make a copy', 'Rename', 'Page setup'],
  Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select all', 'Find and replace'],
  View: ['Toggle Details', 'Show print layout', 'Show ruler', 'Full screen'],
  Insert: ['Image', 'Import PDF Data', 'Table', 'Horizontal line', 'Signature', 'Special characters'], // Link removed
  Format: ['Text', 'Paragraph styles', 'Align & indent', 'Line & paragraph spacing', 'Bullets & numbering', 'Clear formatting'],
  Tools: ['Spelling and grammar', 'Word count', 'Voice typing', 'Extensions'],
  Help: ['Help', 'Report Issue']
};

const FONT_FAMILIES = [
  "Arial", "Verdana", "Times New Roman", "Georgia", "Courier New",
  "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins",
  "Merriweather", "Playfair Display", "Oswald", "Raleway",
  "Nunito", "Ubuntu", "Dancing Script", "Pacifico", "Lobster", "Caveat"
];

function InvoiceViewer() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // STATE UI
  const [isEditing, setIsEditing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(90); // Default 90%
  const [activeMenu, setActiveMenu] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWordCount, setShowWordCount] = useState(false);
  const [spellCheck, setSpellCheck] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ADVANCED FEATURES STATE
  const [showTableModal, setShowTableModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [signatures, setSignatures] = useState([]); // Array of {id, src, x, y, width, height}
  const [selectedImage, setSelectedImage] = useState(null); // DOM Element ref

  const [pageSettings, setPageSettings] = useState({
    size: 'A4',
    orientation: 'portrait',
    marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 20
  });

  // STATE VIEW
  const [showRuler, setShowRuler] = useState(true);
  const [printLayout, setPrintLayout] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [docStats, setDocStats] = useState({ words: 0, chars: 0 });

  // EDITOR STATE
  const [fontName, setFontName] = useState("Arial");
  const [fontSize, setFontSize] = useState("3");
  const [paintFormat, setPaintFormat] = useState(null); // { bold, italic, underline, fontName, fontSize, color, hilite }
  const invoiceRef = useRef();

  // REAL-TIME DOC STATS
  useEffect(() => {
    const interval = setInterval(() => {
      if (invoiceRef.current) {
        const text = invoiceRef.current.innerText || "";
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        setDocStats({ words, chars: text.length });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Mobile Auto-Zoom and Listeners
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setZoomLevel(50);
      }
    };

    // Initial check
    if (window.innerWidth < 768) {
      setZoomLevel(50);
    }

    // Optional: Add resize listener if dynamic resize is desired, 
    // but usually initial load is enough to prevent jumping.
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const rawData = searchParams.get('data');
    setTimeout(() => {
      if (rawData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawData));
          setInvoices(Array.isArray(parsed) ? parsed : [parsed]);
          showToast("Siap", "Dokumen berhasil dimuat.", "success");
        } catch (e) { console.error(e); }
      } else {
        const savedData = localStorage.getItem('invoice_data');
        if (savedData) {
          try {
            setInvoices(JSON.parse(savedData));
            showToast("Restored", "Dokumen terakhir dipulihkan.", "success");
          } catch (e) {
            setInvoices([]); // Blank if error
          }
        } else {
          setInvoices([]); // BLANK STATE (No Demo Data)
        }
      }
      setIsLoading(false);
    }, 1000);
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && invoices.length > 0) {
      localStorage.setItem('invoice_data', JSON.stringify(invoices));
    }
  }, [invoices, isLoading]);

  const currentData = invoices[currentIndex] || { no: "", customer: "", date: "", items: [], grandTotal: "0", email: "" };

  const showToast = (title, message, type = 'success') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- SUPABASE ACTIONS ---
  const saveToSupabase = async () => {
    if (!currentData) return;
    showToast("Cloud", "Menyimpan ke Supabase...", "info");

    // Menggunakan upsert agar tidak error saat menyimpan ulang nomor yang sama
    const { data, error } = await supabase
      .from('invoices')
      .upsert({
        no: currentData.no,
        content: currentData,
        updated_at: new Date()
      }, { onConflict: 'no' });

    if (error) {
      console.error('Supabase Error:', error);
      showToast("Gagal", "Gagal menyimpan ke Cloud.", "error");
    } else {
      showToast("Sukses", "Disimpan ke Cloud.", "success");
    }
  };

  const loadFromSupabase = async () => {
    showToast("Cloud", "Mengambil data...", "info");
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      showToast("Error", "Gagal mengambil data.", "error");
    } else if (data) {
      const formattedInvoices = data.map(row => row.content);
      setInvoices(formattedInvoices);
      setShowOpenModal(true);
      showToast("Sukses", `${data.length} dokumen dimuat dari Cloud.`, "success");
    }
  };

  const preventFocusLoss = (e) => e.preventDefault();

  // --- LOGIKA MASTER MENU ---
  const handleMenuClick = async (category, action) => {
    setActiveMenu(null);
    if (category === 'File') {
      if (action === 'Share') { navigator.clipboard.writeText(window.location.href); showToast("Link Disalin", "Tautan siap dibagikan.", "success"); }
      else if (action === 'New') {
        setConfirmAction({
          title: "Buat Dokumen Baru?",
          message: "Perubahan yang belum disimpan mungkin hilang. Lanjutkan?",
          action: () => {
            setInvoices([{
              no: "Untitled",
              customer: "",
              date: new Date().toLocaleDateString('id-ID'),
              items: [{ desc: "", qty: 1, price: 0, total: 0 }],
              grandTotal: "0",
              email: "",
              sender: { name: "", address: "", footer: "" }
            }]);
            setCurrentIndex(0);
            showToast("Reset", "Dokumen kosong dibuat.", "info");
          }
        });
        setShowConfirmModal(true);
      }
      else if (action === 'Make a copy') {
        const copy = JSON.parse(JSON.stringify(currentData));
        copy.no = `Copy of ${copy.no}`;
        setInvoices(prev => [...prev, copy]);
        setCurrentIndex(invoices.length);
        showToast("Duplikat", "Salinan dokumen dibuat.", "success");
      }
      else if (action === 'Rename') { setShowRenameModal(true); }
      else if (action === 'Page setup') { setShowPageSetup(true); }
      else if (action === 'Open') { loadFromSupabase(); }
    } else if (category === 'Edit') {
      const map = { 'Undo': 'undo', 'Redo': 'redo', 'Cut': 'cut', 'Copy': 'copy', 'Paste': 'paste', 'Select all': 'selectAll' };
      if (map[action]) formatText(map[action]);
      else if (action === 'Find and replace') { const term = prompt("Cari teks:"); if (term && window.find) window.find(term); }
    } else if (category === 'View') {
      if (action === 'Toggle Details') setShowRightSidebar(!showRightSidebar);
      else if (action === 'Show print layout') setPrintLayout(!printLayout);
      else if (action === 'Show ruler') setShowRuler(!showRuler);
      else if (action === 'Full screen') { !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen(); }
    } else if (category === 'Insert') {
      if (action === 'Image') document.getElementById('imgInputHidden').click();
      else if (action === 'Import PDF Data') document.getElementById('pdfInputHidden').click();
      else if (action === 'Horizontal line') setShowLineModal(true);
      else if (action === 'Table') setShowTableModal(true);
      else if (action === 'Signature') setShowSignatureModal(true);
      else if (action === 'Special characters') setShowSymbolModal(true);
    } else if (category === 'Format') {
      if (action === 'Clear formatting') formatText('removeFormat');
      else if (action === 'Bold') formatText('bold');
      else if (action === 'Italic') formatText('italic');
      else if (action === 'Underline') formatText('underline');
      else if (action === 'Strikethrough') formatText('strikeThrough');
      else if (action === 'Superscript') formatText('superscript');
      else if (action === 'Subscript') formatText('subscript');
      else if (action === 'Align & indent') showToast("Info", "Gunakan toolbar untuk alignment.", "info");
    } else if (category === 'Tools') {
      if (action === 'Word count') setShowWordCount(true);
      else if (action === 'Spelling and grammar') { setSpellCheck(!spellCheck); showToast("Spell Check", !spellCheck ? "Aktif" : "Non-aktif", "info"); }
      else if (action === 'Voice typing') startVoiceTyping();
      else if (action === 'Extensions') showToast("Extensions", "Belum ada ekstensi terinstall.", "warning");
    } else if (category === 'Help') {
      if (action === 'Help') window.open('https://support.google.com/docs', '_blank');
      else if (action === 'Report Issue') showToast("Report", "Silakan hubungi admin.", "info");
    }
  };

  const startVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast("Maaf", "Browser tidak mendukung Voice Typing.", "error"); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.start();
    showToast("Mendengarkan...", "Silakan bicara.", "info");

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      formatText('insertText', text);
    };
    recognition.onerror = () => showToast("Error", "Gagal mengenali suara.", "error");
  };

  const formatText = (cmd, value = null) => {
    if (!isEditing) { showToast("Terkunci", "Aktifkan Mode Edit.", "error"); return; }
    document.execCommand(cmd, false, value);
    // Focus back to editor after formatting if needed, but execCommand usually handles it.
  };

  const handlePaintFormat = () => {
    if (paintFormat) {
      setPaintFormat(null);
      showToast("Paint Format", "Format dibatalkan.", "info");
    } else {
      // Capture current style
      // Note: queryCommandValue is standard for contentEditable
      const style = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        fontName: document.queryCommandValue('fontName'),
        fontSize: document.queryCommandValue('fontSize'),
        // colors often return rgb strings or hex
        foreColor: document.queryCommandValue('foreColor'),
        hiliteColor: document.queryCommandValue('hiliteColor')
      };
      setPaintFormat(style);
      showToast("Paint Format", "Format disalin! Pilih teks untuk menerapkan.", "success");
    }
  };

  const applyPaintFormat = () => {
    if (!paintFormat || !isEditing) return;

    // Apply styles in sequence
    // Note: This is an approximation. Ideally we'd compare state.
    if (paintFormat.bold !== document.queryCommandState('bold')) formatText('bold');
    if (paintFormat.italic !== document.queryCommandState('italic')) formatText('italic');
    if (paintFormat.underline !== document.queryCommandState('underline')) formatText('underline');
    formatText('fontName', paintFormat.fontName);
    formatText('fontSize', paintFormat.fontSize);
    formatText('foreColor', paintFormat.foreColor);
    formatText('hiliteColor', paintFormat.hiliteColor);

    setPaintFormat(null); // Consume
    showToast("Selesai", "Format diterapkan.", "success");
  };




  // --- HANDLERS FOR NEW FEATURES ---
  const handleInsertTable = (rows, cols) => {
    let html = '<table style="width:100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #cbd5e1;"><tbody>';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td style="padding: 8px; border: 1px solid #cbd5e1; min-width: 50px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br/></p>';
    formatText('insertHTML', html);
  };

  const handleInsertLine = (width, height, color) => {
    formatText('insertHTML', `<hr style="width:${width}; height:${height}; background-color:${color}; border:none; margin: 10px 0;" /><p><br/></p>`);
  };

  const handleInsertSymbol = (char) => formatText('insertText', char);

  const handleInsertSignature = (dataUrl) => {
    setSignatures(prev => [...prev, { id: Date.now(), src: dataUrl, x: 100, y: 100, width: 200, height: 100 }]);
    showToast("Signature", "Tanda tangan ditambahkan. Geser untuk memindahkan.", "success");
  };

  const updateSignature = (id, updates) => {
    setSignatures(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // IMAGE HANDLING
  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      setSelectedImage(e.target);
    } else {
      setSelectedImage(null);
    }
  };

  const updateSelectedImage = (updates) => {
    if (!selectedImage) return;
    if (updates.width) selectedImage.style.width = updates.width;
    if (updates.style) Object.assign(selectedImage.style, updates.style);
    if (updates.className) selectedImage.className = updates.className;
    setSelectedImage(null); // Close toolbar after action
  };

  const deleteSelectedImage = () => {
    if (selectedImage) {
      selectedImage.remove();
      setSelectedImage(null);
    }
  };


  const handleImportPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast("PDF Import", "Membaca layout PDF...", "info");
    try {
      // Use global pdfjsLib
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);

      // Get Text Content with Styles
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.5 }); // Scale for better visibility

      // Construct HTML from Text Items
      // This maps PDF absolute coordinates to HTML absolute/relative positioning approximation
      let htmlContent = '<div style="position: relative; width: 100%; height: 1000px;">';

      textContent.items.forEach(item => {
        // PDF coords: (0,0) is bottom-left. We need to flip Y.
        // item.transform = [scaleX, skewY, skewX, scaleY, x, y]
        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // Flip Y
        const fontSize = Math.sqrt(tx[0] * tx[3]); // Approximate
        const text = item.str;

        // Simple heuristic: Ignore empty strings
        if (!text.trim()) return;

        htmlContent += `<div style="position: absolute; left: ${x}px; top: ${y / 2}px; font-size: ${Math.max(12, fontSize)}px; white-space: nowrap;">${text}</div>`;
      });
      htmlContent += '</div>';

      // Fallback: If empty, use primitive scraping
      if (textContent.items.length === 0) {
        const text = textContent.items.map(item => item.str).join(' ');
        htmlContent = `<p>${text}</p>`;
      }

      // Try to extract Invoice Metadata for the sidebar/header
      const text = textContent.items.map(item => item.str).join(' ');
      const invoiceNoMatch = text.match(/(?:Invoice|No)[:\.\s]*([A-Z0-9\-\.]+)/i);
      const totalMatch = text.match(/(?:Total|Tagihan)[:\.\s]*([Rp\$\d\.,]+)/i);

      setInvoices(prev => [...prev, {
        no: invoiceNoMatch ? invoiceNoMatch[1] : `IMP-${Math.floor(Math.random() * 1000)}`,
        date: new Date().toLocaleDateString(),
        customer: "Imported PDF",
        items: [{ desc: "Imported PDF Content (Editable)", qty: 1, price: 0, total: totalMatch ? totalMatch[1] : "0" }],
        grandTotal: totalMatch ? totalMatch[1] : "0",
        // Inject HTML into a special field or just overwrite the content if we move to full HTML storage
        // For now, we simulate "Imported" by resetting logic but here we are in "Editor"
      }]);

      // Inject content directly into editor
      if (invoiceRef.current) {
        invoiceRef.current.innerHTML = htmlContent;
      }

      setCurrentIndex(invoices.length);
      showToast("Sukses", "Layout PDF di-import.", "success");
    } catch (err) {
      console.error(err);
      showToast("Error", "Gagal membaca PDF.", "error");
    }
  };

  const handleImageChange = (e) => { if (e.target.files[0]) formatText('insertImage', URL.createObjectURL(e.target.files[0])); };
  const handleZoom = (val) => setZoomLevel(prev => Math.min(Math.max(prev + val, 50), 200));
  const handleDownloadPDF = async () => {
    setIsEditing(false);
    setZoomLevel(100);
    showToast("PDF", "Memproses...", "info");
    setTimeout(async () => {
      if (!invoiceRef.current) return;
      try {
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Invoice-${currentData?.no}.pdf`);
        showToast("Selesai", "PDF tersimpan.", "success");
      } catch (e) {
        console.error(e);
        showToast("Error", "Gagal memproses PDF.", "error");
      }
    }, 800);
  };
  const toggleEditMode = () => { setIsEditing(!isEditing); showToast(!isEditing ? "Mode Edit" : "Mode Baca", !isEditing ? "Silakan mengetik." : "Terkunci.", !isEditing ? "info" : "warning"); };

  if (!currentData) {
    return (
      <div className="min-h-screen bg-[#F9FBFD] flex flex-col items-center justify-center text-center p-4">
        <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center mb-6 animate-scale-up text-emerald-600">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No Document Loaded</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-8">Please open a document from the File menu, load from cloud, or use a valid Google Sheets URL.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setShowOpenModal(true)} className="px-6 py-2 bg-slate-900 text-white rounded font-bold shadow-lg hover:bg-slate-800 transition">Open Document</button>
          <button onClick={loadFromSupabase} className="px-6 py-2 bg-emerald-600 text-white rounded font-bold shadow-lg hover:bg-emerald-500 transition">Load from Cloud</button>
        </div>
        <OpenDocumentModal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} invoices={invoices} onSelect={(idx) => { setCurrentIndex(idx); setShowOpenModal(false); showToast("Loaded", `Dokumen #${invoices[idx]?.no} dibuka.`, "success"); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFD] flex flex-col font-sans text-slate-800" onClick={() => setActiveMenu(null)}>
      {isLoading && <div className="fixed inset-0 bg-white/95 z-[9999] flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mb-4"></div><p>Loading...</p></div>}
      <NotificationToast notif={notification} onClose={() => setNotification(null)} />
      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} data={currentData} onSend={() => showToast("Terkirim", "Email sukses.", "success")} />
      <WordCountModal isOpen={showWordCount} onClose={() => setShowWordCount(false)} textRef={invoiceRef} />
      <OpenDocumentModal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} invoices={invoices} onSelect={(idx) => { setCurrentIndex(idx); setShowOpenModal(false); showToast("Loaded", `Dokumen #${invoices[idx]?.no} dibuka.`, "success"); }} />
      <PageSetupModal isOpen={showPageSetup} onClose={() => setShowPageSetup(false)} settings={pageSettings} onSave={(s) => { setPageSettings(s); showToast("Page Setup", "Pengaturan disimpan.", "success"); }} />
      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} onInsert={handleInsertSignature} />
      <TableModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={handleInsertTable} />
      <LineModal isOpen={showLineModal} onClose={() => setShowLineModal(false)} onInsert={handleInsertLine} />
      <SymbolModal isOpen={showSymbolModal} onClose={() => setShowSymbolModal(false)} onInsert={handleInsertSymbol} />
      <RenameModal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} currentName={currentData.no} onRename={(newName) => { setInvoices(prev => prev.map((inv, idx) => idx === currentIndex ? { ...inv, no: newName } : inv)); showToast("Rename", "Dokumen dinamai ulang.", "success"); }} />
      <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={confirmAction?.title} message={confirmAction?.message} onConfirm={confirmAction?.action} />
      <input type="file" id="imgInputHidden" hidden onChange={handleImageChange} />
      <input type="file" id="pdfInputHidden" hidden accept=".pdf" onChange={handleImportPDF} />

      {/* NAVBAR */}
      <nav className="w-full bg-[#1A1A1A] text-white px-4 py-2 flex justify-between items-center sticky top-0 z-[100] border-b border-gray-700 h-14">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-emerald-600 rounded flex items-center justify-center text-white shadow-lg"><Icons.Logo /></div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide hidden md:block">SHEET WORKER TOOLS</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest hidden md:inline">Empowering Productivity</span>
              <span className="text-[10px] text-gray-500 hidden md:inline">•</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest max-w-[150px] md:max-w-[200px] truncate" title={currentData?.no}>{currentData?.no || "Untitled"}</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS (5 BUTTONS) */}
        {/* ACTION BUTTONS (5 BUTTONS) - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
          <button onClick={() => window.print()} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold transition shadow-lg border border-slate-600">
            <Icons.Print /> <span className="hidden md:inline">Print</span>
          </button>
          <button onClick={() => setShowEmailModal(true)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-bold transition shadow-lg border border-blue-600">
            <Icons.Email /> <span className="hidden md:inline">Email</span>
          </button>
          <button onClick={handleDownloadPDF} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition shadow-lg border border-emerald-600">
            <Icons.Pdf /> PDF
          </button>
          <button onClick={toggleEditMode} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition border shadow-lg ${isEditing ? "bg-yellow-500 text-slate-900 border-yellow-500 hover:bg-yellow-400" : "bg-slate-700 text-white border-slate-600 hover:bg-slate-600"}`}>
            <Icons.Edit /> {isEditing ? "Finish" : "Edit"}
          </button>
          <button onClick={saveToSupabase} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs font-bold transition shadow-lg border border-indigo-600">
            <Icons.Save /> <span className="hidden md:inline">Simpan</span>
          </button>
        </div>
      </nav>

      {/* MENU BAR */}
      <div className="w-full bg-white border-b border-gray-300 px-4 flex items-center gap-1 text-[13px] text-slate-700 select-none sticky top-14 z-[90] h-9 shadow-sm overflow-x-auto no-scrollbar">
        {Object.keys(MENU_DATA).map((menuName) => (
          <div key={menuName} className="relative h-full flex items-center">
            <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === menuName ? null : menuName); }} className={`px-3 py-1 rounded hover:bg-gray-100 transition ${activeMenu === menuName ? "bg-gray-200" : ""}`}>{menuName}</button>
            {activeMenu === menuName && <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl rounded-b-lg py-1 min-w-[220px] z-[110] flex flex-col animate-fade-in-down">{MENU_DATA[menuName].map((item, idx) => (<button key={idx} onClick={() => handleMenuClick(menuName, item)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 flex justify-between group"><span>{item}</span></button>))}</div>}
          </div>
        ))}
      </div>

      {/* TOOLBAR LENGKAP - URUTAN SESUAI PERMINTAAN */}
      <div className="w-full bg-[#EDF2FA] border-b border-gray-300 px-4 py-1.5 flex items-center gap-1 overflow-x-auto sticky top-[92px] z-[80] shadow-sm h-12">
        {/* 1. Riwayat & Print */}
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('undo')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Undo"><Icons.Undo /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('redo')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Redo"><Icons.Redo /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => window.print()} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Print"><Icons.Print /></button>
        <button onMouseDown={preventFocusLoss} onClick={handlePaintFormat} className={`p-1.5 rounded transition ${paintFormat ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' : 'hover:bg-gray-200 text-slate-600'}`} title="Paint Format"><Icons.FormatPaint /></button>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* 2. Style & Font */}
        <select onChange={(e) => formatText('formatBlock', e.target.value)} className="bg-transparent text-sm border border-transparent hover:border-gray-300 rounded px-1 h-7 text-slate-700 outline-none cursor-pointer w-28">
          <option value="p">Normal text</option>
          <option value="h1">Title</option>
          <option value="h2">Heading 1</option>
          <option value="h3">Heading 2</option>
          <option value="h4">Heading 3</option>
        </select>
        <div className="w-px h-5 bg-gray-300 mx-2"></div>
        <select onChange={(e) => { setFontName(e.target.value); formatText('fontName', e.target.value); }} value={fontName} className="bg-transparent text-sm border border-transparent hover:border-gray-300 rounded px-1 h-7 text-slate-700 outline-none cursor-pointer w-28">
          {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
        </select>
        <div className="w-px h-5 bg-gray-300 mx-2"></div>
        <select onChange={(e) => { setFontSize(e.target.value); formatText('fontSize', e.target.value); }} value={fontSize} className="bg-transparent text-sm border border-gray-300 rounded px-1 h-7 text-slate-700 outline-none hover:border-gray-400 cursor-pointer w-14">
          {/* Note: execCommand fontSize uses 1-7 mapping */}
          <option value="1">Small (10px)</option>
          <option value="2">Normal (13px)</option>
          <option value="3">Medium (16px)</option>
          <option value="4">Large (18px)</option>
          <option value="5">X-Large (24px)</option>
          <option value="6">XX-Large (32px)</option>
          <option value="7">Huge (48px)</option>
        </select>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* 3. Formatting */}
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('bold')} className="p-1.5 hover:bg-gray-200 rounded text-slate-700 font-bold" title="Bold"><Icons.Bold /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('italic')} className="p-1.5 hover:bg-gray-200 rounded text-slate-700 italic" title="Italic"><Icons.Italic /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('underline')} className="p-1.5 hover:bg-gray-200 rounded text-slate-700 underline" title="Underline"><Icons.Underline /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('foreColor', '#EF4444')} className="p-1.5 hover:bg-gray-200 rounded text-red-500" title="Text Color"><Icons.TextColor /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('hiliteColor', '#FEF08A')} className="p-1.5 hover:bg-gray-200 rounded text-yellow-500" title="Highlight Color"><Icons.Highlight /></button>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* 4. Insert */}
        {/* 4. Insert */}
        <button onMouseDown={preventFocusLoss} onClick={() => document.getElementById('imgInputHidden').click()} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Image"><Icons.Image /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => setShowTableModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Table">T</button>
        <button onMouseDown={preventFocusLoss} onClick={() => setShowLineModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Line">--</button>
        <button onMouseDown={preventFocusLoss} onClick={() => setShowSymbolModal(true)} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Symbol">Ω</button>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* 5. Alignments */}
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('justifyLeft')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Align Left"><Icons.AlignLeft /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('justifyCenter')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Align Center"><Icons.AlignCenter /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('justifyRight')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Align Right"><Icons.AlignRight /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('justifyFull')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Justify"><Icons.AlignJustify /></button>

        <div className="w-px h-5 bg-gray-300 mx-2"></div>

        {/* 6. Lists & Indents */}
        <button onMouseDown={preventFocusLoss} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Checklist" onClick={() => formatText('insertText', '☐ ')}><Icons.ListCheck /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Bullet List"><Icons.ListBulleted /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Numbered List"><Icons.ListNumbered /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('outdent')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Decrease Indent"><Icons.IndentDecrease /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('indent')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600" title="Increase Indent"><Icons.IndentIncrease /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('removeFormat')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 ml-1" title="Clear Formatting"><Icons.ClearFormat /></button>

        {/* Zoom Control */}
        <div className="ml-auto flex items-center border border-gray-300 rounded px-1 h-7 bg-white shadow-sm">
          <button onClick={() => handleZoom(-10)} className="px-2 hover:bg-gray-100 text-slate-600">-</button>
          <span className="text-xs font-medium w-10 text-center select-none">{zoomLevel}%</span>
          <button onClick={() => handleZoom(10)} className="px-2 hover:bg-gray-100 text-slate-600">+</button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex w-full flex-1 overflow-hidden h-full relative">
        <div className={`flex-1 overflow-auto flex justify-center p-8 pb-32 ${printLayout ? 'bg-[#EDF0F2]' : 'bg-white'}`}>
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-200 h-max">
            {showRuler && printLayout && <div className="w-[210mm] h-6 bg-white border-b border-gray-300 mb-2 flex items-end text-[8px] text-gray-400 select-none">{[...Array(20)].map((_, i) => <div key={i} className="flex-1 border-r border-gray-300 h-2 flex justify-end pr-1">{i + 1}</div>)}</div>}

            <div ref={invoiceRef} contentEditable={isEditing} spellCheck={spellCheck} suppressContentEditableWarning={true}
              onMouseUp={applyPaintFormat} onClick={handleEditorClick}
              style={{
                width: pageSettings.size === 'A4' ? (pageSettings.orientation === 'portrait' ? '210mm' : '297mm') : (pageSettings.orientation === 'portrait' ? '215.9mm' : '279.4mm'),
                minHeight: pageSettings.size === 'A4' ? (pageSettings.orientation === 'portrait' ? '297mm' : '210mm') : (pageSettings.orientation === 'portrait' ? '279.4mm' : '215.9mm'),
                paddingTop: `${pageSettings.marginTop}mm`, paddingBottom: `${pageSettings.marginBottom}mm`, paddingLeft: `${pageSettings.marginLeft}mm`, paddingRight: `${pageSettings.marginRight}mm`
              }}
              className={`bg-white ${printLayout ? 'shadow-2xl' : ''} editor-canvas flex flex-col ${isEditing ? "outline-none ring-2 ring-emerald-500/50" : "outline-none"}`}>
              <div className="flex-grow">
                {/* Header Dinamis */}
                <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-6">
                  <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">INVOICE</h1>
                    <p className="text-slate-500 mt-1 font-medium">#{currentData.no}</p>
                  </div>
                  {currentData.sender ? (
                    <div className="text-right">
                      <h2 className="text-xl font-bold uppercase text-slate-900">{currentData.sender.name}</h2>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed whitespace-pre-line">{currentData.sender.address}</p>
                    </div>
                  ) : (
                    // Blank Default jika tidak ada data sender
                    <div className="text-right opacity-0 hover:opacity-100 transition duration-300 border border-dashed border-gray-300 p-2 rounded">
                      <span className="text-xs text-gray-400">[Company Info Hidden]</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mb-10"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ditujukan Kepada:</p><h3 className="text-lg font-bold text-slate-800">{currentData.customer}</h3><p className="text-slate-600 text-sm">{currentData.email}</p></div><div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal:</p><p className="font-semibold text-slate-800">{currentData.date}</p></div></div>
                <table className="w-full mb-10 border-collapse"><thead><tr className="border-b border-slate-300"><th className="py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi</th><th className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th><th className="py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Harga</th><th className="py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th></tr></thead><tbody className="text-sm text-slate-700">{currentData.items && currentData.items.map((item, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-4 font-medium">{item.desc}</td><td className="py-4 text-center">{item.qty}</td><td className="py-4 text-right">{item.price}</td><td className="py-4 text-right font-bold text-slate-900">{item.total}</td></tr>))}</tbody></table>
                <div className="flex justify-end mt-4"><div className="text-right"><p className="text-xs text-slate-500 mb-1">Total Tagihan</p><p className="text-3xl font-extrabold text-black">{currentData.grandTotal}</p></div></div>
                <div className="mt-32"></div>

                {/* Footer Dinamis */}
                <div className="pt-6 border-t border-slate-200 flex justify-between items-end break-inside-avoid">
                  <div className="text-xs text-slate-500 w-1/2">
                    {currentData.notes ? (
                      <>
                        <p className="font-bold text-slate-700 mb-2">Catatan:</p>
                        <p className="whitespace-pre-line">{currentData.notes}</p>
                      </>
                    ) : (
                      <p className="italic text-gray-300">[No Notes]</p>
                    )}
                  </div>
                  <div className="text-right min-w-[220px]">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-24">{currentData.sender?.footer || "Authorized Sign"}</p>
                    <div className="border-t border-slate-400 pt-2 px-4 w-full"><p className="text-sm font-bold text-slate-900">{currentData.sender?.dept || "Finance Dept"}</p></div>
                  </div>
                </div>
              </div>
              <div className="mt-12 text-center text-[9px] text-slate-300 uppercase tracking-widest">System Generated Document by Sheet Worker Tools</div>
            </div>

            {/* SIGNATURE OVERLAY */}
            {signatures.map(sig => (
              <div key={sig.id}
                style={{ position: 'absolute', left: sig.x, top: sig.y, width: sig.width, height: sig.height, cursor: isEditing ? 'move' : 'default', border: isEditing ? '1px dashed #cbd5e1' : 'none', zIndex: 10, touchAction: 'none' }}
                onMouseDown={(e) => {
                  if (!isEditing) return;
                  e.preventDefault();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startLeft = sig.x;
                  const startTop = sig.y;

                  const onMove = (mv) => {
                    updateSignature(sig.id, { x: startLeft + (mv.clientX - startX), y: startTop + (mv.clientY - startY) });
                  };
                  const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                  };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }}
                onTouchStart={(e) => {
                  if (!isEditing) return;
                  const touch = e.touches[0];
                  const startX = touch.clientX;
                  const startY = touch.clientY;
                  const startLeft = sig.x;
                  const startTop = sig.y;

                  const onTouchMove = (mv) => {
                    const t = mv.touches[0];
                    updateSignature(sig.id, { x: startLeft + (t.clientX - startX), y: startTop + (t.clientY - startY) });
                  };
                  const onTouchEnd = () => {
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                  };
                  document.addEventListener('touchmove', onTouchMove, { passive: false });
                  document.addEventListener('touchend', onTouchEnd);
                }}
              >
                <img src={sig.src} className="w-full h-full object-contain pointer-events-none" />
                {isEditing && <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 cursor-nwse-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const startW = sig.width;
                    const startH = sig.height;
                    const aspect = startW / startH;

                    const onMove = (mv) => {
                      const newW = Math.max(50, startW + (mv.clientX - startX));
                      updateSignature(sig.id, { width: newW, height: newW / aspect });
                    };
                    const onUp = () => {
                      document.removeEventListener('mousemove', onMove);
                      document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    const startX = touch.clientX;
                    const startW = sig.width;
                    const startH = sig.height;
                    const aspect = startW / startH;

                    const onTouchMove = (mv) => {
                      const t = mv.touches[0];
                      const newW = Math.max(50, startW + (t.clientX - startX));
                      updateSignature(sig.id, { width: newW, height: newW / aspect });
                    };
                    const onTouchEnd = () => {
                      document.removeEventListener('touchmove', onTouchMove);
                      document.removeEventListener('touchend', onTouchEnd);
                    };
                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                    document.addEventListener('touchend', onTouchEnd);
                  }}
                />}
              </div>
            ))}

            <ImageToolbar image={selectedImage} onUpdate={updateSelectedImage} onDelete={deleteSelectedImage} />
          </div>
        </div>

        {showRightSidebar && (
          <div className="w-[300px] bg-white border-l border-gray-200 hidden xl:flex flex-col z-[80] shadow-xl animate-slide-in-right h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
              <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Details</h3>
              <button onClick={() => setShowRightSidebar(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>
            {/* Content */}
            <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {/* Doc Info */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 border-b border-gray-100 pb-1">Document Info</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="block font-bold text-lg text-slate-800">{docStats.words}</span>
                    Words
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="block font-bold text-lg text-slate-800">{docStats.chars}</span>
                    Chars
                  </div>
                </div>
              </div>
              {/* View Settings */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb- text-slate-900 mb-2 border-b border-gray-100 pb-1">View Settings</h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Zoom Level</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{zoomLevel}%</span>
                </div>
              </div>
              {/* Paper Settings */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 border-b border-gray-100 pb-1">Paper Settings</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600"><span>Size</span> <span className="font-medium text-slate-800">{pageSettings.size}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Orientation</span> <span className="font-medium text-slate-800 capitalize">{pageSettings.orientation}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Margins (Top)</span> <span className="font-medium text-slate-800">{pageSettings.marginTop}mm</span></div>
                </div>
              </div>
              {/* Actions */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 border-b border-gray-100 pb-1">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.print()} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition border border-gray-200">
                    <Icons.Print /> Print
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. ICONS SVG COLLECTION (LENGKAP SEMUA FUNGSI)
// ==========================================
const Icons = {
  Logo: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>,
  Undo: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>,
  Redo: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" /></svg>,
  Print: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h3v4h12v-4h3v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-2h8zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z" /><circle cx="18" cy="11.5" r="1" /></svg>,
  FormatPaint: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4h-9c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-2h1v-2h1c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-1zM8 16c0 .55-.45 1-1 1s-1-.45-1-1v-2h2v2z" /></svg>,
  Bold: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.98-2.83-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>,
  Italic: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>,
  Underline: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" /></svg>,
  TextColor: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z" /><path d="M2 20h20v4H2z" fill="#000000" /></svg>,
  Highlight: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 14l3 3v5h6v-5l3-3V9H6v5zm5-12h2v3h-2V2zM3.5 5.88l1.41-1.41 2.12 2.12-1.41 1.41L3.5 5.88zm13.46.71l2.12-2.12 1.41 1.41-2.12 2.12-1.41-1.41z" /></svg>,
  Link: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>,
  Image: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>,
  AlignLeft: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>,
  AlignCenter: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>,
  AlignRight: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>,
  AlignJustify: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" /></svg>,
  ListBulleted: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12.17c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.68-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>,
  ListNumbered: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>,
  ListCheck: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" /><path d="M17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z" /></svg>,
  IndentDecrease: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z" /></svg>,
  IndentIncrease: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z" /></svg>,
  ClearFormat: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.55 5.27 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z" /></svg>,
  Save: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" /></svg>,
  Email: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>,
  Pdf: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v2.5zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5v1.5H19v2.5h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" /></svg>,
  Edit: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>,
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvoiceViewer />
    </Suspense>
  );
}
