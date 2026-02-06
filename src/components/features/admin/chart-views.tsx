"use client";

import { Card } from "@/components/ui/card";
import { BarChart2, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

interface ComplianceChartProps {
    data: { name: string; full_name: string; percentage: number; schools: number; reports: number }[];
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
                    <span className="text-slate-600">Kepatuhan: </span>
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

export function ComplianceChart({ data }: ComplianceChartProps) {
    return (
        <Card className="p-6 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <BarChart2 size={20} className="text-blue-600" /> Kepatuhan per Kecamatan
                    </h3>
                    <p className="text-sm text-slate-500">Persentase sekolah yang melapor tepat waktu</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <TrendingUp size={14} /> Real-time
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar
                            dataKey="percentage"
                            fill="#3b82f6"
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export function StatusChart({ data, total }: StatusChartProps) {
    return (
        <Card className="p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border-slate-100">
            <h3 className="font-bold text-lg mb-2 text-slate-800 flex items-center gap-2">
                <PieChartIcon size={20} className="text-teal-600" /> Status Laporan
            </h3>
            <p className="text-sm text-slate-500 mb-6">Distribusi status laporan bulan ini</p>

            <div className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={80}
                            outerRadius={110}
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
                            formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-5xl font-bold text-slate-800 tracking-tight">{total}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Total Laporan</span>
                </div>
            </div>
        </Card>
    );
}
