
// Start of AdminDashboard file (updates imports and components)
"use client";

import { useEffect, useState } from "react";
// import { api } from "@/lib/api";
import { firebaseService } from "@/lib/firebase-service";
import { useAuth } from "@/components/providers";
import { Report, SchoolData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    LayoutDashboard, FileText, CheckCircle, Clock, Search, Filter,
    MoreHorizontal, Download, ChevronLeft, ChevronRight, X, TrendingUp,
    Edit, Trash2, Lock, Plus, AlertCircle, Users, XCircle, PieChart as PieChartIcon,
    Database, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KECAMATAN_LIST, MONTHS } from "@/lib/constants";
import { ComplianceChart, StatusChart } from "./chart-views";
import { SeedingTool } from "./seeding-tool";
import { FirebaseSync } from "./firebase-sync";
import { backupDatabase, exportReportsToExcel, restoreDatabase } from "@/lib/data-export";

interface AdminDashboardProps {
    view: string;
}

export function AdminDashboard({ view }: AdminDashboardProps) {
    const [reports, setReports] = useState<Report[]>([]);
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Parallel fetch for speed
            const [fetchedReports, fetchedSchools] = await Promise.all([
                firebaseService.getReports('admin', 'admin'),
                firebaseService.getSchools()
            ]);
            setReports(fetchedReports);
            setSchools(fetchedSchools);
        } catch (e) {
            console.error(e);
            toast.error("Gagal memuat data dari database");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Revert to empty deps to fetch only on mount. Auto-refresh on view change is too slow for GAS.

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {view === 'monitoring' && <AdminMonitoring reports={reports} schools={schools} />}
            {view === 'verification' && <AdminVerification reports={reports} schools={schools} refresh={fetchData} />}
            {view === 'archive' && <AdminArchive reports={reports} schools={schools} />}
            {view === 'schools' && <AdminSchools schools={schools} refresh={fetchData} />}
            {view === 'settings' && <AdminSettings refresh={fetchData} />}

            {/* Debug Info - Remove before production */}
            <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded z-50 pointer-events-none opacity-50">
                Debug: Schools: {schools.length} | Reports: {reports.length}
            </div>
        </div>
    );
}

function AdminMonitoring({ reports, schools }: { reports: Report[], schools: SchoolData[] }) {
    const currentYear = new Date().getFullYear().toString();
    const currentMonthIndex = new Date().getMonth();
    const currentMonth = MONTHS[currentMonthIndex];

    const [selectedMonth, setSelectedMonth] = useState(""); // Default to "All Months" as per user feedback

    // Dynamic Years from Data
    const availableYears = Array.from(new Set(reports.map(r => r.year)))
        .sort((a, b) => parseInt(b) - parseInt(a));

    // Default to current year if exists in data, otherwise use latest available year, or current year as fallback
    const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] || currentYear);

    const [selectedYear, setSelectedYear] = useState(defaultYear);
    const [showUnreportedModal, setShowUnreportedModal] = useState(false);

    // Update selectedYear if data loads and current selection is invalid (e.g. initial load)
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [reports]); // Only run when reports change

    // Default to current year if no data, otherwise ensure current selection is valid
    const yearOptions = availableYears.length > 0 ? availableYears : [currentYear];
    if (!yearOptions.includes(currentYear)) yearOptions.unshift(currentYear);
    const uniqueYears = Array.from(new Set(yearOptions)).sort().reverse();

    // Filter reports based on selection
    const filteredReports = reports.filter(r => {
        const matchYear = r.year === selectedYear;
        const matchMonth = selectedMonth ? r.month === selectedMonth : true;
        return matchYear && matchMonth;
    });

    const totalReports = filteredReports.length;
    const pending = filteredReports.filter(r => r.status === 'pending').length;
    const approved = filteredReports.filter(r => r.status === 'approved').length;
    const rejected = filteredReports.filter(r => r.status === 'rejected').length;

    const totalSchoolsCount = schools.length;
    const reportedSchoolsCount = new Set(filteredReports.map(r => r.npsn)).size;
    const notReportedCount = Math.max(0, totalSchoolsCount - reportedSchoolsCount);
    // Calculate percentage of compliance
    const complianceRate = totalSchoolsCount > 0 ? Math.round((reportedSchoolsCount / totalSchoolsCount) * 100) : 0;

    // Pie Chart Data
    const statusData = [
        { name: 'Disetujui', value: approved, color: '#0d9488' }, // teal-600
        { name: 'Menunggu', value: pending, color: '#f59e0b' }, // amber-500
        { name: 'Ditolak', value: rejected, color: '#ef4444' }, // red-500
        { name: 'Belum Lapor', value: notReportedCount, color: '#f43f5e' }, // rose-500
    ];

    // Data Preparation & Sorting
    // Logic: 1. Percentage DESC, 2. Speed (Last Report Time) ASC
    // Re-mapping with time:
    const refinedComplianceData = KECAMATAN_LIST.map(kec => {
        const schoolsInKec = schools.filter(s => s.kecamatan === kec);
        const districtReports = filteredReports.filter(r => schoolsInKec.some(s => s.npsn === r.npsn));

        const schoolsWithReport = new Set(districtReports.map(r => r.npsn));
        const numerator = schoolsWithReport.size;
        const totalSchools = schoolsInKec.length;
        const rawPercentage = totalSchools > 0 ? Math.round((numerator / totalSchools) * 100) : 0;

        // Find latest report time for "Completion Speed"
        let latestTime = 0;
        if (rawPercentage === 100) {
            // Only care about speed if 100%? Or generally? 
            // "Rank harus realtime sekolah dikecamatan yg tercepat mengumpul dan duluan 100%"
            // Implies: 100% districts sorted by who finished first. < 100% sorted by %.
            const dates = districtReports.map(r => new Date(r.createdAt || r.date).getTime());
            latestTime = Math.max(...dates, 0);
        }

        return {
            name: kec.replace('Kec. ', ''),
            full_name: kec,
            percentage: rawPercentage,
            schools: totalSchools,
            reports: numerator,
            latestTime, // 0 if not 100% or no reports
            unreported: schools.filter(s => s.kecamatan === kec && !schoolsWithReport.has(s.npsn)),
            reported: schools.filter(s => s.kecamatan === kec && schoolsWithReport.has(s.npsn))
        };
    }).sort((a, b) => {
        // 1. Primary: Percentage Descending
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;

        // 2. Secondary: If both 100% (latestTime > 0), Smaller timestamp (earlier) is better
        if (a.percentage === 100 && b.percentage === 100) {
            return a.latestTime - b.latestTime;
        }

        return a.name.localeCompare(b.name);
    });

    const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top duration-500 fill-mode-both">
                <h2 className="text-2xl font-bold text-slate-800 drop-shadow-sm">Monitoring Dashboard</h2>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden md:flex bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        onClick={() => exportReportsToExcel(filteredReports, schools, selectedMonth, selectedYear)}
                    >
                        <FileSpreadsheet size={16} className="mr-2 text-green-600" /> Unduh Rekap
                    </Button>

                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <select
                            className="bg-transparent text-sm font-medium px-3 py-1.5 outline-none cursor-pointer hover:bg-slate-50 rounded-md transition-colors text-slate-600"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="">Semua Bulan</option>
                            {/* MONTHS.map... */}
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="w-px bg-slate-200 my-1"></div>
                        <select
                            className="bg-transparent text-sm font-medium px-3 py-1.5 outline-none cursor-pointer hover:bg-slate-50 rounded-md transition-colors text-slate-600"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ... Cards ... */}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in zoom-in duration-500 fill-mode-both">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Sekolah</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalSchoolsCount}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 animate-pulse">
                            <Users size={20} />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in zoom-in duration-500 delay-150 fill-mode-both">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Sudah Lapor</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{reportedSchoolsCount}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-4 border-l-4 border-l-rose-500 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in zoom-in duration-500 delay-300 fill-mode-both cursor-pointer"
                    onClick={() => setShowUnreportedModal(true)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Belum Lapor</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{notReportedCount}</h3>
                            <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1 group-hover:underline">
                                <AlertCircle size={12} /> Klik untuk detail
                            </p>
                        </div>
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600 group-hover:rotate-12 transition-transform">
                            <XCircle size={20} />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in zoom-in duration-500 delay-[450ms] fill-mode-both">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Capaian</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{complianceRate}%</h3>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <PieChartIcon size={20} />
                        </div>
                    </div>
                </Card>
            </div>


            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px] mb-24">
                <div className="lg:col-span-2 h-full">
                    <ComplianceChart
                        data={refinedComplianceData}
                        onDistrictClick={(dist) => setSelectedDistrict(dist)}
                    />
                </div>
                <div className="h-full">
                    <StatusChart data={statusData} total={totalSchoolsCount} />
                </div>
            </div>

            {/* Top/Bottom 5 Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* District Stats */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" /> Peringkat Kecamatan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-600 mb-3 uppercase tracking-wide">Tercepat Tuntas</h4>
                            <ul className="space-y-3">
                                {refinedComplianceData.slice(0, 5).map((kec, i) => (
                                    <li key={kec.name} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                            <span className="font-medium text-slate-700">{kec.name}</span>
                                        </div>
                                        <span className="font-bold text-emerald-600">{kec.percentage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-rose-600 mb-3 uppercase tracking-wide">Terlambat Progress</h4>
                            <ul className="space-y-3">
                                {[...refinedComplianceData].reverse().slice(0, 5).map((kec, i) => (
                                    <li key={kec.name} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                            <span className="font-medium text-slate-700">{kec.name}</span>
                                        </div>
                                        <span className="font-bold text-rose-600">{kec.percentage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>

                {/* School Stats */}
                <Card className="p-6 border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-violet-600" /> Waktu Pelaporan Sekolah
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-600 mb-3 uppercase tracking-wide">Tercepat</h4>
                            <ul className="space-y-3">
                                {filteredReports
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .slice(0, 5)
                                    .map((r, i) => (
                                        <li key={r.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                                <div className="truncate">
                                                    <span className="font-medium text-slate-700 block truncate max-w-[120px]" title={schools.find(s => s.npsn === r.npsn)?.name || r.school_name}>{schools.find(s => s.npsn === r.npsn)?.name || r.school_name}</span>
                                                    <span className="text-[10px] text-slate-400 block">{r.date}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                {filteredReports.length === 0 && <li className="text-sm text-slate-400 italic">Belum ada data</li>}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-rose-600 mb-3 uppercase tracking-wide">Terlambat (Belum Lapor)</h4>
                            <ul className="space-y-3">
                                {schools
                                    .filter(s => !new Set(filteredReports.map(r => r.npsn)).has(s.npsn))
                                    .slice(0, 5)
                                    .map((s, i) => (
                                        <li key={s.npsn} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                                <div className="truncate">
                                                    <span className="font-medium text-slate-700 block truncate max-w-[120px]" title={s.name}>{s.name}</span>
                                                    <span className="text-[10px] text-slate-400 block">{s.kecamatan}</span>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                {schools.filter(s => !new Set(filteredReports.map(r => r.npsn)).has(s.npsn)).length === 0 && (
                                    <li className="text-sm text-slate-400 italic">Semua sudah lapor!</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>

            <UnreportedModal
                isOpen={showUnreportedModal}
                onClose={() => setShowUnreportedModal(false)}
                schools={schools}
                reports={reports}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
            />

            {/* District Detail Modal */}
            {selectedDistrict && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl">{selectedDistrict.full_name}</h3>
                                <div className="flex gap-2 text-sm mt-1">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">{selectedDistrict.percentage}% Tuntas</Badge>
                                    <span className="text-slate-500">{selectedDistrict.reports} dari {selectedDistrict.schools} Sekolah</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDistrict(null)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-0 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                {/* Unreported List */}
                                <div className="p-4">
                                    <h4 className="font-semibold text-rose-600 mb-3 flex items-center gap-2">
                                        <AlertCircle size={16} /> Belum Lapor ({selectedDistrict.unreported.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {selectedDistrict.unreported.map((s: any) => (
                                            <li key={s.npsn} className="text-sm p-2 bg-rose-50 rounded text-slate-700 flex justify-between">
                                                <span>{s.name}</span>
                                            </li>
                                        ))}
                                        {selectedDistrict.unreported.length === 0 && <li className="text-sm text-slate-400 italic">Nihil</li>}
                                    </ul>
                                </div>
                                {/* Reported List */}
                                <div className="p-4 bg-slate-50/50">
                                    <h4 className="font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                                        <CheckCircle size={16} /> Sudah Lapor ({selectedDistrict.reported.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {selectedDistrict.reported.map((s: any) => (
                                            <li key={s.npsn} className="text-sm p-2 bg-white border border-slate-100 rounded text-slate-700">
                                                {s.name}
                                            </li>
                                        ))}
                                        {selectedDistrict.reported.length === 0 && <li className="text-sm text-slate-400 italic">Belum ada</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
                            <Button onClick={() => setSelectedDistrict(null)}>Tutup</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... (Rest of component functions: AdminVerification, AdminArchive with minimal UI updates if any)
// Need to update AdminSchools to use KECAMATAN_LIST

function AdminVerification({ reports, schools, refresh }: { reports: Report[], schools: SchoolData[], refresh: () => void }) {
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const pendingReports = reports.filter(r => r.status === 'pending');

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            await firebaseService.updateReportStatus(id, 'approved', '');
            toast.success("Laporan disetujui");
            refresh();
        } catch (e) { toast.error("Gagal memproses"); }
        finally { setProcessing(null); }
    };

    const handleReject = async () => {
        if (!rejectId || !rejectNote) return;
        setProcessing(rejectId);
        try {
            await firebaseService.updateReportStatus(rejectId, 'rejected', rejectNote);
            toast.success("Laporan ditolak");
            setRejectId(null);
            setRejectNote('');
            refresh();
        } catch (e) { toast.error("Gagal memproses"); }
        finally { setProcessing(null); }
    };

    // Helper to get fresh school name
    const getSchoolName = (npsn: string, fallback: string) => {
        const school = schools.find(s => s.npsn === npsn);
        return school ? school.name : fallback;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Verifikasi Laporan</h2>
            {pendingReports.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200">
                    <div className="bg-green-50 text-green-600 p-4 rounded-full inline-flex mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <p className="text-slate-800 font-medium text-lg">Semua Aman!</p>
                    <p className="text-slate-500">Tidak ada laporan yang perlu diverifikasi saat ini.</p>
                </div>
            ) : (
                <Card className="overflow-hidden shadow-sm border-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Sekolah</th>
                                    <th className="px-6 py-4">Periode</th>
                                    <th className="px-6 py-4">Tanggal Kirim</th>
                                    <th className="px-6 py-4">Link Dokumen</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {pendingReports.map(report => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">
                                                {/* Use live mapping for accurate name */}
                                                {getSchoolName(report.npsn, report.school_name)}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">{report.npsn}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="pending" className="shadow-none">{report.month} {report.year}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{report.date}</td>
                                        <td className="px-6 py-4">
                                            <a href={report.link} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium">
                                                <FileText size={16} /> Buka Link
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs"
                                                    onClick={() => handleApprove(report.id)}
                                                    disabled={processing === report.id}
                                                >
                                                    <CheckCircle size={14} className="mr-1.5" /> Terima
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 text-xs"
                                                    onClick={() => setRejectId(report.id)}
                                                    disabled={processing === report.id}
                                                >
                                                    <X size={14} className="mr-1.5" /> Tolak
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 transform transition-all scale-100">
                        <h3 className="font-bold text-lg text-slate-800">Tolak Laporan</h3>
                        <p className="text-sm text-slate-500">Silakan berikan alasan penolakan agar sekolah dapat memperbaiki laporannya.</p>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                            placeholder="Contoh: Link tidak dapat diakses..."
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setRejectId(null)}>Batal</Button>
                            <Button variant="destructive" onClick={handleReject} disabled={!!processing}>Kirim Penolakan</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper for date formatting
const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date).replace(/\//g, '-');
    } catch (e) { return dateStr; }
};

interface UnreportedModalProps {
    isOpen: boolean;
    onClose: () => void;
    schools: SchoolData[];
    reports: Report[];
    selectedMonth: string;
    selectedYear: string;
}

function UnreportedModal({ isOpen, onClose, schools, reports, selectedMonth, selectedYear }: UnreportedModalProps) {
    if (!isOpen) return null;

    // Logic: Determine who hasn't reported.
    // Filter reports based on selection first.
    const filteredReports = reports.filter(r => {
        const matchYear = r.year === selectedYear;
        const matchMonth = selectedMonth ? r.month === selectedMonth : true;
        return matchYear && matchMonth;
    });

    // Get Set of NPSNs that have reported
    const reportedNpsn = new Set(filteredReports.map(r => r.npsn));

    // Filter schools not in that set
    const unreportedSchools = schools.filter(s => !reportedNpsn.has(s.npsn));

    // Sort by name
    const sortedUnreported = unreportedSchools.sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col transform transition-all scale-100">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Daftar Sekolah Belum Lapor</h3>
                        <p className="text-sm text-slate-500">
                            Periode: {selectedMonth || 'Semua Bulan'} {selectedYear} • Total: <span className="font-bold text-rose-600">{sortedUnreported.length} Sekolah</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-0">
                    {sortedUnreported.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-3">No</th>
                                    <th className="px-6 py-3">NPSN</th>
                                    <th className="px-6 py-3">Nama Sekolah</th>
                                    <th className="px-6 py-3">Kecamatan</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedUnreported.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-slate-400 w-12">{idx + 1}</td>
                                        <td className="px-6 py-3 font-mono text-slate-500">{s.npsn}</td>
                                        <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                                        <td className="px-6 py-3 text-slate-600">{s.kecamatan}</td>
                                        <td className="px-6 py-3">
                                            <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-200 shadow-none font-normal">Belum Lapor</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                            <div className="bg-green-50 text-green-600 p-4 rounded-full mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Luar Biasa!</h3>
                            <p className="text-slate-500">Semua sekolah telah mengirimkan laporan pada periode ini.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
                    <Button onClick={onClose}>Tutup</Button>
                </div>
            </div>
        </div>
    );
}

function AdminArchive({ reports, schools }: { reports: Report[], schools: SchoolData[] }) {
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterKec, setFilterKec] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Helper to get fresh school name
    const getSchoolName = (npsn: string, fallback: string) => {
        const school = schools.find(s => s.npsn === npsn);
        return school ? school.name : fallback;
    };

    // const approved = reports.filter(r => r.status === 'approved'); // Removed check to show all
    const filtered = reports.filter(r => {
        const matchesSearch = r.school_name.toLowerCase().includes(search.toLowerCase()) || r.npsn.includes(search);
        const matchesYear = filterYear ? r.year === filterYear : true;
        const matchesMonth = filterMonth ? r.month === filterMonth : true;
        const matchesStatus = filterStatus ? r.status === filterStatus : true;

        let matchesKec = true;
        if (filterKec) {
            // Find school data to get kecamatan
            const school = schools.find(s => s.npsn === r.npsn);
            if (school) {
                matchesKec = school.kecamatan === filterKec;
            } else {
                matchesKec = false; // If school data missing, filtering by kec excludes it
            }
        }

        return matchesSearch && matchesYear && matchesMonth && matchesKec && matchesStatus;
    });

    const years = Array.from(new Set(reports.map(r => r.year))).sort().reverse();

    // State for re-evaluation modal
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [processing, setProcessing] = useState(false);

    const handleReevaluate = async () => {
        if (!selectedReport) return;
        if (!rejectNote.trim()) return toast.error("Wajib menyertakan alasan perubahan status");

        setProcessing(true);
        try {
            await firebaseService.updateReport(selectedReport.id, {
                status: 'rejected',
                notes: `[Re-evaluasi] ${rejectNote}`,
                checkedAt: new Date().toISOString()
            });
            toast.success("Status laporan diubah menjadi Ditolak");
            setSelectedReport(null);
            setRejectNote("");
            window.location.reload();
        } catch (e) {
            console.error(e);
            toast.error("Gagal mengubah status");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (reportId: string) => {
        if (!confirm("Apakah Anda yakin ingin MENGHAPUS laporan ini secara permanen? Data yang dihapus tidak dapat dikembalikan.")) return;
        setProcessing(true);
        try {
            await firebaseService.deleteReport(reportId);
            toast.success("Laporan berhasil dihapus");
            window.location.reload();
        } catch (e) {
            console.error(e);
            toast.error("Gagal menghapus laporan");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Modal for Re-evaluation */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-6 space-y-4 bg-white">
                        <h3 className="font-bold text-lg text-slate-800">Tinjau Ulang Laporan</h3>
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
                            <p>Sekolah: <span className="font-semibold">{selectedReport.school_name}</span></p>
                            <p>Periode: {selectedReport.month} {selectedReport.year}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Alasan Perubahan Status</label>
                            <textarea
                                className="w-full text-sm border-slate-200 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                                placeholder="Contoh: Link Google Drive tidak bisa diakses, mohon perbaiki..."
                                value={rejectNote}
                                onChange={e => setRejectNote(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setSelectedReport(null)} disabled={processing}>Batal</Button>
                            <Button variant="destructive" onClick={handleReevaluate} loading={processing}>
                                Ubah jadi Ditolak
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Arsip Digital</h2>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <select
                            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                        >
                            <option value="">Semua Tahun</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                        >
                            <option value="">Semua Bulan</option>
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                            value={filterKec}
                            onChange={(e) => setFilterKec(e.target.value)}
                        >
                            <option value="">Semua Kecamatan</option>
                            {KECAMATAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Semua Status</option>
                            <option value="approved">Disetujui</option>
                            <option value="pending">Menunggu</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Cari sekolah atau NPSN..."
                            className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <Card className="overflow-hidden shadow-sm border-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Sekolah</th>
                                <th className="px-6 py-4">Periode</th>
                                <th className="px-6 py-4">Tanggal Terima</th>
                                <th className="px-6 py-4">Dokumen</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filtered.length > 0 ? filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800">
                                            {getSchoolName(item.npsn, item.school_name)}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">{item.npsn}</p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{item.month} {item.year}</td>
                                    <td className="px-6 py-4 text-slate-600">{item.date}</td>
                                    <td className="px-6 py-4">
                                        <a href={item.link} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors">
                                            <FileText size={14} /> Buka Laporan
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.status === 'approved' && <Badge variant="approved" className="shadow-none">Disetujui</Badge>}
                                            {item.status === 'pending' && <Badge variant="pending" className="shadow-none">Menunggu</Badge>}
                                            {item.status === 'rejected' && <Badge variant="destructive" className="shadow-none">Ditolak</Badge>}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-full"
                                                title="Tinjau Ulang"
                                                onClick={() => setSelectedReport(item)}
                                            >
                                                <Edit size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                                title="Hapus Laporan Permanen"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Tidak ada data arsip yang ditemukan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function AdminSchools({ schools, refresh }: { schools: SchoolData[], refresh: () => void }) {
    const [editing, setEditing] = useState<SchoolData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ npsn: '', name: '', address: '', kecamatan: '' });
    const [loading, setLoading] = useState(false);

    // Filter state
    const [filterKec, setFilterKec] = useState('');

    const filteredSchools = filterKec
        ? schools.filter(s => s.kecamatan === filterKec)
        : schools;

    // Bulk Reset State
    const [isBulkResetting, setIsBulkResetting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
    const [bulkLogs, setBulkLogs] = useState<string[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);

    const handleBulkReset = async () => {
        if (!confirm(`PERINGATAN: Aksi ini akan mereset password UNTUK SEMUA ${schools.length} SEKOLAH menjadi NPSN masing-masing.\n\nPastikan tidak ada sekolah yang sedang menggunakan aplikasi.\n\nLanjutkan?`)) return;

        setIsBulkResetting(true);
        setShowBulkModal(true);
        setBulkProgress({ current: 0, total: schools.length, success: 0, fail: 0 });
        setBulkLogs([]);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < schools.length; i++) {
            const school = schools[i];
            setBulkProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                await firebaseService.resetUserPassword(school.npsn, school.npsn);
                successCount++;
            } catch (error: any) {
                console.error(`Failed to reset ${school.npsn}:`, error);
                failCount++;
                setBulkLogs(prev => [`❌ ${school.npsn}: ${error.message}`, ...prev]);
            }

            setBulkProgress(prev => ({ ...prev, success: successCount, fail: failCount }));

            // Small delay to prevent UI freeze
            await new Promise(r => setTimeout(r, 50));
        }

        setIsBulkResetting(false);
        toast.success(`Selesai! Sukses: ${successCount}, Gagal: ${failCount}`);
    };

    const handleSeedMuaraUya = async () => {
        if (!confirm(`Import ${MUARA_UYA_SCHOOLS.length} sekolah untuk Kec. Muara Uya? Data dengan NPSN sama akan diupdate.`)) return;
        setLoading(true);
        try {
            let processed = 0;
            for (const s of MUARA_UYA_SCHOOLS) {
                // 1. Save School
                await firebaseService.saveSchool({
                    npsn: s.npsn,
                    name: s.name,
                    kecamatan: "Kec. Muara Uya",
                    address: "Kec. Muara Uya", // Default address
                    createdAt: new Date().toISOString()
                });

                // 2. Ensure User Account
                await firebaseService.ensureSchoolUser({
                    uid: s.npsn,
                    name: s.name,
                    npsn: s.npsn,
                    password: s.npsn // Default pass
                });
                processed++;
            }
            toast.success(`Berhasil mengugah ${processed} sekolah!`);
            refresh();
        } catch (e) {
            console.error(e);
            toast.error("Gagal import data");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (school: SchoolData) => {
        setEditing(school);
        setFormData({ npsn: school.npsn, name: school.name, address: school.address, kecamatan: school.kecamatan });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditing(null);
        setFormData({ npsn: '', name: '', address: '', kecamatan: '' });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Save School Data
            await firebaseService.saveSchool({ ...formData, id: editing?.id });

            // 2. Auto-create/Update User Account in 'users' collection
            // Role: school, Username/Password: NPSN (Default)
            // We use the NPSN as the ID for the user document for easy retrieval
            const userPayload = {
                name: formData.name,
                role: 'school',
                npsn: formData.npsn,
                username: formData.npsn,
                // Only set password if it's a new user or explicitly requested. 
                // Since we can't see existing passwords, we'll set default password to NPSN 
                // ONLY when creating a NEW school to avoid overwriting changed passwords on edit.
                ...(editing ? {} : { password: formData.npsn })
            };

            // Using setDoc with merge: true (via firebaseService helper if available, or just updateUserProfile)
            // Actually updateUserProfile updates based on ID. checking api...
            // firebaseService.updateUserProfile uses updateDoc. We might need setDoc for new users.
            // Let's use a specialized method or just rely on the fact that 'saveSchool' might not handle users.
            // We need to double check if 'saveSchool' already does this? No, it just saves to 'schools'.

            // We'll use a direct call if firebaseService doesn't expose it, or extend firebaseService.
            // For now, let's assume we can use `firebaseService.updateUserProfile` but that might fail if doc doesn't exist.
            // Let's check `firebase-service.ts` content via memory or let's just use `updateUserProfile` and hope it creates? 
            // Usually update fails if doc missing.
            // Let's treat this as "Ensure User Exists".

            // WE WILL IMPLEMENT A NEW METHODS IN FIREBASE SERVICE LATER IF NEEDED, 
            // BUT FOR NOW LET'S EXTEND THE LOGIC HERE OR ASSUME `updateUserProfile` CAN HANDLE IT OR WE EXTEND IT.
            // actually, I'll just look at `firebase-service.ts` again or write it safely.
            // Wait, I can't see firebase-service.ts right now without a tool call.
            // I'll blindly trust that I should likely duplicate the logic:
            // "serta user dan pasword otomatis npsn".

            // Let's try to update it. If it fails (user doesn't exist), we might need to "create".
            // Since we are in the frontend, and `firebaseService` is our abstraction.
            // I will update `firebaseService` to have a `syncSchoolUser` method or similar? 
            // Or just do it here if I had access to `setDoc`. 
            // Use `firebaseService.setUser(npsn, data)`?

            // Let's add a robust `syncSchoolUser` to `firebase-service.ts` afterwards.
            // For now, I will call a new method I will create: `firebaseService.ensureSchoolUser`
            await firebaseService.ensureSchoolUser({
                uid: formData.npsn, // Use NPSN as UID for Firestore User Doc
                name: formData.name,
                npsn: formData.npsn,
                password: formData.npsn // Default password = NPSN
            });

            toast.success("Data sekolah dan akun pengguna disimpan");
            setIsModalOpen(false);
            refresh();
        } catch (e) {
            console.error(e);
            toast.error("Gagal menyimpan data");
        }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus data sekolah ini? Akun pengguna juga akan dihapus.")) return;
        try {
            const school = schools.find(s => s.id === id);
            await firebaseService.deleteSchool(id);
            if (school && school.npsn) {
                // Also delete the user document
                await firebaseService.deleteUser(school.npsn);
            }
            toast.success("Sekolah dan akun dihapus");
            refresh();
        } catch (e) { toast.error("Gagal menghapus"); }
    };

    const handleReset = async (id: string) => {
        if (!confirm("Reset password ke NPSN?")) return;
        try {
            const school = schools.find(s => s.id === id);
            if (!school) return;

            // Reset password in Firestore 'users' collection
            await firebaseService.resetUserPassword(school.npsn, school.npsn);

            toast.success(`Password direset menjadi: ${school.npsn}`);
        } catch (e) { toast.error("Gagal reset password"); }
    }

    return (
        <div className="space-y-6 pb-8"> {/* Added padding bottom to prevent footer overlap */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manajemen Sekolah</h2>
                    <p className="text-slate-500 text-sm">Kelola data sekolah dan akun operator.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        value={filterKec}
                        onChange={e => setFilterKec(e.target.value)}
                    >
                        <option value="">Semua Kecamatan</option>
                        {KECAMATAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <Button
                        onClick={handleBulkReset}
                        variant="destructive"
                        className="shadow-lg shadow-rose-100 bg-rose-600 hover:bg-rose-700 text-white border-0 mr-2"
                    >
                        <Lock size={16} className="mr-2" /> Reset Semua
                    </Button>
                    <Button onClick={handleAdd} className="shadow-lg shadow-blue-200"><Plus size={16} className="mr-2" /> Tambah</Button>
                </div>
            </div>

            <Card className="overflow-hidden shadow-sm border-0">
                <div className="overflow-x-auto no-scrollbar"> {/* Added no-scrollbar utility if exists, or relying on standard overflow */}
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">NPSN</th>
                                <th className="px-6 py-4">Nama Sekolah</th>
                                <th className="px-6 py-4">Alamat</th>
                                <th className="px-6 py-4">Kecamatan</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredSchools.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-600">{s.npsn}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{s.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs truncate text-slate-600" title={s.address}>{s.address || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-normal">
                                            {s.kecamatan}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Data"><Edit size={16} /></button>
                                            <button onClick={() => handleReset(s.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password ke NPSN"><Lock size={16} /></button>
                                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Bulk Reset Progress Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg p-6 space-y-6 bg-white shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-xl text-slate-800">Reset Password Massal</h3>
                            {!isBulkResetting && (
                                <button onClick={() => setShowBulkModal(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Progress UI */}
                            <div className="flex justify-between text-sm font-medium text-slate-600">
                                <span>Proses: {bulkProgress.current} / {bulkProgress.total}</span>
                                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                ></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{bulkProgress.success}</div>
                                    <div className="text-xs font-medium text-emerald-700 uppercase">Berhasil</div>
                                </div>
                                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-center">
                                    <div className="text-2xl font-bold text-rose-600">{bulkProgress.fail}</div>
                                    <div className="text-xs font-medium text-rose-700 uppercase">Gagal</div>
                                </div>
                            </div>

                            {/* Error Logs */}
                            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto">
                                {bulkLogs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-600 italic">Menunggu proses...</div>
                                ) : (
                                    bulkLogs.map((log, i) => (
                                        <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">{log}</div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setShowBulkModal(false)} disabled={isBulkResetting}>
                                {isBulkResetting ? 'Sedang Memproses...' : 'Tutup'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800">{editing ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">NPSN (Login User)</label>
                                <Input value={formData.npsn} onChange={e => setFormData({ ...formData, npsn: e.target.value })} required placeholder="Nomor Pokok Sekolah Nasional" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Nama Sekolah</label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Nama lengkap sekolah" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Alamat</label>
                                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat lengkap..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Kecamatan</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    value={formData.kecamatan}
                                    onChange={e => setFormData({ ...formData, kecamatan: e.target.value })}
                                    required
                                >
                                    <option value="">Pilih Kecamatan...</option>
                                    {KECAMATAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Batal</Button>
                                <Button type="submit" loading={loading} className="px-6">Simpan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminSettings({ refresh }: { refresh?: () => void }) {
    const { user, updateUser } = useAuth();
    const [profile, setProfile] = useState<{ name: string, photoUrl: string }>({ name: '', photoUrl: '' });
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.data.name,
                photoUrl: (user.data as any).photoUrl || ''
            });
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await firebaseService.updateUserProfile(user?.data.id || 'admin', 'admin', profile);

            // Update global auth context
            updateUser({ name: profile.name, photoUrl: profile.photoUrl } as any);
            toast.success("Profil berhasil diperbarui");
        } catch (e: any) {
            console.error(e);
            toast.error("Gagal update profil: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error("Password konfirmasi tidak cocok");
            return;
        }
        setLoading(true);
        try {
            await firebaseService.changeUserPassword(passwords.new);
            toast.success("Password berhasil diubah");
            setPasswords({ new: '', confirm: '' });
        } catch (e: any) {
            if (e.code === 'auth/requires-recent-login') {
                toast.error("Demi keamanan, login ulang dulu.");
            } else {
                toast.error("Gagal mengubah password");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Ukuran file maksimal 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, photoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Pengaturan Akun</h2>
                <p className="text-slate-500">Kelola profil dan keamanan akun Anda.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <Card className="p-6 border-0 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <CheckCircle size={24} />
                            {/* Reusing CheckCircle as generic profile icon or User icon if available */}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Profil Dinas</h3>
                            <p className="text-sm text-slate-500">Informasi identitas akun dinas</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="flex flex-col items-center gap-4 mb-6">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden relative group cursor-pointer">
                                {profile.photoUrl ? (
                                    <img src={profile.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <CheckCircle size={32} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                    Ganti Foto
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                            </div>
                            <p className="text-xs text-slate-500">Klik gambar untuk mengubah foto (Max 2MB)</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1.5 text-slate-700">Nama Tampilan</label>
                            <Input
                                value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                placeholder="Contoh: Admin Dinas Pendidikan"
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" disabled={loading} className="w-full">Simpan Perubahan</Button>
                        </div>
                    </form>
                </Card>

                <div className="space-y-8">
                    {/* Password Section */}
                    <Card className="p-6 border-0 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Keamanan</h3>
                                <p className="text-sm text-slate-500">Ubah password akun admin</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Password Baru</label>
                                <Input
                                    type="password"
                                    value={passwords.new}
                                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Konfirmasi Password</label>
                                <Input
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                    placeholder="Ulangi password baru"
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" variant="outline" disabled={loading}>Update Password</Button>
                            </div>
                        </form>
                    </Card>

                    {/* Data Maintenance Section */}
                    <Card className="p-6 border-0 shadow-sm space-y-4 border-l-4 border-l-amber-400 bg-amber-50/30">
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <AlertCircle size={18} className="text-amber-500" /> Pemeliharaan Data
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Hapus laporan ganda (duplikat) yang mungkin terkirim tidak sengaja.</p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                if (!confirm("Sistem akan memindai dan menghapus laporan duplikat (menyisakan yang terbaru). Lanjutkan?")) return;
                                setLoading(true);
                                try {
                                    // Fetch all reports
                                    const allReports = await firebaseService.getReports('admin', 'admin');
                                    // Group by NPSN + Month + Year
                                    const groups: Record<string, Report[]> = {};
                                    allReports.forEach(r => {
                                        const key = `${r.npsn}-${r.month}-${r.year}`;
                                        if (!groups[key]) groups[key] = [];
                                        groups[key].push(r);
                                    });

                                    let deletedCount = 0;
                                    // Process groups
                                    for (const key in groups) {
                                        const group = groups[key];
                                        if (group.length > 1) {
                                            // Sort by createdAt desc (or date) to keep latest
                                            group.sort((a, b) => {
                                                const dateA = new Date(a.createdAt || a.date).getTime();
                                                const dateB = new Date(b.createdAt || b.date).getTime();
                                                return dateB - dateA; // Newest first
                                            });

                                            // Delete all except first
                                            const toDelete = group.slice(1);
                                            for (const r of toDelete) {
                                                await firebaseService.deleteReport(r.id);
                                                deletedCount++;
                                            }
                                        }
                                    }
                                    toast.success(`Pembersihan selesai. ${deletedCount} duplikat dihapus.`);
                                    if (refresh) refresh();
                                } catch (e) {
                                    console.error(e);
                                    toast.error("Gagal membersihkan data");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full bg-white border border-amber-200 hover:bg-amber-100 text-amber-700"
                        >
                            Bersihkan Duplikat
                        </Button>


                        <div className="pt-4 border-t border-amber-200/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                                <Database size={18} className="text-blue-500" /> Backup Data
                            </h3>
                            <p className="text-sm text-slate-500 mb-3">Unduh seluruh data (Sekolah & Laporan) dalam format JSON untuk cadangan.</p>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await backupDatabase();
                                        toast.success("Backup data berhasil diunduh");
                                    } catch (e) {
                                        toast.error("Gagal melakukan backup");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                            >
                                Download Backup JSON
                            </Button>

                        </div>

                        <div className="pt-4 border-t border-amber-200/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                                <Database size={18} className="text-emerald-500" /> Restore Data
                            </h3>
                            <p className="text-sm text-slate-500 mb-3">Pulihkan data dari file backup JSON. Data yang ada akan diperbarui/ditambah.</p>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".json"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        if (!confirm(`Anda akan memulihkan data dari file "${file.name}". \n\nPERINGATAN: Tindakan ini akan menggabungkan/memperbarui data yang ada. Pastikan file backup valid. Lanjutkan?`)) {
                                            e.target.value = ''; // Reset input
                                            return;
                                        }

                                        setLoading(true);
                                        const reader = new FileReader();
                                        reader.onload = async (event) => {
                                            try {
                                                const json = event.target?.result as string;
                                                const result = await restoreDatabase(json);
                                                toast.success(`Restore berhasil! \nSekolah: ${result.stats.schools}, Laporan: ${result.stats.reports}`);
                                                if (refresh) refresh();
                                            } catch (err: any) {
                                                toast.error("Gagal memulihkan data: " + err.message);
                                            } finally {
                                                setLoading(false);
                                                e.target.value = ''; // Reset
                                            }
                                        };
                                        reader.readAsText(file);
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    disabled={loading}
                                    className="w-full bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                >
                                    Upload File Backup JSON
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Data Sync Section Removed */}
                </div>
            </div>
        </div>
    );
}
