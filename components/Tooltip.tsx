
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  subtext?: string;
  helpText?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  text, 
  subtext, 
  helpText,
  position = 'top', 
  delay = 400 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showExtraHelp, setShowExtraHelp] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null); // Start null to prevent flash
  const [arrowStyles, setArrowStyles] = useState<{ [key: string]: string | number }>({});
  
  const timerRef = useRef<number | null>(null);
  const helpTimerRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(true);
      
      if (helpText) {
          helpTimerRef.current = window.setTimeout(() => {
              setShowExtraHelp(true);
          }, 2000);
      }

      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 8000); 
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    
    setIsVisible(false);
    setShowExtraHelp(false);
    setCoords(null); // Reset coords on close
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isVisible) {
        setIsVisible(true);
        setShowExtraHelp(false);
    } else {
        setIsVisible(false);
    }
  };

  useLayoutEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const margin = 10; // Distance from element
        
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let finalPos = position;

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

        // Flip if out of bounds
        if (finalPos === 'top' && calculated.top < 0) {
            finalPos = 'bottom';
            calculated = calculatePosition('bottom');
        } else if (finalPos === 'bottom' && calculated.top + tooltipRect.height > vh) {
            finalPos = 'top';
            calculated = calculatePosition('top');
        }

        // Horizontal constrain
        if (calculated.left < 5) calculated.left = 5;
        else if (calculated.left + tooltipRect.width > vw - 5) calculated.left = vw - tooltipRect.width - 5;

        // Arrow Calculation
        const triggerCenterX = triggerRect.left + triggerRect.width / 2;
        const triggerCenterY = triggerRect.top + triggerRect.height / 2;
        
        let arrowStyle: any = {};
        
        if (finalPos === 'top' || finalPos === 'bottom') {
            let arrowLeft = triggerCenterX - calculated.left;
            // Clamp arrow to tooltip bounds (minus radius)
            arrowLeft = Math.max(12, Math.min(tooltipRect.width - 12, arrowLeft));
            arrowStyle = {
                left: `${arrowLeft}px`,
                [finalPos === 'top' ? 'bottom' : 'top']: '-4px', // Slight overlap to hide border seam if needed
                transform: finalPos === 'top' ? 'translateX(-50%) rotate(0deg)' : 'translateX(-50%) rotate(180deg)'
            };
        } else {
             let arrowTop = triggerCenterY - calculated.top;
             arrowTop = Math.max(12, Math.min(tooltipRect.height - 12, arrowTop));
             arrowStyle = {
                top: `${arrowTop}px`,
                [finalPos === 'left' ? 'right' : 'left']: '-4px',
                transform: finalPos === 'left' ? 'translateY(-50%) rotate(-90deg)' : 'translateY(-50%) rotate(90deg)'
             };
        }

        setCoords({ top: calculated.top, left: calculated.left });
        setArrowStyles(arrowStyle);
    }
  }, [isVisible, showExtraHelp, position]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative flex items-center justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
            ref={tooltipRef}
            className="fixed z-[10000] pointer-events-none transition-opacity duration-200"
            style={{ 
                top: coords ? `${coords.top}px` : '-9999px', 
                left: coords ? `${coords.left}px` : '-9999px',
                opacity: coords ? 1 : 0,
                // Simple float up animation when appearing
                animation: coords ? 'tooltip-float 0.2s ease-out' : 'none'
            }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-2.5 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] min-w-[140px] max-w-[240px] ring-1 ring-white/10 relative">
                <p className="text-cyan-400 font-black text-[10px] uppercase tracking-widest mb-0.5 leading-tight text-center">
                    {text}
                </p>
                {subtext && (
                    <p className="text-slate-300 text-[10px] leading-tight font-bold text-center">
                    {subtext}
                    </p>
                )}

                {showExtraHelp && helpText && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 animate-fade-in-up">
                        <p className="text-slate-400 text-[9px] leading-snug italic text-center">
                            {helpText}
                        </p>
                    </div>
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
      <style>{`
          @keyframes tooltip-float {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(2px); }
              to { opacity: 1; transform: translateY(0); }
          }
      `}</style>
    </>
  );
};

export default Tooltip;
