const fs = require('fs');
const file = 'src/components/features/admin/admin-dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');
const lines = data.split('\n');

let startIdx = lines.findIndex(l => l.includes('function AdminSettings({ refresh }'));
if (startIdx === -1) startIdx = lines.findIndex(l => l.includes('const {user, updateUser} = useAuth();')) - 1;

const pristineAdminSettings = `export function AdminSettings({ refresh }: { refresh?: () => void }) {
    const {user, updateUser} = useAuth();
    const [profile, setProfile] = useState<{ name: string, photoUrl: string }>({name: '', photoUrl: '' });
    const [passwords, setPasswords] = useState({new: '', confirm: '' });
    const [loading, setLoading] = useState(false);

    // Korwil Management State
    const [korwilAccounts, setKorwilAccounts] = useState<any[]>([]);
    const [loadingKorwil, setLoadingKorwil] = useState(false);
    const [isKorwilModalOpen, setIsKorwilModalOpen] = useState(false);
    const [korwilForm, setKorwilForm] = useState({name: '', email: '', password: '', kecamatan: [] as string[] });

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.data.name,
                photoUrl: (user.data as any).photoUrl || ''
            });
        }
        fetchKorwil();
    }, [user]);

    const fetchKorwil = async () => {
        setLoadingKorwil(true);
        try {
            const users = await firebaseService.getUsersByRole('korwil');
            setKorwilAccounts(users);
        } catch (e) { console.error(e); }
        finally { setLoadingKorwil(false); }
    };

    const toggleKecamatan = (kecamatan: string) => {
        setKorwilForm(prev => {
            if (prev.kecamatan.includes(kecamatan)) {
                return { ...prev, kecamatan: prev.kecamatan.filter(k => k !== kecamatan) };
            } else {
                return { ...prev, kecamatan: [...prev.kecamatan, kecamatan] };
            }
        });
    };

    const handleCreateKorwil = async (e: React.FormEvent) => {
        e.preventDefault();
        if (korwilForm.kecamatan.length === 0) return toast.error("Pilih minimal 1 kecamatan");
        if (korwilForm.password.length < 6) return toast.error("Password minimal 6 karakter");
        setLoading(true);
        try {
            await firebaseService.createKorwilAccount(
                korwilForm.email,
                korwilForm.password,
                korwilForm.name,
                korwilForm.kecamatan
            );
            toast.success("Akun Korwil berhasil dibuat");
            setIsKorwilModalOpen(false);
            setKorwilForm({name: '', email: '', password: '', kecamatan: [] });
            fetchKorwil();
        } catch (error: any) {
            toast.error("Gagal membuat akun: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteKorwil = async (id: string) => {
        if (!confirm("Hapus akun Korwil ini secara permanen?")) return;
        try {
            setLoadingKorwil(true);
            await firebaseService.deleteUser(id);
            toast.success("Akun Korwil dihapus");
            fetchKorwil();
        } catch (e: any) {
            toast.error("Gagal menghapus: " + e.message);
        } finally {
            setLoadingKorwil(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await firebaseService.updateUserProfile(user?.data.id || 'admin', 'admin', profile);
            updateUser({name: profile.name, photoUrl: profile.photoUrl } as any);
            toast.success("Profil berhasil diperbarui");
        } catch (e: any) {
            toast.error("Gagal update profil: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return toast.error("Password konfirmasi tidak cocok");
        setLoading(true);
        try {
            await firebaseService.changeUserPassword(passwords.new);
            toast.success("Password berhasil diubah");
            setPasswords({new: '', confirm: '' });
        } catch (e: any) {
            if (e.code === 'auth/requires-recent-login') toast.error("Demi keamanan, login ulang dulu.");
            else toast.error("Gagal mengubah password");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return toast.error("Ukuran file maksimal 2MB");
            const reader = new FileReader();
            reader.onloadend = () => { setProfile({ ...profile, photoUrl: reader.result as string }); };
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
                <Card className="p-6 border-0 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle size={24} /></div>
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
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">Ganti Foto</div>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                            </div>
                            <p className="text-xs text-slate-500">Klik gambar untuk mengubah foto (Max 2MB)</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1.5 text-slate-700">Nama Tampilan</label>
                            <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Contoh: Admin Dinas Pendidikan" />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" disabled={loading} className="w-full">Simpan Perubahan</Button>
                        </div>
                    </form>
                </Card>

                <div className="space-y-8">
                    <Card className="p-6 border-0 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Lock size={24} /></div>
                            <div>
                                <h3 className="font-semibold text-slate-800">Keamanan</h3>
                                <p className="text-sm text-slate-500">Ubah password akun admin</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Password Baru</label>
                                <Input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="Minimal 6 karakter" />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1.5 text-slate-700">Konfirmasi Password</label>
                                <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Ulangi password baru" />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" variant="outline" disabled={loading}>Update Password</Button>
                            </div>
                        </form>
                    </Card>

                    <Card className="p-6 border-0 shadow-sm space-y-4 border-l-4 border-l-amber-400 bg-amber-50/30">
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <AlertCircle size={18} className="text-amber-500" /> Pemeliharaan Data
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Hapus laporan ganda (duplikat) yang mungkin terkirim tidak sengaja.</p>
                        </div>
                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={() => {
                                // Dummy implementation or real one
                                toast.info("Fitur pembersihan sedang disesuaikan.");
                            }}
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
                                disabled={loading}
                                onClick={() => toast.info("Fitur backup sedang disesuaikan.")}
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
                            <Button
                                variant="outline"
                                disabled={loading}
                                className="w-full bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            >
                                Upload File Backup JSON
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Users size={20} /> Manajemen Akun Korwil</h3>
                            <Button onClick={() => setIsKorwilModalOpen(true)} size="sm">
                                <Plus size={16} className="mr-2" /> Tambah Korwil
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Kelola akun Koordinator Wilayah (Pengawas) yang dapat mengakses dashboard pemantauan sekolah berdasarkan kecamatan yang ditugaskan.</p>

                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Nama Korwil</th>
                                        <th className="px-4 py-3">Email Login</th>
                                        <th className="px-4 py-3">Wilayah (Kecamatan)</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingKorwil ? (
                                        <tr><td colSpan={4} className="text-center py-8 text-slate-500">Memuat data korwil...</td></tr>
                                    ) : korwilAccounts.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-8 text-slate-500">Belum ada akun Korwil yang terdaftar.</td></tr>
                                    ) : (
                                        korwilAccounts.map((korwil) => (
                                            <tr key={korwil.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{korwil.name}</td>
                                                <td className="px-4 py-3 text-slate-600">{korwil.email}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(korwil.kecamatan || []).map((k: string) => (
                                                            <span key={k} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{k.replace('Kec. ', '')}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handleDeleteKorwil(korwil.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus Akun"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {isKorwilModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-slate-800">Tambah Akun Korwil</h3>
                            <button onClick={() => setIsKorwilModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateKorwil} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1 text-slate-700">Nama Lengkap</label>
                                <Input required value={korwilForm.name} onChange={e => setKorwilForm({ ...korwilForm, name: e.target.value })} placeholder="Contoh: Budi Santoso, M.Pd" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1 text-slate-700">Email Login</label>
                                    <Input required type="email" value={korwilForm.email} onChange={e => setKorwilForm({ ...korwilForm, email: e.target.value })} placeholder="korwil@email.com" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1 text-slate-700">Password</label>
                                    <Input required type="password" value={korwilForm.password} onChange={e => setKorwilForm({ ...korwilForm, password: e.target.value })} placeholder="Minimal 6 karakter" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium block mb-2 text-slate-700">Pilih Wilayah Kecamatan (Bisa pilih lebih dari satu)</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg custom-scrollbar">
                                    {KECAMATAN_LIST.map(kec => (
                                        <label key={kec} className="flex items-start gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                                            <input
                                                type="checkbox"
                                                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                                checked={korwilForm.kecamatan.includes(kec)}
                                                onChange={() => toggleKecamatan(kec)}
                                            />
                                            <span className="text-sm font-medium text-slate-700">{kec}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setIsKorwilModalOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Akun'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
`;

const newLines = [...lines.slice(0, startIdx), pristineAdminSettings];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Rebuilt AdminSettings cleanly');
