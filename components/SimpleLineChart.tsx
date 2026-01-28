
import React, { useMemo, useState } from 'react';

interface DataPoint {
    date: Date;
    value: number;
    value2?: number; // Optional second line
}

interface SimpleLineChartProps {
    data: DataPoint[];
    color1: string;
    color2?: string;
    title: string;
    yLabel: string;
    label2?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, color1, color2, title, yLabel, label2 }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // ViewBox dimensions constants
    const VIEW_WIDTH = 450;
    const VIEW_HEIGHT = 200;
    const PADDING = { top: 20, bottom: 30, left: 40, right: 10 };

    const { points1, points2, width, height, minVal, maxVal, xScale, yScale } = useMemo(() => {
        const chartW = VIEW_WIDTH - PADDING.left - PADDING.right;
        const chartH = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

        if (data.length === 0) return { points1: '', points2: '', width: VIEW_WIDTH, height: VIEW_HEIGHT, minVal: 0, maxVal: 100, xScale: (i:number)=>0, yScale: (v:number)=>0 };

        const allValues = data.map(d => d.value).concat(data.map(d => d.value2 || d.value));
        const minVal = Math.min(...allValues) * 0.95;
        const maxVal = Math.max(...allValues) * 1.05;
        const valRange = maxVal - minVal || 1;

        const xScale = (index: number) => PADDING.left + (index / (data.length - 1)) * chartW;
        const yScale = (val: number) => PADDING.top + chartH - ((val - minVal) / valRange) * chartH;

        const p1 = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
        const p2 = color2 ? data.map((d, i) => `${xScale(i)},${yScale(d.value2 || 0)}`).join(' ') : '';

        return { points1: p1, points2: p2, width: VIEW_WIDTH, height: VIEW_HEIGHT, minVal, maxVal, xScale, yScale };
    }, [data, color2]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svgRect = e.currentTarget.getBoundingClientRect();
        
        // Calculate mouse position relative to the SVG element (in pixels)
        const mouseXPixels = e.clientX - svgRect.left;
        
        // Convert pixel coordinate to SVG ViewBox coordinate system
        // logic: (mouse_px / total_width_px) * total_viewbox_units
        const svgX = (mouseXPixels / svgRect.width) * VIEW_WIDTH;
        
        const chartW = VIEW_WIDTH - PADDING.left - PADDING.right;
        
        // Calculate ratio based on the SVG coordinate system
        const ratio = Math.max(0, Math.min(1, (svgX - PADDING.left) / chartW));
        const index = Math.round(ratio * (data.length - 1));
        
        setHoveredIndex(index);
    };

    const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

    return (
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 shadow-md mb-4 select-none pb-4">
            <div className="flex justify-between items-center mb-2 px-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</h4>
                {hoveredData && (
                    <div className="text-[10px] bg-slate-900 px-2 py-1 rounded border border-slate-600 text-slate-200">
                        <span className="font-mono mr-2">{hoveredData.date.toLocaleDateString()}</span>
                        <span style={{ color: color1 }} className="font-bold">{hoveredData.value.toFixed(1)}</span>
                        {color2 && hoveredData.value2 !== undefined && (
                            <span style={{ color: color2 }} className="font-bold ml-2">{hoveredData.value2.toFixed(1)}</span>
                        )}
                    </div>
                )}
            </div>
            
            <div className="relative">
                <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    className="w-full h-auto cursor-crosshair"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(r => {
                        const y = yScale(minVal + (maxVal - minVal) * r);
                        return (
                            <g key={r}>
                                <line x1={PADDING.left} y1={y} x2={width - PADDING.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                                <text x={PADDING.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b">{(minVal + (maxVal - minVal) * r).toFixed(0)}</text>
                            </g>
                        );
                    })}

                    {/* Chart Lines */}
                    {points2 && <polyline points={points2} fill="none" stroke={color2} strokeWidth="2" />}
                    <polyline points={points1} fill="none" stroke={color1} strokeWidth="2" />

                    {/* Hover Marker */}
                    {hoveredIndex !== null && (
                        <>
                            <line 
                                x1={xScale(hoveredIndex)} y1={PADDING.top} 
                                x2={xScale(hoveredIndex)} y2={height - PADDING.bottom} 
                                stroke="white" strokeWidth="1" strokeOpacity="0.5" 
                            />
                            <circle cx={xScale(hoveredIndex)} cy={yScale(data[hoveredIndex].value)} r="4" fill={color1} stroke="white" strokeWidth="1" />
                            {color2 && data[hoveredIndex].value2 !== undefined && (
                                <circle cx={xScale(hoveredIndex)} cy={yScale(data[hoveredIndex].value2!)} r="4" fill={color2} stroke="white" strokeWidth="1" />
                            )}
                        </>
                    )}
                </svg>
            </div>
            
            {color2 && (
                <div className="flex justify-center gap-4 mt-1 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color1 }}></div>
                        <span className="text-slate-400">{yLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color2 }}></div>
                        <span className="text-slate-400">{label2}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleLineChart;
