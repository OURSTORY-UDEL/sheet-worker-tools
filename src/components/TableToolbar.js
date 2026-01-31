import React, { useState, useEffect } from 'react';

export default function TableToolbar({ table, onUpdate }) {
    const [rect, setRect] = useState(null);
    const overlayRef = React.useRef(null); // Moved to top level

    useEffect(() => {
        if (!table) return;
        const update = () => {
            // Safety check if table is still in DOM
            if (table.isConnected) {
                setRect(table.getBoundingClientRect());
            }
        };
        // Initial set
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        const interval = setInterval(update, 500);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
            clearInterval(interval);
        }
    }, [table]);

    if (!table || !rect) return null;

    const handleResize = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = table.offsetWidth;
        const startH = table.offsetHeight;

        const onMove = (mv) => {
            if (direction.includes('e')) table.style.width = `${startW + (mv.clientX - startX)}px`;
            if (direction.includes('s')) table.style.height = `${startH + (mv.clientY - startY)}px`;

            // Update Overlay Direct DOM
            if (overlayRef.current) {
                const r = table.getBoundingClientRect();
                overlayRef.current.style.left = `${r.left}px`;
                overlayRef.current.style.top = `${r.top}px`;
                overlayRef.current.style.width = `${r.width}px`;
                overlayRef.current.style.height = `${r.height}px`;
            }
            onUpdate && onUpdate();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(table.getBoundingClientRect()); // Final Sync
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleDrag = (e) => {
        if (table.style.position !== 'absolute') return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(table.style.left) || 0;
        const startTop = parseInt(table.style.top) || 0;

        const onMove = (mv) => {
            table.style.left = `${startLeft + (mv.clientX - startX)}px`;
            table.style.top = `${startTop + (mv.clientY - startY)}px`;
            // Update Overlay Direct DOM
            if (overlayRef.current) {
                const r = table.getBoundingClientRect();
                overlayRef.current.style.left = `${r.left}px`;
                overlayRef.current.style.top = `${r.top}px`;
            }
            onUpdate && onUpdate();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(table.getBoundingClientRect()); // Final Sync
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const addRow = () => {
        const row = table.insertRow();
        const cols = table.rows[0].cells.length;
        for (let i = 0; i < cols; i++) {
            const cell = row.insertCell();
            cell.innerHTML = "&nbsp;";
            cell.style.padding = "8px";
            cell.style.border = "1px solid #cbd5e1";
        }
        onUpdate && onUpdate();
    };
    const delRow = () => { if (table.rows.length > 1) table.deleteRow(table.rows.length - 1); onUpdate && onUpdate(); };
    const addCol = () => {
        for (let i = 0; i < table.rows.length; i++) {
            const cell = table.rows[i].insertCell();
            cell.innerHTML = "&nbsp;";
            cell.style.padding = "8px";
            cell.style.border = "1px solid #cbd5e1";
        }
        onUpdate && onUpdate();
    };
    const delCol = () => {
        if (table.rows[0].cells.length > 1) {
            for (let i = 0; i < table.rows.length; i++) { table.rows[i].deleteCell(table.rows[i].cells.length - 1); }
        }
        onUpdate && onUpdate();
    };

    return (
        <>
            {/* SELECTION FRAME FOR TABLE */}
            <div
                ref={overlayRef}
                className="fixed pointer-events-none border-2 border-blue-500 z-50 transition-none"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, display: 'block' }}
            >
                {/* Resize Handles (Corners and Sides) */}
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 pointer-events-auto cursor-nwse-resize" onMouseDown={(e) => handleResize(e, 'se')}></div>
                <div className="absolute top-1/2 -right-1.5 w-1.5 h-3 bg-white border border-blue-500 pointer-events-auto cursor-ew-resize" onMouseDown={(e) => handleResize(e, 'e')}></div>
                <div className="absolute -bottom-1.5 left-1/2 w-3 h-1.5 bg-white border border-blue-500 pointer-events-auto cursor-ns-resize" onMouseDown={(e) => handleResize(e, 's')}></div>

                {/* Drag Handle Overlay (if absolute) */}
                {table.style.position === 'absolute' && (
                    <div className="absolute -top-3 left-0 w-full h-3 cursor-move pointer-events-auto bg-transparent" onMouseDown={handleDrag} title="Drag Table"></div>
                )}
            </div>

            {/* TOOLBAR */}
            <div className="fixed z-[60] bg-slate-900 text-white rounded p-1 shadow-xl flex flex-col gap-1 items-start" style={{ top: rect.top - 70, left: rect.left }}>
                <div className="flex gap-1">
                    <button onClick={() => { table.style.position = 'static'; onUpdate && onUpdate(); }} className={`px-2 py-1 text-xs rounded ${table.style.position !== 'absolute' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>Inline</button>
                    <button onClick={() => { table.style.position = 'absolute'; table.style.zIndex = '10'; onUpdate && onUpdate(); }} className={`px-2 py-1 text-xs rounded ${table.style.position === 'absolute' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>Float</button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => { table.style.width = '100%'; onUpdate && onUpdate(); }} className="px-2 py-1 text-xs hover:bg-slate-700 rounded">Full</button>
                    <button onClick={() => { table.style.width = 'auto'; onUpdate && onUpdate(); }} className="px-2 py-1 text-xs hover:bg-slate-700 rounded">Auto</button>
                    <div className="w-px h-4 bg-gray-500 mx-1"></div>
                    <button onClick={addRow} className="px-2 py-1 text-xs hover:bg-slate-700 rounded" title="Add Row">+R</button>
                    <button onClick={delRow} className="px-2 py-1 text-xs hover:bg-slate-700 rounded text-red-300" title="Del Row">-R</button>
                    <button onClick={addCol} className="px-2 py-1 text-xs hover:bg-slate-700 rounded" title="Add Col">+C</button>
                    <button onClick={delCol} className="px-2 py-1 text-xs hover:bg-slate-700 rounded text-red-300" title="Del Col">-C</button>
                    <div className="w-px h-4 bg-gray-500 mx-1"></div>
                    <button onClick={() => table.remove()} className="text-red-500 font-bold px-2 hover:text-red-400">✕</button>
                </div>
            </div>
        </>
    );
}
