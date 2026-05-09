"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { loadAnalytics, type PriorityItem } from "@/lib/mock-data";

const tooltipStyle = {
  background: "rgba(8, 8, 7, 0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  color: "#fff",
  boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
};

type LoadAnalyticsPoint = {
  label: string;
  pressure: number;
  focus: number;
};

export function LoadAreaChart({ data }: { data?: LoadAnalyticsPoint[] }) {
  const mounted = useChartMounted();
  const chartData = data && data.length ? data : loadAnalytics;

  if (!mounted) return <ChartSkeleton className="h-64" />;

  return (
    <div className="h-64 min-h-64 min-w-0 w-full">
      <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
        <AreaChart data={chartData} margin={{ bottom: 0, left: -18, right: 8, top: 10 }}>
          <defs>
            <linearGradient id="pressure" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#ff8eb6" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#ff8eb6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="focus" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#78ffd6" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#78ffd6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.48)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.16)" }} />
          <Area
            animationDuration={1200}
            dataKey="pressure"
            fill="url(#pressure)"
            name="Notification pressure"
            stroke="#ff8eb6"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            animationDuration={1400}
            dataKey="focus"
            fill="url(#focus)"
            name="Focus score"
            stroke="#78ffd6"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformBarChart({ signals = [] }: { signals?: PriorityItem[] }) {
  const mounted = useChartMounted();

  const platformData = ["Gmail", "Calendar", "Tasks"] as const;
  const platformColors: Record<typeof platformData[number], string> = {
    Gmail: "#78ffd6",
    Calendar: "#ffe19c",
    Tasks: "#72e9ff"
  };

  const data = platformData.map((platform) => {
    const platformSignals = signals.filter((signal) => signal.platform === platform);
    const count = platformSignals.length;
    const critical = platformSignals.filter((signal) => signal.priority >= 80).length;
    const muted = platformSignals.filter((signal) => signal.hideInFocus ?? signal.priority < 70).length;

    return {
      platform,
      count,
      muted,
      critical,
      color: platformColors[platform]
    };
  });

  if (!mounted) return <ChartSkeleton className="h-56" />;

  return (
    <div className="h-56 min-h-56 min-w-0 w-full">
      <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
        <BarChart data={data} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="platform"
            tick={{ fill: "rgba(255,255,255,0.48)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar
            animationDuration={900}
            dataKey="muted"
            fill="#3c3c3a"
            name="Muted"
            radius={[10, 10, 0, 0]}
          />
          <Bar
            animationDuration={1200}
            dataKey="critical"
            fill="#78ffd6"
            name="Critical"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useChartMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return mounted;
}

function ChartSkeleton({ className }: { className: string }) {
  return (
    <div className={`w-full rounded-2xl border border-white/8 bg-white/[0.035] ${className}`}>
      <div className="flex h-full items-end gap-2 p-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            className="w-full animate-pulse rounded-t-xl bg-white/[0.08]"
            key={index}
            style={{ height: `${24 + ((index * 13) % 58)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
