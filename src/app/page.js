'use client';

import { useEffect, useState, useRef, Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';

import { supabase } from '../lib/supabaseClient';
// pdfjs-dist removed from top-level to prevent SSR DOMMatrix error
import { Icons } from '../components/Icons';
import ImageResizer from '../components/ImageResizer';
import TableToolbar from '../components/TableToolbar';
import LineToolbar from '../components/LineToolbar';
import FindReplaceModal from '../components/FindReplaceModal';

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

    let totalWords = 0;
    let totalChars = 0;

    // Handle array of refs (multi-page) or single ref
    const refs = Array.isArray(textRef.current) ? textRef.current : [textRef.current];

    refs.forEach(ref => {
      if (!ref) return;
      const text = ref.innerText || "";
      const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      totalWords += words;
      totalChars += text.length;
    });

    return { words: totalWords, chars: totalChars };
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
                <option value="A3">A3 (297mm x 420mm)</option>
                <option value="A5">A5 (148mm x 210mm)</option>
                <option value="Letter">Letter (8.5" x 11")</option>
                <option value="Legal">Legal (8.5" x 14")</option>
                <option value="Tabloid">Tabloid (11" x 17")</option>
                <option value="Executive">Executive (7.25" x 10.5")</option>
                <option value="Statement">Statement (5.5" x 8.5")</option>
                <option value="B5">B5 (176mm x 250mm)</option>
                <option value="Folio">Folio (8.5" x 13")</option>
                <option value="Quarto">Quarto (215mm x 275mm)</option>
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
// 2.14. KOMPONEN: IMAGE RESIZER & TOOLBAR
// ==========================================
// ImageResizer moved to ../components/ImageResizer.js

// ==========================================
// 2.17. KOMPONEN: FIND REPLACE MODAL
// ==========================================
// FindReplaceModal moved to ../components/FindReplaceModal.js


// ==========================================
// 2.15. KOMPONEN: TABLE TOOLBAR & RESIZER
// ==========================================
// TableToolbar moved to ../components/TableToolbar.js

// ==========================================
// 2.16. KOMPONEN: LINE TOOLBAR & RESIZER
// ==========================================
// LineToolbar moved to ../components/LineToolbar.js

// ==========================================
// 4. DATA MENU DROPDOWN (UPDATED)
// ==========================================
const MENU_DATA = {
  File: ['Share', 'New', 'Open', 'Make a copy', 'Rename', 'Page setup', 'Print'],
  Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select all', 'Find and replace'],
  View: ['Toggle Details', 'Show print layout', 'Show ruler', 'Full screen'],
  Insert: ['Image', 'Table', 'Horizontal line', 'Special characters', 'Signature', 'Import PDF Data', 'Page break'],
  Format: [
    { label: 'Text', submenu: ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Superscript', 'Subscript'] },
    { label: 'Paragraph styles', submenu: ['Normal text', 'Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3'] },
    { label: 'Align & indent', submenu: ['Left', 'Center', 'Right', 'Justify', 'Increase indent', 'Decrease indent'] },
    'Clear formatting'
  ],
  Tools: ['Spelling and grammar', 'Word count', 'Dictionary'],
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
  const [savedFiles, setSavedFiles] = useState([]); // Separate state for File Open list
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
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ... (rest of simple states)


  // ADVANCED FEATURES STATE
  const [showTableModal, setShowTableModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [signatures, setSignatures] = useState([]); // Array of {id, src, x, y, width, height}
  // FIX: Store IDs instead of DOM references to avoid "detached node" issues
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null); // Keep as Ref for now (Tables are complex)
  const [selectedLine, setSelectedLine] = useState(null); // Keep as Ref for now

  const [pageSettings, setPageSettings] = useState({
    size: 'A4',
    orientation: 'portrait',
    marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 20
  });

  // STATE VIEW
  const [showRuler, setShowRuler] = useState(true);
  const [printLayout, setPrintLayout] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [docStats, setDocStats] = useState({ words: 0, chars: 0, pages: 0 });

  // EDITOR STATE
  const [fontName, setFontName] = useState("Arial");
  const [fontSize, setFontSize] = useState("3");
  const [paintFormat, setPaintFormat] = useState(null);
  const pageRefs = useRef([]); // CHANGED: Array of refs for multiple pages
  const pendingFocus = useRef(null); // To track if we need to focus next page
  const savedSelection = useRef(null); // Save selection before opening modals

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  // RULER STATE
  const [indentLeft, setIndentLeft] = useState(0);

  // LISTEN TO SELECTION FOR RULER SYNC
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const node = sel.anchorNode;
      const el = node.nodeType === 3 ? node.parentElement : node;
      const computed = window.getComputedStyle(el);
      // Try to read padding-left or text-indent
      const pl = parseInt(computed.paddingLeft) || 0;
      setIndentLeft(pl);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleRulerChange = (newVal) => {
    setIndentLeft(newVal);
    // Apply to current selection
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const block = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;

    // Walk up to find a block element.
    // EXCLUDE the main contentEditable root to prevent shifting the whole page.
    const p = block.closest('p, h1, h2, h3, h4, h5, li, div');

    if (p && p.getAttribute('contenteditable') !== 'true' && !p.classList.contains('editor-canvas')) {
      // CLAMP VALUE: Prevent overflow
      // Max indentation should be reasonable (e.g. page width - 200px)
      // Assuming A4 width ~794px in screen check or just cap at 400px
      const clampedVal = Math.max(0, Math.min(newVal, 400));
      p.style.paddingLeft = `${clampedVal}px`;
    }
  };

  // HANDLE FOCUS AFTER PAGE CREATION
  useEffect(() => {
    if (pendingFocus.current !== null) {
      // Support object { index: 1, atEnd: true } or just number
      const focusData = typeof pendingFocus.current === 'object' ? pendingFocus.current : { index: pendingFocus.current, atEnd: false };
      const pageIdx = focusData.index;

      const pageEl = pageRefs.current[pageIdx];
      if (pageEl) {
        // Focus logic
        const range = document.createRange();
        const sel = window.getSelection();

        if (focusData.atEnd) {
          range.selectNodeContents(pageEl);
          range.collapse(false); // End
        } else {
          range.setStart(pageEl, 0);
          range.collapse(true); // Start
        }

        sel.removeAllRanges();
        sel.addRange(range);
      }
      pendingFocus.current = null;
    }
  }, [invoices]); // Run after render updates

  // REAL-TIME DOC STATS
  useEffect(() => {
    const calculateStats = () => {
      let totalWords = 0;
      let totalChars = 0;

      pageRefs.current.forEach(ref => {
        if (ref) {
          const text = ref.innerText || "";
          const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          totalWords += words;
          totalChars += text.length;
        }
      });
      setDocStats({ words: totalWords, chars: totalChars, pages: (pageRefs.current?.filter(Boolean).length || 0) });
    };

    calculateStats(); // Run immediately
    const interval = setInterval(calculateStats, 1000);
    return () => clearInterval(interval);
  }, [invoices]); // Run when invoices change too

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

  // SYNC CONTENT ON INDEX CHANGE
  useEffect(() => {
    if (invoices[currentIndex]) {
      const content = invoices[currentIndex].content;
      const pages = Array.isArray(content) ? content : [content || ""];

      pages.forEach((html, idx) => {
        if (pageRefs.current[idx] && pageRefs.current[idx].innerHTML !== html) {
          pageRefs.current[idx].innerHTML = html;
        }
      });
    }
  }, [currentIndex, invoices]);

  const currentData = invoices[currentIndex] || { no: "", customer: "", date: "", items: [], grandTotal: "0", email: "" };
  const currentPages = Array.isArray(currentData.content) ? currentData.content : [currentData.content || ""];

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
    showToast("Cloud", "Mengambil daftar file...", "info");
    const { data, error } = await supabase
      .from('invoices')
      .select('no, customer, updated_at, content') // Select fields needed
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      showToast("Error", "Gagal mengambil data.", "error");
    } else if (data) {
      setSavedFiles(data); // Store raw rows
      setShowOpenModal(true);
      showToast("Sukses", `Daftar file dimuat.`, "success");
    }
  };

  const syncStateFromDom = (element) => {
    if (!element) return;
    const pageEl = element.closest('.editor-canvas');
    if (!pageEl) return;

    // Find index in pageRefs
    const pageIndex = pageRefs.current.findIndex(p => p === pageEl);
    if (pageIndex === -1) return;

    // Sync that page
    const html = pageEl.innerHTML;
    setInvoices(prev => {
      const newState = [...prev];
      const pages = Array.isArray(newState[currentIndex].content) ? [...newState[currentIndex].content] : [newState[currentIndex].content || ""];
      pages[pageIndex] = html;
      newState[currentIndex] = { ...newState[currentIndex], content: pages };
      return newState;
    });
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
              content: "",
              date: new Date().toLocaleDateString('id-ID'),
              email: ""
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
      else if (action === 'Print') { window.print(); }
    } else if (category === 'Edit') {
      const map = { 'Undo': 'undo', 'Redo': 'redo', 'Cut': 'cut', 'Copy': 'copy', 'Paste': 'paste' };
      if (map[action]) formatText(map[action]);
      else if (action === 'Select all') {
        // Select ALL pages content
        const sel = window.getSelection();
        sel.removeAllRanges();
        const range = document.createRange();
        // We can only select one contiguous range in most browsers.
        // We select the container of pages? No, that selects UI too.
        // Best effort: Select the currently active page fully.
        // Or if refined: Try to modify all pages to be 'selected' custom state?
        // Let's stick to standard behavior: Select current focused page content.
        // User requested "Select Not Just One Page". This is hard with ContentEditable.
        // WORKAROUND: Select the *wrapper* of all pages if possible?
        // No, let's select the current page and show a toast explaining limitation or 
        // actually, if we want to support "Select All" for Copy, we can create a hidden textarea with all content?
        // Let's try selecting the first page to the last page?
        if (pageRefs.current.length > 0) {
          range.setStart(pageRefs.current[0], 0);
          range.setEnd(pageRefs.current[pageRefs.current.length - 1], pageRefs.current[pageRefs.current.length - 1].childNodes.length);
          sel.addRange(range);
        }
      }
      else if (action === 'Find and replace') { setShowFindReplace(true); }
    } else if (category === 'View') {
      if (action === 'Toggle Details') setShowRightSidebar(!showRightSidebar);
      else if (action === 'Show print layout') setPrintLayout(!printLayout);
      else if (action === 'Show ruler') setShowRuler(!showRuler);
      else if (action === 'Full screen') { !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen(); }
    } else if (category === 'Insert') {
      if (action === 'Image') document.getElementById('imgInputHidden').click();
      else if (action === 'Import PDF Data') document.getElementById('pdfInputHidden').click();
      else if (action === 'Horizontal line') { saveSelection(); setShowLineModal(true); }
      else if (action === 'Table') { saveSelection(); setShowTableModal(true); }
      else if (action === 'Signature') { saveSelection(); setShowSignatureModal(true); }
      else if (action === 'Special characters') { saveSelection(); setShowSymbolModal(true); }
      else if (action === 'Page break') {
        setInvoices(prev => {
          const newState = [...prev];
          const pages = Array.isArray(newState[currentIndex].content) ? [...newState[currentIndex].content] : [newState[currentIndex].content || ""];
          pages.push("");
          newState[currentIndex] = { ...newState[currentIndex], content: pages };
          // Auto focus new page
          setTimeout(() => {
            pendingFocus.current = { index: pages.length - 1, atEnd: false };
          }, 100);
          return newState;
        });
      }
    } else if (category === 'Format') {
      // Map actions from submenus to commands
      const styleMap = {
        'Bold': 'bold', 'Italic': 'italic', 'Underline': 'underline',
        'Strikethrough': 'strikeThrough', 'Superscript': 'superscript', 'Subscript': 'subscript',
        'Left': 'justifyLeft', 'Center': 'justifyCenter', 'Right': 'justifyRight', 'Justify': 'justifyFull',
        'Increase indent': 'indent', 'Decrease indent': 'outdent',
        'Clear formatting': 'removeFormat'
      };

      const tagMap = {
        'Normal text': 'p', 'Title': 'h1', 'Subtitle': 'h2', 'Heading 1': 'h3', 'Heading 2': 'h4', 'Heading 3': 'h5'
      };

      if (styleMap[action]) formatText(styleMap[action]);
      else if (tagMap[action]) formatText('formatBlock', tagMap[action]);

    } else if (category === 'Tools') {
      if (action === 'Word count') setShowWordCount(true);
      else if (action === 'Spelling and grammar') { setSpellCheck(!spellCheck); showToast("Spell Check", !spellCheck ? "Aktif" : "Non-aktif", "info"); }
      else if (action === 'Dictionary') showToast("Dictionary", "Fitur Kamus belum tersedia.", "info");
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
    restoreSelection();
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
    restoreSelection();
    formatText('insertHTML', `<hr style="width:${width}; height:${height}; background-color:${color}; border:none; margin: 10px 0;" /><p><br/></p>`);
  };

  const handleInsertSymbol = (char) => { restoreSelection(); formatText('insertText', char); };

  const handleInsertSignature = (dataUrl) => {
    setSignatures(prev => [...prev, { id: Date.now(), src: dataUrl, x: 100, y: 100, width: 200, height: 100 }]);
    showToast("Signature", "Tanda tangan ditambahkan. Geser untuk memindahkan.", "success");
  };

  const updateSignature = (id, updates) => {
    setSignatures(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // IMAGE HANDLING
  const handleEditorClick = (e) => {
    // Image selection is handled inline in the render loop to ensure IDs
    // We keep this if needed for other global clicks
    if (e.target.tagName !== 'IMG' && !e.target.closest('table') && e.target.tagName !== 'HR') {
      // Clear selection if clicking elsewhere
      // handled inline, but safe to keep empty or specifics here
    }
  };

  const updateSelectedImage = (updates) => {
    const img = document.getElementById(selectedImageId);
    if (!img) return;
    if (updates.width) img.style.width = updates.width;
    if (updates.style) Object.assign(img.style, updates.style);
    if (updates.className) img.className = updates.className;
    // setSelectedImageId(null); // constant updates shouldn't close it?
  };

  const deleteSelectedImage = () => {
    const img = document.getElementById(selectedImageId);
    if (img) {
      img.remove();
      setSelectedImageId(null);
    }
  };


  const handleImportPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast("PDF Import", "Membaca layout PDF... (Proses ini bergantung koneksi internet untuk Worker)", "info");
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      // Ensure we use a matching version for the worker. 
      // Fallback to a fixed version if pdfjsLib.version is unavailable or weird, but usually it works.
      // For v5+, use .mjs and a reliable CDN like unpkg
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

      let newPagesHtml = [];
      let importedMeta = { no: null, total: null };

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // REFLOW ALGORITHM: Group items by Y coordinate (Lines) -> Group keys by proximity
        const items = textContent.items;

        // 1. Sort by Y (descending - top to bottom), then X (ascending)
        items.sort((a, b) => {
          const yA = a.transform[5];
          const yB = b.transform[5];
          if (Math.abs(yA - yB) > 5) return yB - yA; // Different lines
          return a.transform[4] - b.transform[4]; // Same line, sort X
        });

        // 2. Group into Lines
        const lines = [];
        let currentLine = [];
        let lastY = null;

        items.forEach(item => {
          if (!item.str.trim()) return;
          const y = item.transform[5];
          if (lastY === null || Math.abs(y - lastY) < 6) {
            currentLine.push(item);
          } else {
            lines.push(currentLine);
            currentLine = [item];
          }
          lastY = y;
        });
        if (currentLine.length > 0) lines.push(currentLine);

        // 3. Convert Lines to HTML Paragraphs
        let pageHtml = "";
        lines.forEach(line => {
          // Sort items by X again to be sure
          line.sort((a, b) => a.transform[4] - b.transform[4]);

          // Construct line text with spacing preservation
          let lineHtml = "";
          let lastX = -1;
          let lastWidth = 0;

          line.forEach(item => {
            const currentX = item.transform[4];
            const gap = (lastX >= 0) ? (currentX - (lastX + lastWidth)) : 0;

            // Add non-breaking spaces for gaps (approx 4px per space)
            if (gap > 5) {
              const spaces = Math.floor(gap / 4);
              lineHtml += "&nbsp;".repeat(Math.min(spaces, 20)); // Limit spaces
            } else if (lastX >= 0) {
              lineHtml += " "; // Normal space
            }

            lineHtml += item.str;
            lastX = currentX;
            lastWidth = item.width || (item.str.length * 5); // Fallback width
          });

          // Detect header info from first page (simplified)
          if (p === 1) {
            const rawText = line.map(i => i.str).join(' ');
            if (!importedMeta.no) {
              const m = rawText.match(/(?:Invoice|No|Bill)[:\.\s]*([A-Z0-9\-\.]+)/i);
              if (m) importedMeta.no = m[1];
            }
            if (!importedMeta.total) {
              const m = rawText.match(/(?:Total|Tagihan|Amount)[:\.\s]*([Rp\$\d\.,]+)/i);
              if (m) importedMeta.total = m[1];
            }
          }

          // Formatting
          const fontSize = Math.sqrt(line[0].transform[0] * line[0].transform[3]);
          let tagName = 'p';
          let fw = 'normal';
          if (fontSize > 18) { tagName = 'h2'; fw = 'bold'; }
          else if (fontSize > 14) { tagName = 'h3'; fw = 'bold'; }

          pageHtml += `<${tagName} style="font-weight:${fw}; margin-bottom: 4px; white-space: pre-wrap;">${lineHtml}</${tagName}>`;
        });

        if (!pageHtml) pageHtml = "<p><br/></p>";
        newPagesHtml.push(pageHtml);
      }

      setInvoices(prev => [...prev, {
        no: importedMeta.no || `IMP-${Math.floor(Math.random() * 1000)}`,
        date: new Date().toLocaleDateString(),
        customer: "Imported PDF Data",
        items: [{ desc: "Imported Content", qty: 1, price: 0, total: importedMeta.total || "0" }],
        content: newPagesHtml, // Array of HTML strings per page
        email: ""
      }]);

      setCurrentIndex(invoices.length); // Point to new invoice
      showToast("Sukses", `${pdf.numPages} Halaman PDF di-import.`, "success");

    } catch (err) {
      console.error(err);
      showToast("Error", "Gagal membaca PDF. Pastikan file tidak corrupt.", "error");
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      const uniqueId = `img-${Date.now()}`;
      // Use insertHTML to attach ID immediately
      const imgHtml = `<img src="${url}" id="${uniqueId}" style="max-width: 100%;" />`;
      document.execCommand('insertHTML', false, imgHtml);

      // Auto-select the new image
      setTimeout(() => {
        const img = document.getElementById(uniqueId);
        if (img) setSelectedImageId(uniqueId);
      }, 100);
    }
  };
  const handleZoom = (val) => setZoomLevel(prev => Math.min(Math.max(prev + val, 50), 200));
  const handleDownloadPDF = async () => {
    setIsEditing(false);
    setZoomLevel(100);
    showToast("PDF", "Memproses...", "info");
    setTimeout(async () => {
      if (pageRefs.current.length === 0) return;
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pageRefs.current.length; i++) {
          const pageRef = pageRefs.current[i];
          if (!pageRef) continue;

          if (i > 0) pdf.addPage();

          const canvas = await html2canvas(pageRef, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const imgProps = pdf.getImageProperties(imgData);
          const ratio = imgProps.width / imgProps.height;
          const height = pdfWidth / ratio;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, height);
        }

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
      <WordCountModal isOpen={showWordCount} onClose={() => setShowWordCount(false)} textRef={pageRefs} />
      <OpenDocumentModal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} invoices={invoices} onSelect={(idx) => { setCurrentIndex(idx); setShowOpenModal(false); showToast("Loaded", `Dokumen #${invoices[idx]?.no} dibuka.`, "success"); }} />
      <PageSetupModal isOpen={showPageSetup} onClose={() => setShowPageSetup(false)} settings={pageSettings} onSave={(s) => { setPageSettings(s); showToast("Page Setup", "Pengaturan disimpan.", "success"); }} />
      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} onInsert={handleInsertSignature} />
      <TableModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={handleInsertTable} />
      <LineModal isOpen={showLineModal} onClose={() => setShowLineModal(false)} onInsert={handleInsertLine} />
      <SymbolModal isOpen={showSymbolModal} onClose={() => setShowSymbolModal(false)} onInsert={handleInsertSymbol} />
      <FindReplaceModal
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        onFind={(text) => {
          if (text && window.find) {
            const found = window.find(text, false, false, true, false, true, false);
            if (!found) showToast("Info", "Teks tidak ditemukan.", "info");
          }
        }}
        onReplace={(find, replace) => {
          const sel = window.getSelection();
          if (sel.toString() === find) {
            document.execCommand('insertText', false, replace);
          } else {
            // Find first then replace
            const found = window.find(find, false, false, true, false, true, false);
            if (found) document.execCommand('insertText', false, replace);
            else showToast("Info", "Teks tidak ditemukan.", "info");
          }
        }}
        onReplaceAll={(find, replace) => {
          // Basic loop implementation
          let count = 0;
          // Reset cursor to start
          window.getSelection().removeAllRanges();
          while (window.find(find, false, false, true, false, true, false)) {
            document.execCommand('insertText', false, replace);
            count++;
            if (count > 100) break; // Safety break
          }
          showToast("Selesai", `${count} occurences replaced.`, "success");
        }}
      />
      <RenameModal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} currentName={currentData.no} onRename={(newName) => { setInvoices(prev => prev.map((inv, idx) => idx === currentIndex ? { ...inv, no: newName } : inv)); showToast("Rename", "Dokumen dinamai ulang.", "success"); }} />
      <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={confirmAction?.title} message={confirmAction?.message} onConfirm={confirmAction?.action} />
      <input type="file" id="imgInputHidden" hidden onChange={handleImageChange} />
      <input type="file" id="pdfInputHidden" hidden accept=".pdf" onChange={handleImportPDF} />

      {/* NAVBAR */}
      <nav className="w-full bg-[#1A1A1A] text-white px-4 py-2 flex justify-between items-center sticky top-0 z-[100] border-b border-gray-700 h-14 print:hidden">
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
      {/* MENU BAR */}
      <div className="w-full bg-white border-b border-gray-300 px-4 flex items-center gap-1 text-[13px] text-slate-700 select-none sticky top-14 z-[120] h-9 shadow-sm">
        {Object.keys(MENU_DATA).map((menuName) => (
          <div key={menuName} className="relative h-full flex items-center">
            <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === menuName ? null : menuName); }} className={`px-3 py-1 rounded hover:bg-gray-100 transition ${activeMenu === menuName ? "bg-gray-200" : ""}`}>{menuName}</button>
            {activeMenu === menuName && (
              <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl rounded-b-lg py-1 min-w-[220px] z-[110] flex flex-col animate-fade-in-down">
                {MENU_DATA[menuName].map((item, idx) => {
                  if (typeof item === 'string') {
                    return (
                      <button key={idx} onClick={() => handleMenuClick(menuName, item)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 flex justify-between group">
                        <span>{item}</span>
                      </button>
                    );
                  } else {
                    // Submenu Render
                    return (
                      <div key={idx} className="relative group/sub w-full">
                        <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 flex justify-between items-center">
                          <span>{item.label}</span>
                          <span className="text-gray-400 text-[10px]">▶</span>
                        </button>
                        <div className="absolute top-0 left-full -ml-1 bg-white border border-gray-200 shadow-xl rounded-lg py-1 min-w-[180px] hidden group-hover/sub:flex flex-col z-[120]">
                          {item.submenu.map((sub, sIdx) => (
                            <button key={sIdx} onClick={() => { handleMenuClick(menuName, sub); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700">
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* TOOLBAR LENGKAP - URUTAN SESUAI PERMINTAAN */}
      <div className="w-full bg-[#EDF2FA] border-b border-gray-300 px-4 py-1.5 flex items-center gap-1 overflow-x-auto sticky top-[92px] z-[80] shadow-sm h-12 print:hidden">
        {/* 1. Riwayat & Print */}
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('undo')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Undo"><Icons.Undo /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => formatText('redo')} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Redo"><Icons.Redo /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => window.print()} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Print"><Icons.Print /></button>
        <button onMouseDown={preventFocusLoss} onClick={handlePaintFormat} className={`p-1.5 rounded transition ${paintFormat ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' : 'hover:bg-gray-200 text-slate-600'}`} title="Paint Format"><Icons.FormatPaint /></button>


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
        <button onMouseDown={preventFocusLoss} onClick={() => { saveSelection(); document.getElementById('imgInputHidden').click(); }} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Image"><Icons.Image /></button>
        <button onMouseDown={preventFocusLoss} onClick={() => { saveSelection(); setShowTableModal(true); }} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Table">T</button>
        <button onMouseDown={preventFocusLoss} onClick={() => { saveSelection(); setShowLineModal(true); }} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Line">--</button>
        <button onMouseDown={preventFocusLoss} onClick={() => { saveSelection(); setShowSymbolModal(true); }} className="p-1.5 hover:bg-gray-200 rounded text-slate-600 transition" title="Insert Symbol">Ω</button>

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
        <div className="ml-auto flex items-center border border-gray-300 rounded px-1 h-7 bg-white shadow-sm print:hidden">
          <button onClick={() => handleZoom(-10)} className="px-2 hover:bg-gray-100 text-slate-600">-</button>
          <span className="text-xs font-medium w-10 text-center select-none">{zoomLevel}%</span>
          <button onClick={() => handleZoom(10)} className="px-2 hover:bg-gray-100 text-slate-600">+</button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex w-full flex-1 overflow-hidden h-full relative print:h-auto print:block print:overflow-visible">
        <div className={`flex-1 overflow-auto flex justify-center p-8 pb-32 ${printLayout ? 'bg-[#EDF0F2]' : 'bg-white'} print:p-0 print:bg-white print:block print:overflow-visible`}>
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-200 h-max flex flex-col items-center gap-8 print:transform-none print:block">

            {currentPages.map((pageHtml, pageIndex) => (
              <div key={pageIndex} className="relative group print:bg-white print:m-0 print:shadow-none print:w-full" style={{ breakAfter: pageIndex < currentPages.length - 1 ? 'page' : 'auto' }}>
                {/* Page Indicator */}
                <div className="absolute top-2 -left-12 text-xs text-gray-400 font-bold select-none opacity-0 group-hover:opacity-100 transition print:hidden">
                  Page {pageIndex + 1}
                </div>

                {showRuler && printLayout && pageIndex === 0 && (
                  <div
                    className="absolute -top-6 left-0 w-full h-6 bg-gray-100 border-b border-gray-300 select-none overflow-visible font-mono text-[9px] text-gray-500 print:hidden"
                    style={{
                      paddingLeft: `${pageSettings.marginLeft}mm`,
                      paddingRight: `${pageSettings.marginRight}mm`
                    }}
                  >
                    {/* Ruler Container matching printable area */}
                    <div className="relative h-full w-full">
                      {/* Tick Marks & Numbers */}
                      <div className="absolute inset-0 flex items-end pointer-events-none">
                        {[...Array(40)].map((_, i) => (
                          <div key={i} className="flex-1 border-r border-gray-300 h-2 flex justify-end pr-0.5 relative">
                            {i % 5 === 0 && <span className="absolute -top-3 right-0 transform translate-x-1/2 text-[8px]">{i}</span>}
                          </div>
                        ))}
                      </div>

                      {/* First Line Indent Marker (Down Triangle) */}
                      <div
                        className="absolute top-0 w-3 h-full cursor-col-resize group z-20 hover:bg-blue-500/10 transition"
                        style={{ left: `${indentLeft}px` }}
                        title="First Line Indent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startIndent = indentLeft;
                          const onMove = (mv) => {
                            const diff = mv.clientX - startX;
                            const newVal = Math.max(0, startIndent + diff);
                            handleRulerChange(newVal);
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      >
                        <div className="absolute top-0 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"></div>
                      </div>

                      {/* Left Indent Marker (Square) */}
                      <div
                        className="absolute top-0 w-3 h-full cursor-col-resize group z-20 hover:bg-blue-500/10 transition"
                        style={{ left: `${indentLeft}px` }}
                        title="Left Indent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startIndent = indentLeft;

                          const onMove = (mv) => {
                            const diff = mv.clientX - startX;
                            const newVal = Math.max(0, startIndent + diff);
                            handleRulerChange(newVal);
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      >
                        <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-blue-600"></div>
                        <div className="absolute bottom-[-2px] left-[-2px] w-4 h-2 bg-transparent"></div> {/* Hit area */}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    width: pageSettings.size === 'A4' ? (pageSettings.orientation === 'portrait' ? '210mm' : '297mm') :
                      pageSettings.size === 'A3' ? (pageSettings.orientation === 'portrait' ? '297mm' : '420mm') :
                        pageSettings.size === 'A5' ? (pageSettings.orientation === 'portrait' ? '148mm' : '210mm') :
                          pageSettings.size === 'Letter' ? (pageSettings.orientation === 'portrait' ? '215.9mm' : '279.4mm') :
                            pageSettings.size === 'Legal' ? (pageSettings.orientation === 'portrait' ? '215.9mm' : '355.6mm') :
                              pageSettings.size === 'Tabloid' ? (pageSettings.orientation === 'portrait' ? '279.4mm' : '431.8mm') :
                                pageSettings.size === 'Executive' ? (pageSettings.orientation === 'portrait' ? '184.15mm' : '266.7mm') :
                                  pageSettings.size === 'B5' ? (pageSettings.orientation === 'portrait' ? '176mm' : '250mm') :
                                    pageSettings.size === 'Statement' ? (pageSettings.orientation === 'portrait' ? '139.7mm' : '215.9mm') :
                                      pageSettings.size === 'Folio' ? (pageSettings.orientation === 'portrait' ? '215.9mm' : '330.2mm') :
                                        pageSettings.size === 'Quarto' ? (pageSettings.orientation === 'portrait' ? '215mm' : '275mm') :
                                          (pageSettings.orientation === 'portrait' ? '210mm' : '297mm'), // Fallback
                    height: pageSettings.size === 'A4' ? (pageSettings.orientation === 'portrait' ? '297mm' : '210mm') :
                      pageSettings.size === 'A3' ? (pageSettings.orientation === 'portrait' ? '420mm' : '297mm') :
                        pageSettings.size === 'A5' ? (pageSettings.orientation === 'portrait' ? '210mm' : '148mm') :
                          pageSettings.size === 'Letter' ? (pageSettings.orientation === 'portrait' ? '279.4mm' : '215.9mm') :
                            pageSettings.size === 'Legal' ? (pageSettings.orientation === 'portrait' ? '355.6mm' : '215.9mm') :
                              pageSettings.size === 'Tabloid' ? (pageSettings.orientation === 'portrait' ? '431.8mm' : '279.4mm') :
                                pageSettings.size === 'Executive' ? (pageSettings.orientation === 'portrait' ? '266.7mm' : '184.15mm') :
                                  pageSettings.size === 'B5' ? (pageSettings.orientation === 'portrait' ? '250mm' : '176mm') :
                                    pageSettings.size === 'Statement' ? (pageSettings.orientation === 'portrait' ? '215.9mm' : '139.7mm') :
                                      pageSettings.size === 'Folio' ? (pageSettings.orientation === 'portrait' ? '330.2mm' : '215.9mm') :
                                        pageSettings.size === 'Quarto' ? (pageSettings.orientation === 'portrait' ? '275mm' : '215mm') :
                                          (pageSettings.orientation === 'portrait' ? '297mm' : '210mm'), // Fallback
                    paddingTop: `${pageSettings.marginTop}mm`, paddingBottom: `${pageSettings.marginBottom}mm`, paddingLeft: `${pageSettings.marginLeft}mm`, paddingRight: `${pageSettings.marginRight}mm`
                  }}
                  className={`bg-white ${printLayout ? 'shadow-2xl' : ''} editor-canvas flex flex-col ${isEditing ? "outline-none ring-2 ring-emerald-500/50" : "outline-none"} print:shadow-none print:ring-0`}
                >
                  <PageContent
                    pageRef={el => pageRefs.current[pageIndex] = el}
                    html={pageHtml}
                    isEditing={isEditing}
                    spellCheck={spellCheck}
                    onMouseUp={applyPaintFormat}
                    onClick={(e) => {
                      if (e.target.tagName === 'IMG') {
                        // Ensure ID exists
                        if (!e.target.id) e.target.id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        setSelectedImageId(e.target.id);
                        setSelectedTable(null);
                        setSelectedLine(null);
                      } else if (e.target.tagName === 'TABLE' || e.target.closest('table')) {
                        setSelectedTable(e.target.closest('table'));
                        setSelectedImageId(null);
                        setSelectedLine(null);
                      } else if (e.target.tagName === 'HR') {
                        setSelectedLine(e.target);
                        setSelectedImageId(null);
                        setSelectedTable(null);
                      } else {
                        setSelectedImageId(null);
                        setSelectedTable(null);
                        setSelectedLine(null);
                      }
                      handleEditorClick(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const sel = window.getSelection();
                        // Simple check: is cursor at start?
                        // We check if we are at offset 0 of the first node or the container itself
                        // This is a naive check but works for many cases
                        let atStart = false;
                        if (sel.rangeCount > 0) {
                          const range = sel.getRangeAt(0);
                          const preRange = range.cloneRange();
                          preRange.selectNodeContents(e.currentTarget);
                          preRange.setEnd(range.startContainer, range.startOffset);
                          if (preRange.toString().length === 0) atStart = true;
                        }

                        if (atStart && pageIndex > 0) {
                          // Move to previous page
                          e.preventDefault();
                          const isEmpty = e.currentTarget.innerText.trim() === "";

                          setInvoices(prev => {
                            const newState = [...prev];
                            const pages = [...(Array.isArray(newState[currentIndex].content) ? newState[currentIndex].content : [newState[currentIndex].content || ""])];

                            if (isEmpty) {
                              pages.splice(pageIndex, 1);
                              pendingFocus.current = { index: pageIndex - 1, atEnd: true };
                              showToast("Hapus Halaman", "Halaman kosong dihapus.", "info");
                            } else {
                              pendingFocus.current = { index: pageIndex - 1, atEnd: true };
                            }

                            newState[currentIndex] = { ...newState[currentIndex], content: pages };
                            return newState;
                          });
                        }
                      }
                    }}
                    className="flex-grow outline-none overflow-hidden print:overflow-visible print:text-black"
                    onInput={(e) => {
                      const target = e.currentTarget;

                      // LOGIKA FLOW CONTENT OTOMATIS
                      // Jika konten melebihi tinggi halaman, pindahkan elemen terakhir ke halaman berikutnya
                      // Loop cek overflow
                      let overflowMoved = false;
                      let nodesToMove = [];

                      // Kita gunakan toleransi 5px
                      while (target.scrollHeight - target.clientHeight > 5) {
                        const lastNode = target.lastChild;
                        if (!lastNode) break;

                        // Mencegah infinite loop jika satu komponen terlalu besar
                        if (target.childNodes.length === 1 && nodesToMove.length === 0) break;

                        // Ambil HTML/Text node
                        let nodeHtml = "";
                        if (lastNode.nodeType === Node.TEXT_NODE) {
                          nodeHtml = lastNode.textContent;
                        } else {
                          nodeHtml = lastNode.outerHTML;
                        }

                        nodesToMove.unshift(nodeHtml);
                        lastNode.remove();
                        overflowMoved = true;
                      }

                      // Update State dengan data baru
                      const currentHtml = target.innerHTML;

                      setInvoices(prev => {
                        const newState = [...prev];
                        if (newState[currentIndex]) {
                          const pages = [...(Array.isArray(newState[currentIndex].content) ? newState[currentIndex].content : [newState[currentIndex].content || ""])];

                          // 1. Update halaman saat ini (yg sudah terpotong)
                          pages[pageIndex] = currentHtml;

                          // 2. Jika ada overflow, pindahkan ke halaman berikutnya
                          if (nodesToMove.length > 0) {
                            const moveContent = nodesToMove.join("");
                            if (pageIndex + 1 < pages.length) {
                              // Prepend ke halaman existing
                              pages[pageIndex + 1] = moveContent + pages[pageIndex + 1];
                            } else {
                              // Buat halaman baru
                              pages.push(moveContent);
                              showToast("Auto-Page", "Konten lanjut ke halaman baru.", "info");
                            }
                            // SET FOCUS KE HALAMAN BERIKUTNYA
                            pendingFocus.current = pageIndex + 1;
                          }

                          newState[currentIndex] = { ...newState[currentIndex], content: pages };
                        }
                        return newState;
                      });
                    }}
                  />
                  {/* Footer (Empty) */}
                  <div className="mt-auto pt-4"></div>
                </div>

                {/* Signatures on First Page Only */}
                {pageIndex === 0 && signatures.map(sig => (
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
                    {/* Delete Button (Only when editing) */}
                    {isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSignatures(prev => prev.filter(s => s.id !== sig.id)); }}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 z-50 text-xs"
                        title="Hapus Tanda Tangan"
                      >✕</button>
                    )}
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
                    ></div>}
                  </div>
                ))}

              </div>
            ))}

            {/* Manual Add Page Button */}
            <button
              onClick={() => setInvoices(prev => {
                const newState = [...prev];
                const pages = Array.isArray(newState[currentIndex].content) ? [...newState[currentIndex].content] : [newState[currentIndex].content || ""];
                pages.push("");
                newState[currentIndex] = { ...newState[currentIndex], content: pages };
                return newState;
              })}
              className="mb-8 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-slate-600 rounded-full text-xs font-bold shadow transition print:hidden"
            >
              + Add Page
            </button>


          </div>
        </div>
        {
          showRightSidebar && (
            <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col z-[95] shadow-xl h-full print:hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Details</h3>
                <button onClick={() => setShowRightSidebar(false)} className="text-slate-400 hover:text-slate-800">✕</button>
              </div>
              {/* Content */}
              <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {/* Doc Stats */}
                <div>
                  <h4 className="font-bold text-xs text-slate-900 mb-2 border-b border-gray-100 pb-1">Statistics</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 text-center">
                    <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="block font-bold text-lg text-slate-800">{docStats.words}</span>Words</div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="block font-bold text-lg text-slate-800">{docStats.chars}</span>Chars</div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-100"><span className="block font-bold text-lg text-slate-800">{docStats.pages}</span>Pages</div>
                  </div>
                </div>
                {/* View Settings */}
                <div>
                  <h4 className="font-bold text-xs text-slate-900 mb-2 border-b border-gray-100 pb-1">View Settings</h4>
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
                    <button onClick={() => window.print()} className="flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition border border-gray-200"><Icons.Print /> Print</button>
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition shadow-md"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> PDF</button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* OVERLAY COMPONENTS */}
        <ImageResizer
          image={typeof document !== 'undefined' ? document.getElementById(selectedImageId) : null}
          onUpdate={(updates) => {
            const img = document.getElementById(selectedImageId);
            if (img) {
              if (updates.width) img.style.width = updates.width;
              if (updates.style) Object.assign(img.style, updates.style);
              if (updates.className) img.className = updates.className;
              syncStateFromDom(img); // NEW HELPER
            }
          }}
          onDelete={() => {
            const img = document.getElementById(selectedImageId);
            if (img) {
              const parentPage = img.closest('.editor-canvas');
              img.remove();
              setSelectedImageId(null);
              if (parentPage) syncStateFromDom(parentPage); // NEW HELPER
            }
          }}
        />
        <div className="print:hidden">
          <TableToolbar
            table={selectedTable}
            onUpdate={() => syncStateFromDom(selectedTable)} // NEW HELPER
          />
          <LineToolbar
            line={selectedLine}
            onUpdate={() => syncStateFromDom(selectedLine)} // NEW HELPER
          />
        </div>

        <OpenDocumentModal
          isOpen={showOpenModal}
          onClose={() => setShowOpenModal(false)}
          invoices={savedFiles}
          onSelect={(idx) => {
            const selectedDoc = savedFiles[idx];
            if (selectedDoc) {
              const content = selectedDoc.content;
              // Handle single object or array
              const pages = content.content ? (Array.isArray(content.content) ? content.content : [content.content]) : (Array.isArray(content) ? content : [content]);
              // If content is just the pages array, or object {no, content: []}
              // Assuming row.content is the Invoice Object { no, content: [] }
              // Let's wrap it in array for setInvoices
              setInvoices([selectedDoc.content]);
              setCurrentIndex(0);
              showToast("File Dibuka", `Dokumen ${selectedDoc.no || 'Untitled'} dimuat.`, "success");
              setShowOpenModal(false);
            }
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 3. ICONS SVG COLLECTION (LENGKAP SEMUA FUNGSI)
// ==========================================
// Icons moved to ../components/Icons.js

// ==========================================
// 4. HELPER COMPONENT: PAGE CONTENT (FIX CURSOR & PRINT)
// ==========================================
// Dual-view strategy: 
// 1. Editor Div: Controlled via useLayoutEffect for cursor stability. Hidden in print.
// 2. Print Div: Static dangerouslySetInnerHTML. Visible only in print.
const PageContent = ({ html, isEditing, spellCheck, onInput, onKeyDown, onMouseUp, onClick, className, pageRef }) => {
  const divRef = useRef(null);

  // Sync ref back to parent (Editor Div)
  useLayoutEffect(() => {
    if (pageRef) {
      if (typeof pageRef === 'function') pageRef(divRef.current);
      else if (pageRef.hasOwnProperty('current')) pageRef.current = divRef.current;
    }
  }, [pageRef]);

  // Sync Content ONLY if different (Prevents cursor reset) - EDITOR ONLY
  useLayoutEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== html) {
      divRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <>
      {/* 1. EDITOR VIEW (Screen Only) */}
      <div
        ref={divRef}
        contentEditable={isEditing}
        spellCheck={spellCheck}
        suppressContentEditableWarning={true}
        className={`${className} print:hidden`}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onMouseUp={onMouseUp}
        onClick={onClick}
      />

      {/* 2. PRINT VIEW (Print Only) */}
      <div
        className={`${className} hidden print:block print:overflow-visible print:h-auto text-black`}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ color: 'black' }} // Force black text for print
      />
    </>
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-visible { display: block !important; overflow: visible !important; height: auto !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <InvoiceViewer />
    </Suspense>
  );
}
