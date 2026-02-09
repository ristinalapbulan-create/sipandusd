"use client";

import { useEffect, useState } from "react";
// import { api } from "@/lib/api";
import { firebaseService } from "@/lib/firebase-service";
import { Report, SchoolData } from "@/lib/types";
import { useAuth } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UploadCloud, Clock, CheckCircle, AlertCircle, Building2, Lock, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { MONTHS } from "@/lib/constants";

interface SchoolDashboardProps {
    view: string;
    setView: (view: string) => void;
}

export function SchoolDashboard({ view, setView }: SchoolDashboardProps) {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (user?.role === 'school') {
                const npsn = (user.data as SchoolData).npsn;
                // Fetch reports from Firestore
                const data = await firebaseService.getReports('school', user.data.id || '', npsn);
                setReports(data);
            }
        } catch (e) {
            toast.error("Gagal memuat data");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    if (!user) return null;

    return (
        <div className="animate-in fade-in duration-500">
            {view === 'dashboard' && <SchoolStats myReports={reports} user={user} setView={setView} />}
            {view === 'submit' && <SchoolSubmitForm user={user} setView={setView} refresh={fetchData} />}
            {view === 'history' && <SchoolHistory myReports={reports} />}
            {view === 'profile' && <SchoolProfile user={user} />}
        </div>
    );
}

function SchoolStats({ myReports, user, setView }: any) {
    const pending = myReports.filter((r: any) => r.status === 'pending').length;
    const approved = myReports.filter((r: any) => r.status === 'approved').length;
    const rejected = myReports.filter((r: any) => r.status === 'rejected').length;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
                <div className="flex-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group animate-in fade-in slide-in-from-left duration-700 fill-mode-both">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Halo, {user.data.name} 👋</h2>
                        <p className="text-slate-500 text-lg font-light">
                            Selamat datang di dashboard Kepala Sekolah. Pantau dan kelola laporan bulanan Anda di sini.
                        </p>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-700">
                        <Building2 size={200} />
                    </div>
                </div>

                {/* Action Cards */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1 animate-in fade-in slide-in-from-right duration-700 delay-200 fill-mode-both">
                    <button
                        onClick={() => setView('submit')}
                        className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left relative overflow-hidden group"
                    >
                        <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform duration-500">
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-1">Kirim Laporan</h3>
                                <p className="text-blue-100 text-sm">Upload laporan bulan ini</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-colors"></div>
                    </button>

                    <button
                        onClick={() => setView('history')}
                        className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 text-slate-800 shadow-sm hover:shadow-lg hover:border-blue-200 hover:scale-[1.02] transition-all duration-300 text-left relative overflow-hidden group"
                    >
                        <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 group-hover:rotate-12">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-1 group-hover:text-blue-600 transition-colors">Riwayat</h3>
                                <p className="text-slate-500 text-sm group-hover:text-slate-600">Cek status laporan</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Reminder Alert */}
            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold">Pengingat Penting</p>
                    <p className="text-sm">
                        Batas akhir pengumpulan laporan bulanan adalah <strong>tanggal 5 setiap bulan berikutnya</strong>. Mohon agar dapat melaporkan tepat waktu.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-sm bg-amber-50/50 hover:bg-amber-50 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in zoom-in duration-500 delay-300 fill-mode-both cursor-default">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl animate-pulse">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Menunggu</p>
                            <p className="text-3xl font-bold text-slate-800">{pending}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-0 shadow-sm bg-teal-50/50 hover:bg-teal-50 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in zoom-in duration-500 delay-[400ms] fill-mode-both cursor-default">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl">
                            <CheckCircle size={28} />
                        </div>
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Disetujui</p>
                            <p className="text-3xl font-bold text-slate-800">{approved}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-0 shadow-sm bg-red-50/50 hover:bg-red-50 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in zoom-in duration-500 delay-[500ms] fill-mode-both cursor-default">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Perlu Revisi</p>
                            <p className="text-3xl font-bold text-slate-800">{rejected}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function SchoolSubmitForm({ user, setView, refresh }: any) {
    const [formData, setFormData] = useState({ month: MONTHS[0], year: new Date().getFullYear().toString(), link: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Link Validation
        if (!formData.link.includes('drive.google.com')) return toast.error("Harus link Google Drive");
        if (formData.link.includes('/folders/')) return toast.error("Mohon lampirkan link FILE, bukan link FOLDER");

        setLoading(true);
        try {
            // Check for duplicate report (Same NPSN, Month, Year)
            // We need to fetch reports first or use a checking method.
            // Since we don't have a direct 'check' API, we'll iterate the existing 'myReports' if available,
            // or fetch specifically. 'myReports' in props? No, this component fetches via refresh but doesn't have list prop.
            // But we can pass 'myReports' to it or fetch.
            // Let's just fetch existing reports for this user to check.
            const existingReports = await firebaseService.getReports('school', user.data.id, user.data.npsn);
            const duplicate = existingReports.find((r: any) =>
                r.month === formData.month &&
                r.year === formData.year &&
                r.npsn === user.data.npsn
            );

            if (duplicate) {
                toast.error(`Laporan ${formData.month} ${formData.year} sudah ada. Silakan edit di menu Riwayat.`);
                setLoading(false);
                return;
            }

            const reportData: Report = {
                id: '', // Auto gen
                ...formData,
                npsn: user.data.npsn,
                school_name: user.data.name,
                type: 'Laporan Bulanan',
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                status: 'pending',
                notes: ''
            };
            await firebaseService.submitReport(reportData);
            toast.success("Laporan terkirim!");
            refresh();
            setView('history');
        } catch (e) {
            console.error(e);
            toast.error("Gagal mengirim");
        }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Kirim Laporan Bulanan</h2>
            <Card className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Bulan</label>
                            <select className="w-full border rounded-lg px-3 py-2 bg-white" value={formData.month} onChange={e => setFormData({ ...formData, month: e.target.value as any })}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Tahun</label>
                            <Input
                                type="number"
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                                placeholder="Tahun"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 text-sm text-blue-800 space-y-2">
                            <p className="font-bold flex items-center gap-2">
                                <AlertCircle size={16} /> Panduan Upload Laporan:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-1 text-blue-700">
                                <li>Simpan file laporan di Google Drive sekolah.</li>
                                <li>Buat folder arsip berdasarkan <strong>Tahun</strong> agar rapi (Contoh: <code>Arsip 2026</code>).</li>
                                <li>Pastikan akses link diatur ke <strong>"Siapa saja yang memiliki link" (Public/Anyone with the link)</strong> agar Admin Dinas bisa membuka.</li>
                                <li>Pastikan hasil scan <strong>jelas</strong>, sudah <strong>ditandatangani</strong>, dan <strong>distempel</strong> (basah/digital).</li>
                                <li>Salin <strong>link file</strong> (bukan link folder) dan tempel di kolom bawah ini.</li>
                            </ul>
                        </div>

                        <label className="text-sm font-medium mb-2 block">Link Google Drive</label>
                        <Input placeholder="https://drive.google.com/file/d/..." value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} required />
                        <p className="text-xs text-slate-500 mt-1">Hanya menerima link file Google Drive (bukan folder).</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setView('dashboard')} className="flex-1" type="button">Batal</Button>
                        <Button type="submit" className="flex-1" loading={loading}>Kirim</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}


function SchoolHistory({ myReports }: any) {
    const [editing, setEditing] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ link: '' });
    const [loading, setLoading] = useState(false);

    const handleEdit = (report: any) => {
        setEditing(report);
        setEditForm({ link: report.link });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Update report using proper service method
            await firebaseService.updateReport(editing.id, {
                link: editForm.link,
                status: 'pending',
                notes: '', // Clear notes when re-submitting
            });

            toast.success("Laporan diperbarui & dikirim ulang");
            setIsModalOpen(false);
            window.location.reload(); // Reload to refresh data
        } catch (e) {
            console.error(e);
            toast.error("Gagal memperbarui laporan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Riwayat Laporan</h2>
            <Card className="overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Periode</th>
                            <th className="px-6 py-4">Tanggal Kirim</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Catatan</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myReports.length > 0 ? myReports.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">{r.month} {r.year}</td>
                                <td className="px-6 py-4">{r.date}</td>
                                <td className="px-6 py-4"><Badge variant={r.status}>{r.status}</Badge></td>
                                <td className="px-6 py-4 max-w-xs">{r.notes || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    {r.status === 'rejected' && (
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-700 border-blue-200 bg-blue-50">
                                            <Edit size={14} className="mr-1" /> Edit
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="text-center py-8 text-slate-400">Belum ada riwayat</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800">Perbaiki Laporan</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Link Google Drive Baru</label>
                                <Input
                                    value={editForm.link}
                                    onChange={e => setEditForm({ ...editForm, link: e.target.value })}
                                    placeholder="https://..."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Batal</Button>
                                <Button type="submit" loading={loading} className="px-6">Simpan & Kirim Ulang</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SchoolProfile({ user }: any) {
    const { login } = useAuth();

    // Password Form State
    const [pass, setPass] = useState({ old: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);

    // Profile Form State
    const [profileData, setProfileData] = useState({
        phoneNumber: user.data.phoneNumber || '',
        address: user.data.address || ''
    });
    const [profileLoading, setProfileLoading] = useState(false);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pass.new !== pass.confirm) return toast.error("Konfirmasi password salah");
        setPassLoading(true);
        try {
            await firebaseService.changeUserPassword(pass.new);
            toast.success("Password diubah");
            setPass({ old: '', new: '', confirm: '' });
        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/requires-recent-login') {
                toast.error("Demi keamanan, silakan login ulang sebelum mengganti password.");
            } else {
                toast.error("Gagal mengubah password: " + e.message);
            }
        }
        finally { setPassLoading(false); }
    };

    const handleProfileSubmit = async () => {
        setProfileLoading(true);
        try {
            // For schools, the ID in 'user.data' from AuthProvider might be the Auth UID.
            // But the Firestore Doc ID is likely the NPSN (based on our sync/fallback logic).
            // We need to pass the correct ID.
            // In AuthProvider: `data: {...schoolData, id: firebaseUser.uid }`
            // But schoolData has 'npsn'. 
            // In firebase-service.saveSchool, we used NPSN as ID.
            // So we should use 'user.data.npsn' as the ID for 'schools' collection update.

            const npsn = (user.data as any).npsn;
            if (!npsn) throw new Error("NPSN not found");

            await firebaseService.updateUserProfile(npsn, 'school', profileData);

            // Manually update local user context
            const updatedUser = {
                ...user,
                data: { ...user.data, ...profileData }
            };
            login(updatedUser);
            toast.success("Profil berhasil disimpan");
        } catch (e) {
            console.error(e);
            toast.error("Gagal menyimpan profil");
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Building2 size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Profil Sekolah</h2>
                </div>

                <Card className="overflow-hidden border-0 shadow-lg">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                        <div className="absolute inset-0 opacity-20 pattern-dots"></div>
                    </div>
                    <div className="px-8 pb-8">
                        <div className="relative -mt-16 mb-6 flex flex-col items-center md:items-start">
                            <div className="relative group">
                                <div className="h-32 w-32 bg-white rounded-2xl p-2 shadow-lg mx-auto md:mx-0 overflow-hidden">
                                    {(user.data as any).photoUrl ? (
                                        <img src={(user.data as any).photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="h-full w-full bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-4xl border border-slate-100">
                                            {user.data.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                                    <UploadCloud size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (e) => {
                                                const url = e.target?.result as string;
                                                // Same logic: use NPSN as ID for school
                                                const npsn = (user.data as any).npsn;
                                                if (npsn) {
                                                    await firebaseService.updateUserProfile(npsn, 'school', { photoUrl: url });
                                                    const updatedUser = {
                                                        ...user,
                                                        data: { ...user.data, photoUrl: url }
                                                    };
                                                    login(updatedUser);
                                                    toast.success("Foto profil diperbarui");
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-2xl text-slate-800">{user.data.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                        NPSN: {user.data.npsn}
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200">
                                        {user.data.kecamatan}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-slate-100">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">No. Kontak / HP Kepala Sekolah</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={profileData.phoneNumber}
                                                onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                                placeholder="08..."
                                                className="bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Alamat Sekolah</label>
                                        <Input
                                            value={profileData.address}
                                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                            placeholder="Alamat lengkap..."
                                            className="bg-slate-50 border-slate-200"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            onClick={handleProfileSubmit}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100"
                                            disabled={profileLoading}
                                        >
                                            {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Keamanan Akun</h2>
                </div>

                <Card className="p-8 border-0 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -mr-10 -mt-10"></div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-5 relative z-10">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Password Lama</label>
                            <Input
                                type="password"
                                value={pass.old}
                                onChange={e => setPass({ ...pass, old: e.target.value })}
                                required
                                className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="Masukkan password saat ini"
                            />
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Password Baru</label>
                                <Input
                                    type="password"
                                    value={pass.new}
                                    onChange={e => setPass({ ...pass, new: e.target.value })}
                                    required
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Konfirmasi Password Baru</label>
                                <Input
                                    type="password"
                                    value={pass.confirm}
                                    onChange={e => setPass({ ...pass, confirm: e.target.value })}
                                    required
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    placeholder="Ulangi password baru"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full bg-slate-800 hover:bg-slate-900 h-11 text-base shadow-lg shadow-slate-200"
                                loading={passLoading}
                            >
                                Simpan Perubahan Password
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
