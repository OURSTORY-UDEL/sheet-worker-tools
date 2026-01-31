import React, { useState, useEffect } from 'react';

export default function LineToolbar({ line, onUpdate }) {
    const [rect, setRect] = useState(null);
    const overlayRef = React.useRef(null); // Moved to top level

    useEffect(() => {
        if (!line) return;
        const update = () => {
            if (line.isConnected) {
                setRect(line.getBoundingClientRect());
            }
        };
        // Initial set
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        }
    }, [line]);

    if (!line || !rect) return null;

    const handleResize = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = line.offsetWidth;

        const onMove = (mv) => {
            if (direction === 'e') {
                const newW = Math.max(10, startW + (mv.clientX - startX));
                line.style.width = `${newW}px`;

                // Update Overlay Direct DOM
                if (overlayRef.current) {
                    const r = line.getBoundingClientRect();
                    overlayRef.current.style.left = `${r.left}px`;
                    overlayRef.current.style.top = `${r.top}px`;
                    overlayRef.current.style.width = `${r.width}px`;
                    overlayRef.current.style.height = `${r.height}px`;
                }
            }
            onUpdate && onUpdate();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(line.getBoundingClientRect()); // Final Sync
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleDrag = (e) => {
        if (line.style.position !== 'absolute') return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(line.style.left) || 0;
        const startTop = parseInt(line.style.top) || 0;

        const onMove = (mv) => {
            line.style.left = `${startLeft + (mv.clientX - startX)}px`;
            line.style.top = `${startTop + (mv.clientY - startY)}px`;

            // Update Overlay Direct DOM
            if (overlayRef.current) {
                const r = line.getBoundingClientRect();
                overlayRef.current.style.left = `${r.left}px`;
                overlayRef.current.style.top = `${r.top}px`;
            }
            onUpdate && onUpdate();
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(line.getBoundingClientRect()); // Final Sync
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <>
            {/* SELECTION FRAME FOR LINE */}
            <div
                ref={overlayRef}
                className="fixed pointer-events-none border border-orange-400 z-50 bg-orange-400/10 transition-none"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, display: 'block' }}
            >
                <div className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize pointer-events-auto bg-orange-400 opacity-50 hover:opacity-100" onMouseDown={(e) => handleResize(e, 'e')}></div>

                {/* Drag Handle Overlay (if absolute) */}
                {line.style.position === 'absolute' && (
                    <div className="absolute -top-3 left-0 w-full h-3 cursor-move pointer-events-auto bg-transparent" onMouseDown={handleDrag} title="Drag Line"></div>
                )}
            </div>

            <div className="fixed z-[60] bg-slate-900 text-white rounded p-1 shadow-xl flex gap-1 items-center" style={{ top: rect.top - 40, left: rect.left }}>
                <span className="text-[10px] text-gray-400">Pos:</span>
                <div className="flex gap-1">
                    <button onClick={() => { line.style.position = 'static'; onUpdate && onUpdate(); }} className={`px-2 py-0.5 text-[10px] rounded ${line.style.position !== 'absolute' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Inline</button>
                    <button onClick={() => { line.style.position = 'absolute'; line.style.zIndex = '10'; onUpdate && onUpdate(); }} className={`px-2 py-0.5 text-[10px] rounded ${line.style.position === 'absolute' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Float</button>
                </div>
                <div className="w-px h-4 bg-gray-500 mx-1"></div>

                <span className="text-[10px] text-gray-400">Props:</span>
                {/* Width / Scale */}
                <input type="range" min="1" max="20" defaultValue={parseInt(line.style.height) || 1} onChange={(e) => { line.style.height = `${e.target.value}px`; onUpdate && onUpdate(); }} className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" title="Thickness" />

                {/* Colors */}
                <button onClick={() => { line.style.backgroundColor = 'black'; onUpdate && onUpdate(); }} className="w-3 h-3 bg-black border border-white rounded-full ml-1"></button>
                <button onClick={() => { line.style.backgroundColor = 'red'; onUpdate && onUpdate(); }} className="w-3 h-3 bg-red-500 border border-white rounded-full"></button>
                <button onClick={() => { line.style.backgroundColor = 'blue'; onUpdate && onUpdate(); }} className="w-3 h-3 bg-blue-500 border border-white rounded-full"></button>

                <div className="w-px h-4 bg-gray-500 mx-1"></div>

                {/* Styles: Solid, Dashed, Dotted */}
                <select
                    className="bg-slate-800 text-[10px] rounded px-1 h-5 outline-none"
                    onChange={(e) => {
                        // HR border styles need special handling or use border-top
                        // Default HR is essentially a border. 
                        // Better to set border-style and background-color transparent if dashed?
                        // Standard HR behavior is quirky. Let's assume standard border tweaking.
                        line.style.border = "none";
                        line.style.borderTop = `${line.style.height || '1px'} ${e.target.value} ${line.style.backgroundColor || 'black'}`;
                        line.style.backgroundColor = 'transparent';
                        if (e.target.value === 'solid') {
                            line.style.backgroundColor = line.style.borderColor || 'black';
                            line.style.border = 'none'; // Reset to block fill for solid
                        }
                        onUpdate && onUpdate();
                    }}
                >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </select>

                <div className="w-px h-4 bg-gray-500 mx-1"></div>
                <button onClick={() => line.remove()} className="text-red-500 font-bold px-1 hover:text-red-400">✕</button>
            </div>
        </>
    );
}
