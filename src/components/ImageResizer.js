import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

export default function ImageResizer({ image, onUpdate, onDelete }) {
    // 1. Always call hooks top-level
    // Initialize rect safely
    const [rect, setRect] = useState(null);
    const overlayRef = React.useRef(null); // Moved to top level

    // Sync rect on scroll/resize
    useEffect(() => {
        if (!image) return;

        const update = () => {
            if (image.isConnected) {
                setRect(image.getBoundingClientRect());
            }
        }
        // Initial set
        update();

        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        const interval = setInterval(update, 500); // Polling for layout shifts
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
            clearInterval(interval);
        }
    }, [image]);

    if (!image || !rect) return null;

    const handleResize = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = image.offsetWidth;
        const startH = image.offsetHeight;

        const onMove = (mv) => {
            let newW = startW;
            let newH = startH;

            if (direction.includes('e')) newW = startW + (mv.clientX - startX);
            if (direction.includes('w')) newW = startW - (mv.clientX - startX);

            const aspect = startW / startH;
            newH = newW / aspect;

            // Update Image (Source)
            image.style.width = `${newW}px`;
            image.style.height = `${newH}px`;

            // Update Overlay (Direct DOM) for performance
            if (overlayRef.current) {
                const r = image.getBoundingClientRect();
                overlayRef.current.style.left = `${r.left}px`;
                overlayRef.current.style.top = `${r.top}px`;
                overlayRef.current.style.width = `${r.width}px`;
                overlayRef.current.style.height = `${r.height}px`;
            }
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(image.getBoundingClientRect()); // Sync State Final
            onUpdate && onUpdate({ width: image.style.width });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleDrag = (e) => {
        if (image.style.position !== 'absolute') return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(image.style.left) || 0;
        const startTop = parseInt(image.style.top) || 0;

        const onMove = (mv) => {
            image.style.left = `${startLeft + (mv.clientX - startX)}px`;
            image.style.top = `${startTop + (mv.clientY - startY)}px`;

            // Update Overlay (Direct DOM)
            if (overlayRef.current) {
                const r = image.getBoundingClientRect();
                overlayRef.current.style.left = `${r.left}px`;
                overlayRef.current.style.top = `${r.top}px`;
            }
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setRect(image.getBoundingClientRect()); // Sync State Final
            onUpdate && onUpdate({ style: { left: image.style.left, top: image.style.top } });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <>
            <div
                ref={overlayRef}
                className="fixed pointer-events-none border-2 border-emerald-500 z-50 transition-none"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, display: 'block' }}
            >
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-emerald-500 pointer-events-auto cursor-nwse-resize" onMouseDown={(e) => handleResize(e, 'nw')}></div>
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-emerald-500 pointer-events-auto cursor-nesw-resize" onMouseDown={(e) => handleResize(e, 'ne')}></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-emerald-500 pointer-events-auto cursor-nesw-resize" onMouseDown={(e) => handleResize(e, 'sw')}></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-emerald-500 pointer-events-auto cursor-nwse-resize" onMouseDown={(e) => handleResize(e, 'se')}></div>
                {image.style.position === 'absolute' && (
                    <div className="absolute inset-0 cursor-move pointer-events-auto bg-transparent" onMouseDown={handleDrag} title="Drag to move"></div>
                )}
            </div>

            <div className="fixed z-[60] bg-slate-900 text-white rounded-lg p-2 shadow-xl flex flex-col gap-2" style={{ left: rect.left, top: rect.top - 100 }}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Position</span>
                    <button onClick={() => { image.style.position = 'static'; image.style.float = 'none'; onUpdate && onUpdate({}); }} className="p-1 px-2 bg-slate-800 rounded hover:bg-slate-700 text-xs">Inline</button>
                    <button onClick={() => { image.style.position = 'absolute'; image.style.zIndex = '10'; onUpdate && onUpdate({}); }} className="p-1 px-2 bg-slate-800 rounded hover:bg-slate-700 text-xs">Floating</button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Wrap</span>
                    <button onClick={() => { image.style.float = 'left'; onUpdate && onUpdate({}); }} title="Left" className="p-1 hover:bg-white/20 rounded"><Icons.AlignLeft /></button>
                    <button onClick={() => { image.style.float = 'right'; onUpdate && onUpdate({}); }} title="Right" className="p-1 hover:bg-white/20 rounded"><Icons.AlignRight /></button>
                    <button onClick={() => { image.style.position = 'absolute'; image.style.zIndex = '0'; onUpdate && onUpdate({}); }} title="Behind Text" className="p-1 hover:bg-white/20 rounded text-[10px]">Behind</button>
                    <button onClick={() => { image.style.position = 'absolute'; image.style.zIndex = '20'; onUpdate && onUpdate({}); }} title="In Front" className="p-1 hover:bg-white/20 rounded text-[10px]">Front</button>
                </div>
                <div className="w-full h-px bg-white/20"></div>
                <button onClick={onDelete} className="w-full text-center text-red-400 hover:text-red-300 text-xs font-bold uppercase py-1">Delete Image</button>
            </div>
        </>
    );
}
