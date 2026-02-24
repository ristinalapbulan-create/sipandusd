"use client";

import { useEffect, useState } from "react";
import { firebaseService } from "@/lib/firebase-service";
import { useAuth } from "@/components/providers";
import { Report, SchoolData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    LayoutDashboard, FileText, CheckCircle, Clock, Search, Filter,
    MoreHorizontal, Download, ChevronLeft, ChevronRight, X, TrendingUp,
    AlertCircle, PieChart as PieChartIcon, FileSpreadsheet, Building2, ShieldCheck, Database, Lock
} from "lucide-react";
import { toast } from "sonner";
import { KECAMATAN_LIST, MONTHS } from "@/lib/constants";
import { exportReportsToExcel } from "@/lib/data-export";

interface KorwilDashboardProps {
    view: string;
}

export function KorwilDashboard({ view }: KorwilDashboardProps) {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [loading, setLoading] = useState(true);

    const kecamatanList = (user?.data as any)?.kecamatan || [];

    const fetchData = async () => {
        if (!user || kecamatanList.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch all schools and reports
            const [allReports, allSchools] = await Promise.all([
                firebaseService.getReports('admin', 'admin'), // fetching all, then filtering locally since getReports API doesn't support 'in' array easily yet
                firebaseService.getSchools()
            ]);

            // Filter schools by Korwil's assigned kecamatan
            const mySchools = allSchools.filter(s => kecamatanList.includes(s.kecamatan));
            const mySchoolNpsns = new Set(mySchools.map(s => s.npsn));

            // Filter reports belonging to Korwil's schools
            const myReports = allReports.filter(r => mySchoolNpsns.has(r.npsn));

            setSchools(mySchools);
            setReports(myReports);
        } catch (e) {
            console.error(e);
            toast.error("Gagal memuat data dari database");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    if (!user) return null;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Memuat data wilayah Anda...</p>
            </div>
        </div>
    );

    if (kecamatanList.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Card className="p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Wilayah Belum Ditentukan</h3>
                    <p className="text-slate-500">Akun Anda belum memiliki akses ke wilayah kecamatan manapun. Silakan hubungi Admin Dinas untuk pengaturan wilayah.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {view === 'monitoring' && <KorwilMonitoring reports={reports} schools={schools} kecamatanList={kecamatanList} />}
            {view === 'archive' && <KorwilArchive reports={reports} schools={schools} kecamatanList={kecamatanList} />}
            {view === 'profile' && <KorwilProfile user={user} kecamatanList={kecamatanList} />}
        </div>
    );
}

function KorwilProfile({ user, kecamatanList }: { user: any, kecamatanList: string[] }) {
    const [profileName, setProfileName] = useState(user?.data?.name || '');
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Password Edit State
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [loadingPassword, setLoadingPassword] = useState(false);

    const handleProfileSubmit = async () => {
        if (!user || profileName.trim() === '') {
            toast.error("Nama tidak boleh kosong");
            return;
        }

        setLoadingProfile(true);
        try {
            await firebaseService.updateUserProfile(user.data.id, 'korwil', { name: profileName });
            toast.success("Profil berhasil diperbarui! Silakan muat ulang halaman untuk melihat perubahan.");
        } catch (error) {
            console.error(error);
            toast.error("Gagal memperbarui profil");
        } finally {
            setLoadingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return toast.error("Password konfirmasi tidak cocok");
        if (passwords.new.length < 6) return toast.error("Password minimal 6 karakter");

        setLoadingPassword(true);
        try {
            await firebaseService.changeUserPassword(passwords.new);
            toast.success("Password berhasil diubah!");
            setPasswords({ new: '', confirm: '' });
        } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
                toast.error("Demi keamanan, Anda harus login ulang sebelum mengubah password.");
            } else {
                console.error(error);
                toast.error("Gagal mengubah password");
            }
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                    <ShieldCheck size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Profil Koordinator Wilayah</h2>
                    <p className="text-sm text-slate-500">Kelola informasi pribadi akun Anda</p>
                </div>
            </div>

            <Card className="p-6 md:p-8 border-0 shadow-lg relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -mr-20 -mt-20"></div>

                <div className="relative z-10 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Nama Lengkap</label>
                            <Input
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Silakan isi nama lengkap Anda..."
                                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Wilayah Binaan</label>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-wrap gap-2 text-sm text-slate-700">
                                {kecamatanList.map((kec: string) => (
                                    <span key={kec} className="bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm font-medium">
                                        {kec}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} /> Wilayah hanya dapat diubah oleh Admin Dinas
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <Button
                            onClick={handleProfileSubmit}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 transition-all font-medium py-2.5 px-6 rounded-lg"
                            disabled={loadingProfile}
                        >
                            {loadingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Keamanan Akun</h2>
                </div>

                <Card className="p-6 md:p-8 border-0 shadow-lg relative overflow-hidden bg-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -mr-10 -mt-10"></div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-5 relative z-10">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1 block">Password Baru</label>
                            <Input
                                type="password"
                                value={passwords.new}
                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                required
                                className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="Minimal 6 karakter"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1 block">Konfirmasi Password Baru</label>
                            <Input
                                type="password"
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                required
                                className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="Ulangi password baru"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <Button
                                type="submit"
                                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-200 font-medium py-2.5 px-6 rounded-lg"
                                disabled={loadingPassword}
                            >
                                {loadingPassword ? 'Memproses...' : 'Ubah Password'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

function KorwilMonitoring({ reports, schools, kecamatanList }: { reports: Report[], schools: SchoolData[], kecamatanList: string[] }) {
    // Current Month Filter
    const today = new Date();
    const currentMonthStr = MONTHS[today.getMonth()];
    const currentYearStr = today.getFullYear().toString();

    // Dynamic Years from Data
    const availableYears = Array.from(new Set(reports.map(r => r.year)))
        .sort((a, b) => parseInt(b) - parseInt(a));
    const defaultYear = availableYears.includes(currentYearStr) ? currentYearStr : (availableYears[0] || currentYearStr);
    const yearOptions = availableYears.length > 0 ? availableYears : [currentYearStr];
    if (!yearOptions.includes(currentYearStr)) yearOptions.unshift(currentYearStr);
    const uniqueYears = Array.from(new Set(yearOptions)).sort().reverse();

    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
    const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
    const [selectedKec, setSelectedKec] = useState<string>('Semua');

    // Filter schools based on selected kecamatan filter within their scope
    const filteredSchools = selectedKec === 'Semua'
        ? schools
        : schools.filter(s => s.kecamatan === selectedKec);

    const filteredSchoolNpsns = new Set(filteredSchools.map(s => s.npsn));

    // Filter relevant reports FOR THESE SCHOOLS
    const activeReports = reports.filter(r => {
        const matchYear = r.year === selectedYear;
        const matchMonth = selectedMonth === 'all' ? true : r.month === selectedMonth;
        return matchYear && matchMonth && filteredSchoolNpsns.has(r.npsn);
    });

    // Calculate Stats
    const totalSchools = filteredSchools.length;
    const reportedSchools = new Set(activeReports.map(r => r.npsn));
    const totalReported = reportedSchools.size;
    const totalUnreported = Math.max(0, totalSchools - totalReported);
    const complianceRate = totalSchools === 0 ? 0 : Math.round((totalReported / totalSchools) * 100);

    const approvedCount = activeReports.filter(r => r.status === 'approved').length;
    const pendingCount = activeReports.filter(r => r.status === 'pending').length;
    const rejectedCount = activeReports.filter(r => r.status === 'rejected').length;

    // Build Unreported List
    const unreportedList = filteredSchools.filter(s => !reportedSchools.has(s.npsn));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Monitoring Wilayah</h2>
                    <p className="text-slate-500">Pantau kepatuhan sekolah di wilayah Anda</p>
                </div>

                <div className="flex flex-wrap gap-3 bg-white p-1.5 rounded-lg border border-slate-200">
                    <select
                        className="p-2 bg-transparent text-sm font-medium outline-none cursor-pointer"
                        value={selectedKec}
                        onChange={(e) => setSelectedKec(e.target.value)}
                    >
                        <option value="Semua">Semua Wilayah ({kecamatanList.length})</option>
                        {kecamatanList.map(kec => (
                            <option key={kec} value={kec}>{kec}</option>
                        ))}
                    </select>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <select
                        className="p-2 bg-transparent text-sm font-medium outline-none cursor-pointer"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="all">Semua Bulan</option>
                        {MONTHS.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <select
                        className="p-2 bg-transparent text-sm font-medium outline-none cursor-pointer pr-4"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {uniqueYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Sekolah</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalSchools}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                            <Building2 size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Sudah Lapor</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalReported}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-5 border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Belum Lapor</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalUnreported}</h3>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-5 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Capaian</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <h3 className="text-2xl font-bold text-slate-800">{complianceRate}</h3>
                                <span className="text-slate-500 font-medium">%</span>
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 col-span-1 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-teal-600" /> Status Verifikasi
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-slate-700 font-medium">Disetujui</span>
                            </div>
                            <span className="font-bold text-slate-800">{approvedCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-slate-700 font-medium">Menunggu Verifikasi</span>
                            </div>
                            <span className="font-bold text-slate-800">{pendingCount}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                <span className="text-slate-700 font-medium">Ditolak</span>
                            </div>
                            <span className="font-bold text-slate-800">{rejectedCount}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-0 col-span-1 lg:col-span-2 shadow-sm flex flex-col h-96">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <AlertCircle size={20} className="text-rose-500" /> Daftar Belum Lapor
                        </h3>
                        <Badge variant="outline" className="bg-white border-rose-200 text-rose-600">
                            {unreportedList.length} Sekolah
                        </Badge>
                    </div>

                    <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
                        {unreportedList.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {unreportedList.map(s => (
                                    <li key={s.npsn} className="px-6 py-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-slate-800 leading-none">{s.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">NPSN: {s.npsn}</p>
                                        </div>
                                        <Badge variant="secondary" className="font-normal">{s.kecamatan}</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-3">
                                    <CheckCircle size={32} />
                                </div>
                                <p className="font-semibold text-slate-800">Luar biasa!</p>
                                <p className="text-sm text-slate-500 mt-1">Semua sekolah di {selectedKec === 'Semua' ? 'wilayah Anda' : selectedKec} sudah melapor.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function KorwilArchive({ reports, schools, kecamatanList }: { reports: Report[], schools: SchoolData[], kecamatanList: string[] }) {
    const today = new Date();
    const currentYearStr = today.getFullYear().toString();

    // Dynamic Years from Data
    const availableYears = Array.from(new Set(reports.map(r => r.year)))
        .sort((a, b) => parseInt(b) - parseInt(a));
    const defaultYear = availableYears.includes(currentYearStr) ? currentYearStr : (availableYears[0] || currentYearStr);
    const yearOptions = availableYears.length > 0 ? availableYears : [currentYearStr];
    if (!yearOptions.includes(currentYearStr)) yearOptions.unshift(currentYearStr);
    const uniqueYears = Array.from(new Set(yearOptions)).sort().reverse();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState(defaultYear);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const schoolMap = schools.reduce((acc, school) => {
        acc[school.npsn] = school;
        return acc;
    }, {} as Record<string, SchoolData>);

    let filtered = reports.filter(r => {
        const school = schoolMap[r.npsn];
        if (!school) return false;

        const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase()) || r.npsn.includes(search);
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchesKecamatan = filterKecamatan === 'all' || school.kecamatan === filterKecamatan;
        const matchesMonth = filterMonth === 'all' || r.month === filterMonth;
        const matchesYear = filterYear === 'all' || r.year === filterYear;

        return matchesSearch && matchesStatus && matchesKecamatan && matchesMonth && matchesYear;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedReports = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleExport = async () => {
        try {
            // exportReportsToExcel expects (reports: Report[], schools: SchoolData[], month: string, year: string, role?: string, wilayahName?: string)
            // Convert schoolMap back to an array for the export function
            const schoolsList = Object.values(schoolMap);
            await exportReportsToExcel(
                filtered,
                schoolsList,
                filterMonth === 'all' ? '' : filterMonth,
                filterYear === 'all' ? '' : filterYear,
                'korwil',
                kecamatanList.join(', ')
            );
            toast.success("Data berhasil diekspor ke Excel!");
        } catch (error) {
            toast.error("Gagal mengekspor data");
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
        } catch (e) { return dateStr; }
    };

    return (
        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-sm animate-in fade-in duration-500 flex flex-col h-[calc(100vh-140px)]">
            <div className="p-6 border-b border-slate-100 space-y-4 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Database size={24} className="text-indigo-600" /> Arsip Digital Korwil
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Lihat dan unduh laporan sekolah di wilayah Anda</p>
                    </div>
                    <Button onClick={handleExport} disabled={filtered.length === 0} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                        <FileSpreadsheet size={16} className="mr-2" /> Export Excel
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <Input
                            placeholder="Cari sekolah atau NPSN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                    <select
                        className="p-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    >
                        <option value="all">Semua Bulan</option>
                        {MONTHS.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select
                        className="p-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                    >
                        {uniqueYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <select
                        className="p-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={filterKecamatan}
                        onChange={(e) => setFilterKecamatan(e.target.value)}
                    >
                        <option value="all">Semua Wilayah</option>
                        {kecamatanList.map(kec => (
                            <option key={kec} value={kec}>{kec}</option>
                        ))}
                    </select>
                    <select
                        className="p-2 text-sm border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Semua Status</option>
                        <option value="pending">Menunggu Verifikasi</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left relative">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0 backdrop-blur-md shadow-sm z-10">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Sekolah</th>
                            <th className="px-6 py-4 font-semibold">Bulan</th>
                            <th className="px-6 py-4 font-semibold">Kecamatan</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedReports.length > 0 ? paginatedReports.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{schoolMap[item.npsn]?.name || item.npsn}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock size={12} /> Dikirim: {formatDate(item.createdAt || '')}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-700">
                                        {item.month} {item.year}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {schoolMap[item.npsn]?.kecamatan || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {item.status === 'approved' && <Badge variant="approved" className="shadow-none">Disetujui</Badge>}
                                    {item.status === 'pending' && <Badge variant="pending" className="shadow-none">Menunggu</Badge>}
                                    {item.status === 'rejected' && <Badge variant="destructive" className="shadow-none">Ditolak</Badge>}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <a href={item.link} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors">
                                        <FileText size={14} /> Buka Laporan
                                    </a>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Tidak ada data laporan yang ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white rounded-b-xl">
                <span className="text-sm text-slate-500">
                    Menampilkan <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + (paginatedReports.length > 0 ? 1 : 0)}</span> - <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + paginatedReports.length}</span> dari <span className="font-bold text-slate-800">{filtered.length}</span> data
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm font-medium text-slate-700 w-12 text-center">
                        {currentPage} / {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
