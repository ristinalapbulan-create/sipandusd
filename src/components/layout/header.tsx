"use client";

import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import Image from "next/image";

interface HeaderProps {
    onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
    const { user, logout } = useAuth();

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 glass-effect">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Logo Tabalong Smart */}
                    <img
                        src="/tabalong-smart.png"
                        alt="Logo Tabalong Smart"
                        className="h-10 w-auto"
                    />
                    <div className="hidden md:block w-px h-8 bg-slate-300 mx-1"></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            {/* Logo Si-PANDU Long */}
                            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        </div>
                    </div>
                </div>

                <div>
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 text-right">
                                <div className="hidden sm:block">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{user.role === 'school' ? 'Kepala Sekolah' : user.data.name}</p>
                                    <p className="text-sm font-semibold text-slate-800">{user.role === 'school' ? user.data.name : 'Bidang Pembinaan SD'}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                    {(user.data as any).photoUrl ? (
                                        <img src={(user.data as any).photoUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold text-lg">{user.data.name?.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            <Button onClick={logout} className="!px-3 !py-2 sm:!px-4 bg-red-600 hover:bg-red-700 text-white font-medium shadow-md shadow-red-100 transition-all">
                                <LogOut size={18} className="sm:mr-2" />
                                <span className="hidden sm:inline">Keluar</span>
                            </Button>
                        </div>
                    ) : (
                        <div>
                            {onLoginClick && (
                                <Button onClick={onLoginClick} className="shadow-md hover:shadow-lg transition-shadow !px-3 sm:!px-4">
                                    <LogIn size={20} className="sm:mr-2" />
                                    <span className="hidden sm:inline">Masuk</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
