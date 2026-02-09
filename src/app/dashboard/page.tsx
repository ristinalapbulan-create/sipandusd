"use client";

import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { AdminDashboard } from "@/components/features/admin/admin-dashboard";
import { SchoolDashboard } from "@/components/features/school/school-dashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [currentView, setCurrentView] = useState('monitoring'); // Default for admin

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/');
        } else if (user) {
            // Set default view based on role
            if (user.role === 'school') setCurrentView('dashboard');
            else setCurrentView('monitoring');
        }
    }, [user, isLoading, router]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
    );

    if (!user) return null; // Should redirect by now

    return (
        <div className="min-h-screen flex flex-col text-slate-800 bg-slate-50">
            <Header />

            <div className="flex flex-1 max-w-7xl mx-auto w-full">
                <Sidebar currentView={currentView} setView={setCurrentView} />

                <main className="flex-1 p-6 overflow-x-hidden">
                    {user.role === 'admin' ? (
                        <AdminDashboard view={currentView} />
                    ) : (
                        <SchoolDashboard view={currentView} setView={setCurrentView} />
                    )}
                </main>
            </div>

            <Footer />
            <MobileNav currentView={currentView} setView={setCurrentView} />
        </div>
    );
}
