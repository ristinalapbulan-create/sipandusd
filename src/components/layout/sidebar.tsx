"use client";

import { useAuth } from "@/components/providers";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, CheckCircle, FileText,
    Building2, UploadCloud, Clock, ShieldCheck,
    Menu, ChevronLeft, LogOut
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
    currentView: string;
    setView: (view: any) => void;
}

export function Sidebar({ currentView, setView }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user } = useAuth();

    if (!user) return null;

    const SidebarItem = ({ icon: Icon, label, id, active }: any) => (
        <button
            onClick={() => setView(id)}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                active
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-blue-600",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? label : undefined}
        >
            <Icon size={22} className={cn("transition-transform duration-200", active && "scale-110")} />

            {!isCollapsed && (
                <span className="truncate">{label}</span>
            )}

            {/* Active Indicator for collapsed mode */}
            {isCollapsed && active && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full opacity-50" />
            )}
        </button>
    );

    return (
        <aside className={cn(
            "bg-white/80 backdrop-blur-xl border-r border-slate-200/60 sticky top-20 h-[calc(100vh-80px)] transition-all duration-300 z-40 hidden md:flex flex-col shadow-sm",
            isCollapsed ? "w-20" : "w-56"
        )}>
            {/* Top Collapse Toggle */}
            <div className="p-4 border-b border-slate-100 flex justify-center items-center">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
                >
                    {isCollapsed ? <Menu size={20} /> : (
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                            <ChevronLeft size={16} /> Collapse
                        </div>
                    )}
                </button>
            </div>

            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {user.role === 'admin' ? (
                    <>
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" id="monitoring" active={currentView === 'monitoring'} />
                        <SidebarItem icon={CheckCircle} label="Verifikasi" id="verification" active={currentView === 'verification'} />
                        <SidebarItem icon={FileText} label="Arsip Digital" id="archive" active={currentView === 'archive'} />
                        <SidebarItem icon={Building2} label="Data Sekolah" id="schools" active={currentView === 'schools'} />
                        <div className="my-2 border-t border-slate-100 mx-2"></div>
                        <SidebarItem icon={ShieldCheck} label="Pengaturan" id="settings" active={currentView === 'settings'} />
                    </>
                ) : (
                    <>
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" active={currentView === 'dashboard'} />
                        <SidebarItem icon={UploadCloud} label="Kirim Laporan" id="submit" active={currentView === 'submit'} />
                        <SidebarItem icon={Clock} label="Riwayat Laporan" id="history" active={currentView === 'history'} />
                        <SidebarItem icon={ShieldCheck} label="Profil Sekolah" id="profile" active={currentView === 'profile'} />
                    </>
                )}
            </div>

        </aside>
    );
}

export function MobileNav({ currentView, setView }: SidebarProps) {
    const { user } = useAuth();
    if (!user) return null;

    const NavItem = ({ icon: Icon, label, id, active }: any) => (
        <button
            onClick={() => setView(id)}
            className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 w-full",
                active
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
            )}
        >
            <Icon size={24} className={cn("mb-1 transition-transform", active && "scale-110")} />
            <span className={cn("text-[10px] font-medium leading-tight", active ? "font-bold" : "font-normal")}>{label}</span>
        </button>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-4 py-2 md:hidden flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
            {user.role === 'admin' ? (
                <>
                    <NavItem icon={LayoutDashboard} label="Monitor" id="monitoring" active={currentView === 'monitoring'} />
                    <NavItem icon={CheckCircle} label="Verifikasi" id="verification" active={currentView === 'verification'} />
                    <NavItem icon={FileText} label="Arsip" id="archive" active={currentView === 'archive'} />
                    <NavItem icon={Building2} label="Sekolah" id="schools" active={currentView === 'schools'} />
                    <NavItem icon={ShieldCheck} label="Settings" id="settings" active={currentView === 'settings'} />
                </>
            ) : (
                <>
                    <NavItem icon={LayoutDashboard} label="Home" id="dashboard" active={currentView === 'dashboard'} />
                    <NavItem icon={UploadCloud} label="Kirim" id="submit" active={currentView === 'submit'} />
                    <NavItem icon={Clock} label="Riwayat" id="history" active={currentView === 'history'} />
                    <NavItem icon={ShieldCheck} label="Profil" id="profile" active={currentView === 'profile'} />
                </>
            )}
        </div>
    );
}
