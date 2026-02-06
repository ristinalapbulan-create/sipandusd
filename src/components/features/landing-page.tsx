"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, FileCheck, PieChart, Users, Trophy, Crown, Sparkles, ChevronLeft, AlertCircle } from "lucide-react";
import { LoginModal } from "./auth/login-modal";
import { api } from "@/lib/api";
import { SchoolData, Report } from "@/lib/types";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { KECAMATAN_LIST, MONTHS } from "@/lib/constants";

export function LandingPage() {
    const [showLogin, setShowLogin] = useState(false);
    const [stats, setStats] = useState<{ schools: number; reports: number; compliance: number; data?: { schools: SchoolData[], reports: Report[] } }>({ schools: 0, reports: 0, compliance: 0 });
    const { user } = useAuth();
    const router = useRouter();

    const currentYear = new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [rawData, setRawData] = useState<{ schools: SchoolData[], reports: Report[] } | null>(null);

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    useEffect(() => {
        api.getInitialData().then(data => {
            setRawData(data);
        });
    }, []);

    useEffect(() => {
        if (!rawData) return;

        const { schools, reports } = rawData;

        const activeReports = reports.filter(r =>
            r.year === selectedYear &&
            r.month === selectedMonth &&
            r.status === 'approved'
        );

        // Schools that have at least one approved report in the selected period
        // Note: Logic assumes one report per school per period usually
        const activeSchoolNpsns = new Set(activeReports.map(r => r.npsn)).size;

        const complianceRate = schools.length > 0 ? Math.round((activeSchoolNpsns / schools.length) * 100) : 0;

        setStats({
            schools: schools.length,
            reports: activeSchoolNpsns,
            compliance: complianceRate,
            data: rawData
        });
    }, [rawData, selectedMonth, selectedYear]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header onLoginClick={() => setShowLogin(true)} />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-gradient-to-br from-blue-700 to-teal-600 text-white py-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            Si-PANDU SD
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto font-light">
                            Sistem Pelaporan & Arsip Digital Unggulan Sekolah Dasar Bidang Pembinaan SD - Disdikbud Tabalong
                        </p>
                    </div>
                </section>

                {/* Dashboard Stats */}
                {/* Dashboard Stats */}
                <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-20 pb-16">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border border-blue-100">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Capaian Pelaporan</h2>
                            <p className="text-sm text-slate-500">
                                Data berdasarkan periode yang dipilih
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="appearance-none bg-blue-50 hover:bg-blue-100 text-blue-700 pl-4 pr-10 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors cursor-pointer"
                                >
                                    {MONTHS.map((m, i) => (
                                        <option key={i} value={(i + 1).toString()}>{m}</option>
                                    ))}
                                </select>
                                <ChevronLeft className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg] pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="appearance-none bg-blue-50 hover:bg-blue-100 text-blue-700 pl-4 pr-10 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors cursor-pointer"
                                >
                                    {[currentYear, (parseInt(currentYear) - 1).toString()].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <ChevronLeft className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg] pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-slate-500">
                            <div className="p-3 rounded-full bg-slate-100 text-slate-600">
                                <Building2 size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Sekolah</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.schools}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-teal-500">
                            <div className="p-3 rounded-full bg-teal-100 text-teal-600">
                                <FileCheck size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Sudah Lapor</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.reports}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-rose-500">
                            <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Belum Lapor</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.schools - stats.reports}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-indigo-500">
                            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                                <PieChart size={32} />
                            </div>
                            <div className="flex-1">
                                <p className="text-slate-500 text-sm font-medium mb-1">Capaian</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-indigo-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats.compliance}%` }}></div>
                                    </div>
                                    <span className="text-lg font-bold text-indigo-700">{stats.compliance}%</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Progress per Kecamatan */}
                    <div className="mt-16">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Users size={24} className="text-blue-600" />
                                Leaderboard Kecamatan - Bulan Ini
                            </h3>
                            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                                <Sparkles size={16} /> 100% = Tuntas
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {KECAMATAN_LIST.map(kec => {
                                const schoolsInKec = stats.data?.schools.filter(s => s.address === kec) || [];
                                const totalSchools = schoolsInKec.length || 1;

                                const currentYear = new Date().getFullYear().toString();
                                const currentMonth = (new Date().getMonth() + 1).toString(); // Placeholder, logic uses 'selectedYear' from outside scope but here we are in render.

                                const reportsInKec = stats.data?.reports.filter(r =>
                                    r.year === selectedYear &&
                                    r.month === selectedMonth &&
                                    r.status === 'approved' &&
                                    schoolsInKec.some(s => s.npsn === r.npsn)
                                ).length || 0;

                                const percent = Math.round((reportsInKec / totalSchools) * 100);
                                const isChampion = percent === 100 && totalSchools > 0;

                                return { kec, percent, totalSchools, reportsInKec, isChampion };
                            })
                                .sort((a, b) => b.percent - a.percent)
                                .map((item, index) => (
                                    <Card
                                        key={item.kec}
                                        className={`p-4 transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 ${item.isChampion
                                            ? "border-2 border-amber-400 shadow-amber-100 shadow-lg bg-gradient-to-br from-amber-50 to-white"
                                            : "hover:shadow-md border border-slate-100"
                                            }`}
                                    >
                                        {item.isChampion && (
                                            <div className="absolute -right-4 -top-4 bg-amber-400 w-16 h-16 rounded-full flex items-end justify-start p-2 transform rotate-12 shadow-sm">
                                                <Crown className="text-white w-6 h-6 mb-1 ml-1" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block ${index < 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    Rank #{index + 1}
                                                </span>
                                                <h4 className="font-bold text-slate-800 text-sm">{item.kec.replace('Kec. ', '')}</h4>
                                            </div>
                                            <span className={`text-lg font-bold ${item.isChampion ? 'text-amber-500' : 'text-blue-600'}`}>
                                                {item.percent}%
                                            </span>
                                        </div>

                                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-1000 ${item.isChampion ? "bg-amber-400" : "bg-blue-500"
                                                    }`}
                                                style={{ width: `${item.percent}%` }}
                                            ></div>
                                        </div>

                                        <p className="text-xs text-slate-400 flex justify-between">
                                            <span>{item.reportsInKec}/{item.totalSchools} Sekolah</span>
                                            {item.isChampion && <span className="text-amber-500 font-semibold flex items-center gap-1"><Trophy size={10} /> Tuntas</span>}
                                        </p>
                                    </Card>
                                ))}
                        </div>
                    </div>
                </section>

                <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
            </main>

            <Footer />
        </div>
    );
}
