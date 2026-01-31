import React, { useState } from 'react';

export default function FindReplaceModal({ isOpen, onClose, onFind, onReplace, onReplaceAll }) {
    if (!isOpen) return null;
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");

    return (
        <div className="fixed top-20 right-10 bg-white rounded-xl shadow-2xl w-80 z-[100] animate-fade-in border border-gray-200">
            <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-slate-50 rounded-t-xl">
                <h3 className="font-bold text-sm text-slate-800">Find & Replace</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-slate-800">✕</button>
            </div>
            <div className="p-4 space-y-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Find</label>
                    <input type="text" value={findText} onChange={e => setFindText(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Text to find..." />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Replace with</label>
                    <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Replacement text..." />
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={() => onFind && onFind(findText)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold">Find Next</button>
                    <button onClick={() => onReplace && onReplace(findText, replaceText)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold">Replace</button>
                </div>
                <button onClick={() => onReplaceAll && onReplaceAll(findText, replaceText)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow">Replace All</button>
            </div>
        </div>
    );
}
