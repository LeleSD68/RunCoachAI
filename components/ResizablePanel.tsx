
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
    children: [React.ReactNode, React.ReactNode];
    direction: 'vertical' | 'horizontal';
    initialSize?: number;
    initialSizeRatio?: number;
    minSize?: number;
    minSizeSecondary?: number;
    className?: string;
    onResizeEnd?: (size: number, ratio: number) => void; // New prop
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({ children, direction, initialSize, initialSizeRatio, minSize = 50, minSizeSecondary = 50, className, onResizeEnd }) => {
    const [size, setSize] = useState<number | undefined>(initialSize);
    const containerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    useEffect(() => {
        if (size === undefined && initialSizeRatio && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const totalSize = direction === 'vertical' ? rect.width : rect.height;
            if (totalSize > 0) {
                 setSize(totalSize * initialSizeRatio);
            }
        }
    }, [size, initialSizeRatio, direction]);

    // Helper to calculate and emit final size/ratio
    const emitResizeEnd = useCallback((currentSize: number) => {
        if (onResizeEnd && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const totalSize = direction === 'vertical' ? rect.width : rect.height;
            const ratio = totalSize > 0 ? currentSize / totalSize : 0.5;
            onResizeEnd(currentSize, ratio);
        }
    }, [direction, onResizeEnd]);

    // --- MOUSE EVENTS ---
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current || !containerRef.current) return;
        e.preventDefault();
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newSize, maxSize;

            if (direction === 'vertical') {
                newSize = e.clientX - rect.left;
                maxSize = rect.width - minSizeSecondary;
            } else {
                newSize = e.clientY - rect.top;
                maxSize = rect.height - minSizeSecondary;
            }
            const finalSize = Math.max(minSize, Math.min(newSize, maxSize));
            setSize(finalSize);
        });
    }, [direction, minSize, minSizeSecondary]);
    
    const handleMouseUp = useCallback(() => {
        if (isResizing.current) {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Emit the final size from state (we need to access the current value, 
            // but since handleMouseUp is a closure, we might need a ref or rely on the last set state logic)
            // Ideally we'd pass the specific size, but accessing state here might be stale without deps.
            // However, `size` update triggers re-render. Let's use a ref for the *latest* size during drag if needed, 
            // or calculate it one last time.
            // Simpler approach: We trust the user stopped dragging near where the mouse is.
            // But calculating exact size here requires the event object which we don't have in this specific callback signature easily 
            // unless we attach it to window listener.
            
            // Better approach: Let the effect or the setState update trigger it? No, that would trigger on every frame.
            // Let's rely on `size` being reasonably up to date or passed via a ref if strictly necessary.
            // Actually, we can just trigger it with the current `size` state if we include it in dependency, 
            // but we only want to trigger ONCE at end.
            
            // Hack: trigger a state read via a ref to get latest size without re-rendering loop
        }
    }, [handleMouseMove]);

    // We use a ref to track the latest size to emit it on mouse up without stale closures
    const sizeRef = useRef(size);
    useEffect(() => { sizeRef.current = size; }, [size]);

    const handleMouseUpWithEmit = useCallback(() => {
        if (isResizing.current) {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUpWithEmit);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            if (sizeRef.current !== undefined) {
                emitResizeEnd(sizeRef.current);
            }
        }
    }, [handleMouseMove, emitResizeEnd]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUpWithEmit);
        document.body.style.cursor = direction === 'vertical' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    // --- TOUCH EVENTS ---
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isResizing.current || !containerRef.current) return;
        if (e.cancelable) e.preventDefault(); 
        
        const touch = e.touches[0];
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newSize, maxSize;

            if (direction === 'vertical') {
                newSize = touch.clientX - rect.left;
                maxSize = rect.width - minSizeSecondary;
            } else {
                newSize = touch.clientY - rect.top;
                maxSize = rect.height - minSizeSecondary;
            }
            const finalSize = Math.max(minSize, Math.min(newSize, maxSize));
            setSize(finalSize);
        });
    }, [direction, minSize, minSizeSecondary]);

    const handleTouchEnd = useCallback(() => {
        if (isResizing.current) {
            isResizing.current = false;
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.body.style.userSelect = '';
            
            if (sizeRef.current !== undefined) {
                emitResizeEnd(sizeRef.current);
            }
        }
    }, [handleTouchMove, emitResizeEnd]);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation(); 
        isResizing.current = true;
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.body.style.userSelect = 'none';
    };
    
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUpWithEmit);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUpWithEmit, handleTouchMove, handleTouchEnd]);

    const isVertical = direction === 'vertical';
    const panelStyle = {
        [isVertical ? 'width' : 'height']: size !== undefined ? `${size}px` : (initialSizeRatio ? `${initialSizeRatio * 100}%` : '50%')
    };

    return (
        <div
            ref={containerRef}
            className={`flex h-full w-full overflow-hidden ${isVertical ? 'flex-row' : 'flex-col'} ${className ?? ''}`}
        >
            <div style={panelStyle} className="flex-shrink-0 overflow-hidden relative">
                {children[0]}
            </div>
            
            {/* Resizer Handle */}
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`flex-shrink-0 bg-slate-700 hover:bg-cyan-500 active:bg-cyan-400 transition-colors duration-200 z-10 relative flex justify-center items-center group
                    ${isVertical ? 'w-1 cursor-ew-resize' : 'h-1 cursor-ns-resize'}`}
            >
                <div className={`absolute ${isVertical ? 'w-6 h-full' : 'w-full h-6'} z-0 bg-transparent`}></div>
                <div className={`bg-slate-500 group-hover:bg-white rounded-full transition-colors z-10 opacity-50 ${isVertical ? 'w-0.5 h-4' : 'w-4 h-0.5'}`}></div>
            </div>

            <div className="flex-grow overflow-hidden relative min-w-0 min-h-0">
                {children[1]}
            </div>
        </div>
    );
};

export default ResizablePanel;
