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

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Import needed for registration
import { db } from "@/lib/firebase";

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loginType, setLoginType] = useState<UserRole>('school');
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Construct email from username/NPSN
            const emailDomain = "@sipandu.com";
            const inputUsername = credentials.username.trim();
            const email = inputUsername.includes("@")
                ? inputUsername
                : `${inputUsername}${emailDomain}`;

            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, credentials.password);
                toast.success(`Selamat datang!`);
                onClose();
                window.location.href = '/dashboard';
            } else {
                // REGISTER MODE
                const userCredential = await createUserWithEmailAndPassword(auth, email, credentials.password);
                const user = userCredential.user;

                // Set Display Name
                await updateProfile(user, {
                    displayName: loginType === 'admin' ? "Administrator" : `Sekolah ${inputUsername}`
                });

                // Create initial Firestore Doc
                if (loginType === 'school') {
                    // Start with basic school data
                    await setDoc(doc(db, "schools", inputUsername), {
                        npsn: inputUsername,
                        name: `Sekolah ${inputUsername}`,
                        role: 'school',
                        createdAt: new Date().toISOString()
                    });
                } else {
                    // Create admin user doc
                    await setDoc(doc(db, "users", user.uid), {
                        role: 'admin',
                        email: email,
                        name: 'Administrator',
                        createdAt: new Date().toISOString()
                    });
                }

                toast.success("Akun berhasil dibuat! Login otomatis...");
                onClose();
                window.location.href = '/dashboard';
            }

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError("Password salah.");
            } else if (err.code === 'auth/user-not-found') {
                setError("Akun tidak ditemukan. Silakan daftar dulu.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Akun sudah ada. Silakan login.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password terlalu lemah (min. 6 karakter).");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Terlalu banyak percobaan. Silakan coba lagi nanti.");
            } else {
                setError("Error: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden zoom-in-95 duration-200 animate-in">
                <div className="bg-slate-50 border-b border-slate-100 p-4 relative flex items-center justify-center">
                    <h3 className="font-bold text-lg text-slate-800">
                        {mode === 'login' ? 'Masuk Aplikasi' : 'Buat Akun Baru'}
                    </h3>
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

                    {/* Mode Switcher Removed - Registration Disabled */}
                    {/* <div className="flex justify-center mb-4 text-sm">
                        <span className="text-slate-500 mr-2">{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                            className="text-blue-600 font-bold hover:underline"
                        >
                            {mode === 'login' ? 'Daftar di sini' : 'Login di sini'}
                        </button>
                    </div> */}

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
                                placeholder={loginType === 'school' ? 'Contoh: 10001' : 'Buat username baru'}
                                value={credentials.username}
                                onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <Input
                                type="password"
                                required
                                placeholder="Min. 6 karakter"
                                value={credentials.password}
                                onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full !py-2.5 !text-base mt-2" loading={loading}>
                            {mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-xs text-slate-400">
                            {mode === 'register' ? 'Akun akan terdaftar di Firebase Auth.' : 'Pastikan akun sudah terdaftar.'}
                        </p>
                    </div>
                </div>
            </div >
        </div >
    );
}
