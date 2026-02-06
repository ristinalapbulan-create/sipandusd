"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { User, UserRole } from "@/lib/types";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [loginType, setLoginType] = useState<UserRole>('school');
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.login(credentials.username, credentials.password, loginType);
            if (res.success && res.user) {
                login(res.user as User);
                toast.success(`Selamat datang, ${res.user.data.name}!`);
                onClose();
            } else {
                setError("Login gagal. Periksa kembali username dan password.");
            }
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan sistem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden zoom-in-95 duration-200 animate-in">
                <div className="bg-slate-50 border-b border-slate-100 p-4 relative flex items-center justify-center">
                    <h3 className="font-bold text-lg text-slate-800">Masuk Aplikasi</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 absolute right-4"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="Logo Si-PANDU"
                            className="h-16 w-auto object-contain"
                        />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${loginType === 'school' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setLoginType('school')}
                            type="button"
                        >
                            Sekolah
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${loginType === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setLoginType('admin')}
                            type="button"
                        >
                            Dinas
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {loginType === 'school' ? 'NPSN' : 'Username'}
                            </label>
                            <Input
                                type="text"
                                required
                                placeholder={loginType === 'school' ? 'Contoh: 10001' : 'Masukkan username'}
                                value={credentials.username}
                                onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <Input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={credentials.password}
                                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full !py-2.5 !text-base mt-2" loading={loading}>
                            Masuk Sekarang
                        </Button>
                    </form>
                </div>
            </div >
        </div >
    );
}
