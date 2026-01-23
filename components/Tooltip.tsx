
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  subtext?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  text, 
  subtext, 
  position = 'top', 
  delay = 400 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [arrowStyles, setArrowStyles] = useState<{ [key: string]: string | number }>({});
  const timerRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true);
      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVisible) {
      setIsVisible(false);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    } else {
      setIsVisible(true);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }
  };

  useLayoutEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const margin = 8;
        
        // Viewport dimensions
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let top = 0;
        let left = 0;
        let finalPos = position;

        // Initial Calculation based on preferred position
        const calculatePosition = (pos: string) => {
            switch(pos) {
                case 'top':
                    return {
                        top: triggerRect.top - tooltipRect.height - margin,
                        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
                    };
                case 'bottom':
                    return {
                        top: triggerRect.bottom + margin,
                        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
                    };
                case 'left':
                    return {
                        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
                        left: triggerRect.left - tooltipRect.width - margin
                    };
                case 'right':
                    return {
                        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
                        left: triggerRect.right + margin
                    };
                default:
                    return { top: 0, left: 0 };
            }
        };

        let calculated = calculatePosition(finalPos);

        // --- Boundary Checks & Flipping ---
        
        // Vertical Flip
        if (finalPos === 'top' && calculated.top < 0) {
            finalPos = 'bottom';
            calculated = calculatePosition('bottom');
        } else if (finalPos === 'bottom' && calculated.top + tooltipRect.height > vh) {
            finalPos = 'top';
            calculated = calculatePosition('top');
        }

        // Horizontal Clamping
        // If the tooltip (mostly for top/bottom) goes off screen horizontally, clamp it
        // but try to keep arrow pointing to trigger.
        if (calculated.left < 5) {
            calculated.left = 5;
        } else if (calculated.left + tooltipRect.width > vw - 5) {
            calculated.left = vw - tooltipRect.width - 5;
        }

        // Calculate Arrow Position relative to Tooltip Box
        // Arrow needs to point to the center of the trigger
        const triggerCenterX = triggerRect.left + triggerRect.width / 2;
        const triggerCenterY = triggerRect.top + triggerRect.height / 2;
        
        let arrowStyle: any = {};
        
        // Simple arrow logic: center it relative to tooltip, then offset by difference
        // relativeLeft = triggerCenter - tooltipLeft
        if (finalPos === 'top' || finalPos === 'bottom') {
            let arrowLeft = triggerCenterX - calculated.left;
            // Clamp arrow inside tooltip (considering border radius approx 8px)
            arrowLeft = Math.max(10, Math.min(tooltipRect.width - 10, arrowLeft));
            
            arrowStyle = {
                left: `${arrowLeft}px`,
                [finalPos === 'top' ? 'bottom' : 'top']: '-5px',
                transform: finalPos === 'top' ? 'translateX(-50%) rotate(0deg)' : 'translateX(-50%) rotate(180deg)'
            };
        } else {
             // Side Tooltips
             let arrowTop = triggerCenterY - calculated.top;
             arrowTop = Math.max(10, Math.min(tooltipRect.height - 10, arrowTop));
             
             arrowStyle = {
                top: `${arrowTop}px`,
                [finalPos === 'left' ? 'right' : 'left']: '-5px',
                transform: finalPos === 'left' ? 'translateY(-50%) rotate(-90deg)' : 'translateY(-50%) rotate(90deg)'
             };
        }

        setCoords({ top: calculated.top, left: calculated.left });
        setArrowStyles(arrowStyle);
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative flex items-center justify-center cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
            ref={tooltipRef}
            className="fixed z-[10000] pointer-events-none transition-opacity duration-200 ease-out"
            style={{ 
                top: `${coords.top}px`, 
                left: `${coords.left}px`,
                opacity: coords.top === 0 && coords.left === 0 ? 0 : 1 // Hide until positioned
            }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-lg shadow-2xl min-w-[140px] max-w-[240px] ring-1 ring-white/10 relative">
            <p className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider mb-1 leading-tight">
                {text}
            </p>
            {subtext && (
                <p className="text-slate-300 text-[10px] leading-relaxed font-medium">
                {subtext}
                </p>
            )}
            
            {/* Arrow */}
            <div 
                className="absolute w-2 h-2 bg-slate-900 border-r border-b border-cyan-500/40 rotate-45"
                style={arrowStyles as any}
            ></div>
            </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
