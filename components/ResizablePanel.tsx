
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
    children: [React.ReactNode, React.ReactNode];
    direction: 'vertical' | 'horizontal';
    initialSize?: number;
    initialSizeRatio?: number;
    minSize?: number;
    minSizeSecondary?: number;
    className?: string;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({ children, direction, initialSize, initialSizeRatio, minSize = 50, minSizeSecondary = 50, className }) => {
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
            setSize(Math.max(minSize, Math.min(newSize, maxSize)));
        });
    }, [direction, minSize, minSizeSecondary]);
    
    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = direction === 'vertical' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    // --- TOUCH EVENTS ---
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isResizing.current || !containerRef.current) return;
        // Prevent default to stop scrolling while resizing
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
            setSize(Math.max(minSize, Math.min(newSize, maxSize)));
        });
    }, [direction, minSize, minSizeSecondary]);

    const handleTouchEnd = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.body.style.userSelect = '';
    }, [handleTouchMove]);

    const handleTouchStart = (e: React.TouchEvent) => {
        // Prevent default to avoid scrolling initiation on the handle
        e.stopPropagation(); 
        isResizing.current = true;
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.body.style.userSelect = 'none';
    };
    
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
                {/* Invisible larger hit area for easier touch interaction */}
                <div className={`absolute ${isVertical ? 'w-6 h-full' : 'w-full h-6'} z-0 bg-transparent`}></div>
                
                {/* Visual Indicator (Optional Grip) */}
                <div className={`bg-slate-500 group-hover:bg-white rounded-full transition-colors z-10 opacity-50 ${isVertical ? 'w-0.5 h-4' : 'w-4 h-0.5'}`}></div>
            </div>

            <div className="flex-grow overflow-hidden relative min-w-0 min-h-0">
                {children[1]}
            </div>
        </div>
    );
};

export default ResizablePanel;