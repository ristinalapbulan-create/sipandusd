"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, FileCheck, PieChart, Users, Trophy, Crown, Sparkles, ChevronLeft, AlertCircle } from "lucide-react";
import { LoginModal } from "./auth/login-modal";
import { firebaseService } from "@/lib/firebase-service";
import { SchoolData, Report } from "@/lib/types";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { KECAMATAN_LIST, MONTHS } from "@/lib/constants";

export function LandingPage() {
    const [showLogin, setShowLogin] = useState(false);
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // Data State
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Filter State
    const currentYear = new Date().getFullYear().toString();
    const currentMonthIndex = new Date().getMonth();
    const currentMonth = MONTHS[currentMonthIndex];

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Derived Stats State
    const [stats, setStats] = useState({
        totalSchools: 0,
        sudahLapor: 0,
        belumLapor: 0,
        capaian: 0
    });

    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    // Modal State
    const [selectedDistrictData, setSelectedDistrictData] = useState<{
        kec: string;
        unreportedSchools: SchoolData[];
        totalSchools: number;
        reported: number;
    } | null>(null);

    // Redirect if logged in
    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const [fetchedReports, fetchedSchools] = await Promise.all([
                    firebaseService.getReports('admin', 'public'), // Fetch ALL reports
                    firebaseService.getSchools()
                ]);
                setReports(fetchedReports);
                setSchools(fetchedSchools);
            } catch (e) {
                console.error("Failed to fetch public data", e);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    // Calculate Stats whenever Filters or Data change
    useEffect(() => {
        if (loadingData) return;

        // 1. Filter Reports by Year (and Month if selected)
        const filteredReports = reports.filter(r => {
            const matchYear = r.year === selectedYear;
            const matchMonth = selectedMonth ? r.month === selectedMonth : true;
            return matchYear && matchMonth;
        });

        const isYearly = selectedMonth === "";

        // 2. Calculate Global Stats
        const totalSchoolsCount = schools.length;

        // Count Logic:
        // Monthly: Count unique schools that reported
        // Yearly: Count unique (School + Month) entries. Target is Schools * 12.
        const uniqueReportEntries = isYearly
            ? new Set(filteredReports.map(r => `${r.npsn}-${r.month}`))
            : new Set(filteredReports.map(r => r.npsn));

        const reportedCount = uniqueReportEntries.size;

        // Target Logic
        const targetCount = isYearly ? (totalSchoolsCount * 12) : totalSchoolsCount;

        const unreportedCount = Math.max(0, targetCount - reportedCount);

        // Use default Math.round, but if result is 0 and we have reports, show decimal
        let complianceRate = 0;
        if (targetCount > 0) {
            const rawRate = (reportedCount / targetCount) * 100;
            // If rate is very small (>0 but <1), keep 1 decimal. Otherwise round.
            complianceRate = (rawRate > 0 && rawRate < 1) ? parseFloat(rawRate.toFixed(1)) : Math.round(rawRate);
        }

        setStats({
            totalSchools: totalSchoolsCount,
            sudahLapor: reportedCount,
            belumLapor: unreportedCount,
            capaian: complianceRate
        });

        // 3. Calculate Leaderboard (Per Kecamatan)
        const newLeaderboard = KECAMATAN_LIST.map(kec => {
            const schoolsInKec = schools.filter(s => s.kecamatan === kec);
            const totalSchoolsInKec = schoolsInKec.length;

            // Reports just for this kecamatan
            const districtReports = filteredReports.filter(r => schoolsInKec.some(s => s.npsn === r.npsn));

            // District Count Logic
            const districtUniqueEntries = isYearly
                ? new Set(districtReports.map(r => `${r.npsn}-${r.month}`))
                : new Set(districtReports.map(r => r.npsn));

            const districtReportedCount = districtUniqueEntries.size;

            // District Target Logic
            const districtTarget = isYearly ? (totalSchoolsInKec * 12) : totalSchoolsInKec;

            let percent = 0;
            if (districtTarget > 0) {
                const rawPercent = (districtReportedCount / districtTarget) * 100;
                percent = (rawPercent > 0 && rawPercent < 1) ? parseFloat(rawPercent.toFixed(1)) : Math.round(rawPercent);
            }

            // Speed Tie-Breaker: Find latest submission time if 100%
            let latestTime = 0;
            if (percent === 100) {
                // Use r.date as fallback
                const dates = districtReports.map(r => new Date(r.date).getTime());
                latestTime = Math.max(...dates, 0);
            }

            return {
                kec,
                percent,
                totalSchools: totalSchoolsInKec,
                reports: districtReportedCount,
                target: districtTarget, // Pass target for display
                latestTime,
                isChampion: percent === 100
            };
        }).sort((a, b) => {
            // Priority 1: Percentage Descending
            if (b.percent !== a.percent) return b.percent - a.percent;
            // Priority 2: Speed Ascending (Earlier is better) for 100% completion
            if (a.percent === 100 && b.percent === 100) return a.latestTime - b.latestTime;
            // Priority 3: Name Ascending
            return a.kec.localeCompare(b.kec);
        });

        setLeaderboard(newLeaderboard);

    }, [reports, schools, selectedMonth, selectedYear, loadingData]);


    // Loading View
    if (isLoading || (loadingData && !reports.length)) {
        return (
            <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center overflow-hidden">
                <div className="relative flex flex-col items-center">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-full blur-3xl opacity-20 animate-pulse w-40 h-40"></div>
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-blue-200 animate-in zoom-in duration-500 p-4">
                                <img src="/logo.png" alt="Logo Si-PANDU" className="w-full h-full object-contain animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-both delay-150">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">Si-PANDU SD</h2>
                            <p className="text-slate-400 text-sm font-medium tracking-wide">Memuat Data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Dynamic Year Options
    const availableYears = Array.from(new Set(reports.map(r => r.year))).sort().reverse();
    const yearOptions = availableYears.length > 0 ? availableYears : [currentYear];
    if (!yearOptions.includes(currentYear)) yearOptions.unshift(currentYear); // Ensure current year is always an option
    const uniqueYearOptions = Array.from(new Set(yearOptions));


    return (
        <div className="min-h-screen flex flex-col">
            <Header onLoginClick={() => setShowLogin(true)} />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative bg-gradient-to-br from-blue-700 to-teal-600 text-white py-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 animate-in fade-in zoom-in duration-1000">
                            Si-PANDU SD
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto font-light animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-300 fill-mode-both">
                            Sistem Pelaporan & Arsip Digital Unggulan Sekolah Dasar Bidang Pembinaan SD - Disdikbud Tabalong
                        </p>
                    </div>
                </section>

                {/* Dashboard Stats */}
                <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-20 pb-16">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border border-blue-100 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500 fill-mode-both">
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
                                    <option value="">Semua Bulan</option>
                                    {MONTHS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
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
                                    {uniqueYearOptions.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <ChevronLeft className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg] pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-slate-500 animate-in zoom-in fade-in duration-500 delay-700 fill-mode-both hover:scale-105 transition-transform cursor-default">
                            <div className="p-3 rounded-full bg-slate-100 text-slate-600">
                                <Building2 size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Sekolah</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.totalSchools}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-teal-500 animate-in zoom-in fade-in duration-500 delay-[800ms] fill-mode-both hover:scale-105 transition-transform cursor-default">
                            <div className="p-3 rounded-full bg-teal-100 text-teal-600">
                                <FileCheck size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Sudah Lapor</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.sudahLapor}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-rose-500 animate-in zoom-in fade-in duration-500 delay-[900ms] fill-mode-both hover:scale-105 transition-transform cursor-default">
                            <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Belum Lapor</p>
                                <p className="text-3xl font-bold text-slate-800">{stats.belumLapor}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 shadow-lg border-b-4 border-indigo-500 animate-in zoom-in fade-in duration-500 delay-[1000ms] fill-mode-both hover:scale-105 transition-transform cursor-default">
                            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                                <PieChart size={32} />
                            </div>
                            <div className="flex-1">
                                <p className="text-slate-500 text-sm font-medium mb-1">Capaian</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-indigo-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.capaian}%` }}></div>
                                    </div>
                                    <span className="text-lg font-bold text-indigo-700">{stats.capaian}%</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Progress per Kecamatan */}
                    <div className="mt-16 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-1000 fill-mode-both">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Users size={24} className="text-blue-600" />
                                Leaderboard Kecamatan - {selectedMonth ? `Bulan ${selectedMonth}` : `Tahun ${selectedYear}`}
                            </h3>
                            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 animate-bounce">
                                <Sparkles size={16} /> 100% = Tuntas
                            </div>
                        </div>

                        {stats.sudahLapor === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
                                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                    <FileCheck size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Belum Ada Laporan</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-1">
                                    Belum ada sekolah yang mengirimkan laporan untuk periode {selectedMonth ? `${selectedMonth} ${selectedYear}` : `Tahun ${selectedYear}`}.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {leaderboard.map((item, index) => (
                                    <Card
                                        key={item.kec}
                                        style={{ animationDelay: `${1100 + (index * 100)}ms` }}
                                        className={`p-4 transition-all duration-300 relative overflow-hidden group hover:scale-105 hover:-translate-y-2 cursor-pointer animate-in fade-in slide-in-from-bottom-4 fill-mode-both ${item.isChampion
                                            ? "border-2 border-amber-400 shadow-amber-100 shadow-lg bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-100 ring-offset-2"
                                            : "hover:shadow-xl border border-slate-100 bg-white"
                                            }`}
                                        onClick={() => {
                                            // Identify Reported Schools
                                            const schoolsInKec = schools.filter(s => s.kecamatan === item.kec);
                                            const filteredReportsInKec = reports.filter(r =>
                                                r.year === selectedYear &&
                                                (selectedMonth ? r.month === selectedMonth : true) &&
                                                schoolsInKec.some(s => s.npsn === r.npsn)
                                            );

                                            const reportedNpsns = new Set(filteredReportsInKec.map(r => r.npsn));
                                            const unreported = schoolsInKec.filter(s => !reportedNpsns.has(s.npsn));

                                            setSelectedDistrictData({
                                                kec: item.kec,
                                                unreportedSchools: unreported,
                                                totalSchools: item.totalSchools,
                                                reported: item.reports
                                            });
                                        }}
                                    >
                                        {item.isChampion && (
                                            <div className="absolute -right-4 -top-4 bg-amber-400 w-16 h-16 rounded-full flex items-end justify-start p-2 transform rotate-12 shadow-sm animate-pulse">
                                                <Crown className="text-white w-6 h-6 mb-1 ml-1" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block ${index < 3 && item.percent > 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.percent > 0 ? `Rank #${index + 1}` : '-'}
                                                </span>
                                                <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.kec.replace('Kec. ', '')}</h4>
                                            </div>
                                            <span className={`text-lg font-bold ${item.isChampion ? 'text-amber-500' : 'text-blue-600'}`}>
                                                {item.percent}%
                                            </span>
                                        </div>

                                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-1000 ease-out ${item.isChampion ? "bg-amber-400" : "bg-blue-500"
                                                    }`}
                                                style={{ width: `${item.percent}%` }}
                                            ></div>
                                        </div>

                                        <p className="text-xs text-slate-400 flex justify-between">
                                            <span>{item.reports}/{item.target} Laporan</span>
                                            {item.isChampion ? <span className="text-amber-500 font-semibold flex items-center gap-1"><Trophy size={10} /> Tuntas</span> : <span className="text-blue-500 text-[10px] underline group-hover:text-blue-600">Lihat Detail</span>}
                                        </p>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

                {/* District Detail Modal */}
                {selectedDistrictData && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedDistrictData(null)}>
                        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{selectedDistrictData.kec}</h3>
                                    <p className="text-xs text-slate-500">
                                        {selectedDistrictData.reported} dari {selectedDistrictData.totalSchools} Sekolah Sudah Melapor
                                    </p>
                                </div>
                                <button onClick={() => setSelectedDistrictData(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <AlertCircle className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                                {selectedDistrictData.unreportedSchools.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                            <Trophy size={32} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-800">Luar Biasa!</h4>
                                        <p className="text-slate-500">Semua sekolah di kecamatan ini sudah melapor.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="bg-rose-50 p-3 text-xs text-rose-700 font-medium flex items-center justify-center gap-2">
                                            <AlertCircle size={14} />
                                            Menampilkan {selectedDistrictData.unreportedSchools.length} Sekolah yang BELUM Lapor
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {selectedDistrictData.unreportedSchools.map((s, i) => (
                                                <div key={s.npsn} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm">{s.name}</h4>
                                                        <p className="text-xs text-slate-400">NPSN: {s.npsn}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <Button onClick={() => setSelectedDistrictData(null)} variant="outline" size="sm">
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
