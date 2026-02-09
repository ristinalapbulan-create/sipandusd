"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react";
import { api } from "@/lib/api";
import { firebaseService } from "@/lib/firebase-service";
import { toast } from "sonner";
import { SchoolData } from "@/lib/types";

export function FirebaseSync() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: number; total: number } | null>(null);

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        try {
            // 1. Fetch from GAS
            const data = await api.getInitialData();
            const schools: SchoolData[] = data.schools || [];

            if (schools.length === 0) {
                toast.error("Tidak ada data sekolah dari sumber lama.");
                setLoading(false);
                return;
            }

            // 2. Sync to Firestore
            const count = await firebaseService.syncSchools(schools);

            setResult({ success: count, total: schools.length });
            toast.success(`Berhasil menyinkronkan ${count} data sekolah!`);

        } catch (error) {
            console.error(error);
            toast.error("Gagal melakukan sinkronisasi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 bg-slate-50 border-slate-200">
            <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Database size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800">Sinkronisasi Database</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        Salin data sekolah dari Google Sheets (API Lama) ke Firebase Firestore.
                        Gunakan fitur ini untuk inisialisasi awal atau update data master.
                    </p>

                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleSync}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sedang Menyalin...</>
                            ) : (
                                <><RefreshCw className="mr-2 h-4 w-4" /> Mulai Sinkronisasi</>
                            )}
                        </Button>

                        {result && (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in">
                                <CheckCircle size={16} />
                                <span>Berhasil: {result.success} / {result.total} sekolah</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
