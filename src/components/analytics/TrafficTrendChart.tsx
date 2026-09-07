'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { TrendingUp, BarChart3, Users, Eye } from 'lucide-react';
import type { DailyTrafficPoint } from '@/types/analytics';

export interface TrafficTrendChartProps {
  data: DailyTrafficPoint[];
  isLoading?: boolean;
}

export function TrafficTrendChart({ data, isLoading }: TrafficTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute scale max
  const maxVal = Math.max(...data.map((d) => Math.max(d.pageViews, d.uniqueVisitors)), 12);
  const height = 180;
  const paddingBottom = 28;
  const paddingTop = 20;
  const usableHeight = height - paddingBottom - paddingTop;

  return (
    <Card className="p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recruiter Traffic Velocity &amp; Daily Sessions
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily inbound page views and verified unique recruiter sessions over time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="w-3 h-3 rounded-xs bg-indigo-500" />
            <span>Page Views</span>
          </div>
          <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Unique Visitors</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Loading traffic telemetry...
          </div>
        ) : (
          <div className="relative">
            {/* Chart Canvas */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[450px]">
                <svg
                  viewBox={`0 0 ${Math.max(500, data.length * 45)} ${height}`}
                  className="w-full h-48 overflow-visible"
                >
                  <defs>
                    <linearGradient id="pageViewBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="pageViewBarHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="1" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = paddingTop + usableHeight * (1 - ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1="0"
                          y1={y}
                          x2="100%"
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="3 3"
                          className="text-slate-100 dark:text-slate-800"
                        />
                        <text
                          x="0"
                          y={y - 3}
                          className="text-[9px] font-mono fill-slate-400 dark:fill-slate-600"
                        >
                          {Math.round(maxVal * ratio)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars & Points */}
                  {data.map((d, idx) => {
                    const totalWidth = Math.max(500, data.length * 45);
                    const colWidth = totalWidth / data.length;
                    const cx = idx * colWidth + colWidth / 2;

                    const barH = (d.pageViews / maxVal) * usableHeight;
                    const barY = paddingTop + usableHeight - barH;
                    const barW = Math.min(24, colWidth * 0.45);

                    const dotY = paddingTop + usableHeight - (d.uniqueVisitors / maxVal) * usableHeight;

                    const isHovered = hoveredIndex === idx;

                    return (
                      <g
                        key={d.date}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Interactive column hit box */}
                        <rect
                          x={cx - colWidth / 2}
                          y="0"
                          width={colWidth}
                          height={height}
                          fill="transparent"
                        />

                        {/* Page View Bar */}
                        <rect
                          x={cx - barW / 2}
                          y={barY}
                          width={barW}
                          height={Math.max(4, barH)}
                          rx="4"
                          fill={isHovered ? 'url(#pageViewBarHover)' : 'url(#pageViewBarGrad)'}
                          className="transition-all duration-150"
                        />

                        {/* Unique Visitors Dot Indicator */}
                        <circle
                          cx={cx}
                          cy={dotY}
                          r={isHovered ? 5 : 3.5}
                          className="fill-violet-600 dark:fill-violet-400 stroke-white dark:stroke-slate-900 stroke-2 transition-all duration-150"
                        />

                        {/* Date Label */}
                        <text
                          x={cx}
                          y={height - 8}
                          textAnchor="middle"
                          className={`text-[10px] font-semibold transition-colors ${
                            isHovered
                              ? 'fill-indigo-600 dark:fill-indigo-400 font-bold'
                              : 'fill-slate-400 dark:fill-slate-500'
                          }`}
                        >
                          {d.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Hover Tooltip display */}
            {hoveredIndex !== null && data[hoveredIndex] && (
              <div className="absolute top-2 right-2 bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-lg border border-slate-700/50 flex items-center gap-4 pointer-events-none">
                <span className="font-bold text-slate-300">{data[hoveredIndex].date}</span>
                <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                  <Eye className="w-3.5 h-3.5" />
                  {data[hoveredIndex].pageViews} views
                </span>
                <span className="flex items-center gap-1 text-violet-300 font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {data[hoveredIndex].uniqueVisitors} unique
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
