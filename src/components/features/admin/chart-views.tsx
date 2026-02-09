"use client";

import { Card } from "@/components/ui/card";
import { BarChart2, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

interface ComplianceChartProps {
    data: { name: string; full_name: string; percentage: number; schools: number; reports: number }[];
    onDistrictClick?: (district: any) => void;
}

interface StatusChartProps {
    data: { name: string; value: number; color: string }[];
    total: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-sm">
                <p className="font-bold text-slate-800 mb-1">{data.full_name || data.name}</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">Progress: </span>
                    <span className="font-semibold text-blue-600">{data.percentage || data.value}%</span>
                </div>
                {data.schools && (
                    <p className="text-xs text-slate-400 mt-1">
                        {data.reports} dari {data.schools} sekolah lapor
                    </p>
                )}
            </div>
        );
    }
    return null;
};

export function ComplianceChart({ data, onDistrictClick }: ComplianceChartProps) {
    return (
        <Card className="p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border-slate-100 h-full">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" /> Progress Area
                    </h3>
                    <p className="text-sm text-slate-500">Persentase sekolah yang sudah melapor</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <TrendingUp size={14} /> Real-time
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                        <defs>
                            <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            dy={10}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Area
                            type="monotone"
                            dataKey="percentage"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorPercentage)"
                            animationDuration={1500}
                            onClick={(data) => {
                                if (onDistrictClick && data && data.activePayload && data.activePayload.length) {
                                    onDistrictClick(data.activePayload[0].payload);
                                }
                            }}
                            cursor="pointer"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function StatusChart({ data, total }: StatusChartProps) {
    return (
        <Card className="p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border-slate-100 h-full">
            <h3 className="font-bold text-lg mb-2 text-slate-800 flex items-center gap-2">
                <PieChartIcon size={20} className="text-teal-600" /> Status Laporan
            </h3>
            <p className="text-sm text-slate-500 mb-6">Distribusi status laporan bulan ini</p>

            <div className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => <span className="text-slate-600 font-medium ml-2 text-xs">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                    <span className="text-4xl font-bold text-slate-800 tracking-tight">{total}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                </div>
            </div>
        </Card>
    );
}
