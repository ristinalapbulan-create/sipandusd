
// Start of AdminDashboard file (updates imports and components)
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Report, SchoolData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    LayoutDashboard, FileText, CheckCircle, Clock, Search, Filter,
    MoreHorizontal, Download, ChevronLeft, ChevronRight, X, TrendingUp,
    Edit, Trash2, Lock, Plus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KECAMATAN_LIST, MONTHS } from "@/lib/constants";
import { ComplianceChart, StatusChart } from "./chart-views";

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
            const data = await api.getInitialData();
            setReports(data.reports);
            setSchools(data.schools);
        } catch (e) {
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
            {view === 'verification' && <AdminVerification reports={reports} refresh={fetchData} />}
            {view === 'archive' && <AdminArchive reports={reports} />}
            {view === 'schools' && <AdminSchools schools={schools} refresh={fetchData} />}
        </div>
    );
}

function AdminMonitoring({ reports, schools }: { reports: Report[], schools: SchoolData[] }) {
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Filter reports based on selection
    const filteredReports = reports.filter(r =>
        r.month === selectedMonth && r.year === selectedYear
    );

    const totalReports = filteredReports.length;
    const pending = filteredReports.filter(r => r.status === 'pending').length;
    const approved = filteredReports.filter(r => r.status === 'approved').length;
    const rejected = filteredReports.filter(r => r.status === 'rejected').length;

    // Bar Chart Data
    const complianceData = KECAMATAN_LIST.map(kec => {
        const schoolsInKec = schools.filter(s => s.address === kec);
        // Only count APPROVED reports for compliance in the selected period
        const reportCount = filteredReports.filter(r =>
            schoolsInKec.some(s => s.npsn === r.npsn) && r.status === 'approved'
        ).length;
        const totalSchools = schoolsInKec.length || 1;
        const rawPercentage = Math.round((reportCount / totalSchools) * 100);
        return {
            name: kec.replace('Kec. ', ''),
            full_name: kec,
            percentage: rawPercentage,
            schools: schoolsInKec.length,
            reports: reportCount
        };
    });

    // Pie Chart Data
    const statusData = [
        { name: 'Disetujui', value: approved, color: '#0d9488' }, // teal-600
        { name: 'Menunggu', value: pending, color: '#f59e0b' }, // amber-500
        { name: 'Ditolak', value: rejected, color: '#ef4444' }, // red-500
    ];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2 tracking-tight">Monitoring Dashboard</h2>
                    <p className="text-blue-100 max-w-xl">
                        Pantau progres pengiriman laporan bulanan sekolah se-Tabalong secara real-time.
                    </p>
                </div>

                {/* Filters */}
                <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="appearance-none bg-blue-900/50 hover:bg-blue-800/50 text-white pl-4 pr-10 py-2 rounded-xl border border-blue-400/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium transition-colors cursor-pointer"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i} value={(i + 1).toString()} className="text-slate-800">{m}</option>
                            ))}
                        </select>
                        <ChevronLeft className="w-4 h-4 text-white/50 absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg] pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none bg-blue-900/50 hover:bg-blue-800/50 text-white pl-4 pr-10 py-2 rounded-xl border border-blue-400/30 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium transition-colors cursor-pointer"
                        >
                            {[currentYear, (parseInt(currentYear) - 1).toString()].map(y => (
                                <option key={y} value={y} className="text-slate-800">{y}</option>
                            ))}
                        </select>
                        <ChevronLeft className="w-4 h-4 text-white/50 absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg] pointer-events-none" />
                    </div>
                </div>

                {/* Decorative */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-lg hover:bg-slate-50 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Laporan</p>
                            <p className="text-4xl font-bold text-slate-800">{totalReports}</p>
                        </div>
                        <div className="p-3 bg-blue-100/50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                        <TrendingUp size={12} className="mr-1" /> Update Hari Ini
                    </div>
                </Card>

                <Card className="p-6 border-0 shadow-lg hover:bg-slate-50 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Perlu Verifikasi</p>
                            <p className="text-4xl font-bold text-amber-600">{pending}</p>
                        </div>
                        <div className="p-3 bg-amber-100/50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Clock size={24} />
                        </div>
                    </div>
                    {pending > 0 && (
                        <div className="mt-4 flex items-center text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-full animate-pulse">
                            Action Needed
                        </div>
                    )}
                </Card>

                <Card className="p-6 border-0 shadow-lg hover:bg-slate-50 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Disetujui</p>
                            <p className="text-4xl font-bold text-teal-600">{approved}</p>
                        </div>
                        <div className="p-3 bg-teal-100/50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                        {totalReports > 0 ? Math.round((approved / totalReports) * 100) : 0}% Approval Rate
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ComplianceChart data={complianceData} />
                <StatusChart data={statusData} total={totalReports} />
            </div>
        </div>
    );
}

// ... (Rest of component functions: AdminVerification, AdminArchive with minimal UI updates if any)
// Need to update AdminSchools to use KECAMATAN_LIST

function AdminVerification({ reports, refresh }: { reports: Report[], refresh: () => void }) {
    // ... Copy processing logic ...
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const pendingReports = reports.filter(r => r.status === 'pending');

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            await api.updateReportStatus(id, 'approved');
            toast.success("Laporan disetujui");
            refresh();
        } catch (e) { toast.error("Gagal memproses"); }
        finally { setProcessing(null); }
    };

    const handleReject = async () => {
        if (!rejectId || !rejectNote) return;
        setProcessing(rejectId);
        try {
            await api.updateReportStatus(rejectId, 'rejected', rejectNote);
            toast.success("Laporan ditolak");
            setRejectId(null);
            setRejectNote('');
            refresh();
        } catch (e) { toast.error("Gagal memproses"); }
        finally { setProcessing(null); }
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
                                            <p className="font-semibold text-slate-800">{report.school_name}</p>
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

function AdminArchive({ reports }: { reports: Report[] }) {
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterKec, setFilterKec] = useState('');

    const approved = reports.filter(r => r.status === 'approved');
    const filtered = approved.filter(r => {
        const matchesSearch = r.school_name.toLowerCase().includes(search.toLowerCase()) || r.npsn.includes(search);
        const matchesYear = filterYear ? r.year === filterYear : true;
        const matchesMonth = filterMonth ? r.month === filterMonth : true;

        // Complex checking for kecamatan might be needed if not in report, 
        // but report usually has it or we filter by school list. 
        // Assuming we rely on search for school specific, let's keep it simple for now or fetch school data.
        // Actually, the report object in `types.ts` doesn't have kecamatan directly, but `schools` data is available in parent.
        // For now, let's stick to Year and Month which are in Report object.
        // If user wants Kecamatan, we'd need to pass `schools` prop to AdminArchive. 
        // Let's add passing schools to AdminArchive first if we want strict kecamatan filtering, 
        // or just filter by Year/Month as user asked for "filters" generically, usually date based for archives.
        // Wait, user just said "tambahan filter". Date is most critical for archives.
        // Let's add Year and Month first.

        return matchesSearch && matchesYear && matchesMonth;
    });

    const years = Array.from(new Set(approved.map(r => r.year))).sort().reverse();

    return (
        <div className="space-y-6">
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
                                        <p className="font-semibold text-slate-800">{item.school_name}</p>
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
                                        <Badge variant="approved" className="shadow-none">Disetujui</Badge>
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
            await api.saveSchoolData({ ...formData, id: editing?.id });
            toast.success("Data sekolah disimpan");
            setIsModalOpen(false);
            refresh();
        } catch (e) { toast.error("Gagal menyimpan"); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus data sekolah ini?")) return;
        try {
            await api.deleteSchool(id);
            toast.success("Sekolah dihapus");
            refresh();
        } catch (e) { toast.error("Gagal menghapus"); }
    };

    const handleReset = async (id: string) => {
        if (!confirm("Reset password ke default?")) return;
        try {
            await api.resetSchoolPassword(id);
            toast.success("Password direset");
        } catch (e) { toast.error("Gagal reset"); }
    }

    return (
        <div className="space-y-6">
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
                    <Button onClick={handleAdd} className="shadow-lg shadow-blue-200"><Plus size={16} className="mr-2" /> Tambah</Button>
                </div>
            </div>

            <Card className="overflow-hidden shadow-sm border-0">
                <div className="overflow-x-auto">
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
                                            <button onClick={() => handleReset(s.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password"><Lock size={16} /></button>
                                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800">{editing ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">NPSN</label>
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
