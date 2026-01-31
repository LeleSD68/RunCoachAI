
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  subtext?: string;
  helpText?: string; // Nuova prop per istruzioni dettagliate
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
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
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
      
      // Se esiste un testo di aiuto, avvia il timer di 2 secondi
      if (helpText) {
          helpTimerRef.current = window.setTimeout(() => {
              setShowExtraHelp(true);
          }, 2000);
      }

      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 8000); // Aumentato tempo per leggere helpText
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (helpTimerRef.current) clearTimeout(helpTimerRef.current);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    
    setIsVisible(false);
    setShowExtraHelp(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Suggerimento rapido: il click forza l'apertura ma resetta l'help
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
        const margin = 8;
        
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

        if (finalPos === 'top' && calculated.top < 0) {
            finalPos = 'bottom';
            calculated = calculatePosition('bottom');
        } else if (finalPos === 'bottom' && calculated.top + tooltipRect.height > vh) {
            finalPos = 'top';
            calculated = calculatePosition('top');
        }

        if (calculated.left < 5) calculated.left = 5;
        else if (calculated.left + tooltipRect.width > vw - 5) calculated.left = vw - tooltipRect.width - 5;

        const triggerCenterX = triggerRect.left + triggerRect.width / 2;
        const triggerCenterY = triggerRect.top + triggerRect.height / 2;
        
        let arrowStyle: any = {};
        
        if (finalPos === 'top' || finalPos === 'bottom') {
            let arrowLeft = triggerCenterX - calculated.left;
            arrowLeft = Math.max(10, Math.min(tooltipRect.width - 10, arrowLeft));
            arrowStyle = {
                left: `${arrowLeft}px`,
                [finalPos === 'top' ? 'bottom' : 'top']: '-5px',
                transform: finalPos === 'top' ? 'translateX(-50%) rotate(0deg)' : 'translateX(-50%) rotate(180deg)'
            };
        } else {
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
  }, [isVisible, showExtraHelp, position]); // Ricalcola se cambia l'altezza per l'help

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
            className="fixed z-[10000] pointer-events-none transition-all duration-300 ease-out"
            style={{ 
                top: `${coords.top}px`, 
                left: `${coords.left}px`,
                opacity: coords.top === 0 && coords.left === 0 ? 0 : 1 
            }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-lg shadow-2xl min-w-[160px] max-w-[260px] ring-1 ring-white/10 relative overflow-hidden">
                <p className="text-cyan-400 font-black text-[11px] uppercase tracking-wider mb-1 leading-tight">
                    {text}
                </p>
                {subtext && (
                    <p className="text-slate-300 text-[10px] leading-relaxed font-bold">
                    {subtext}
                    </p>
                )}

                {showExtraHelp && helpText && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 animate-fade-in-up">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[8px] bg-purple-600 text-white px-1.5 rounded font-black uppercase tracking-tighter">Istruzioni</span>
                        </div>
                        <p className="text-slate-400 text-[9px] leading-snug italic">
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
          @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(5px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default Tooltip;
