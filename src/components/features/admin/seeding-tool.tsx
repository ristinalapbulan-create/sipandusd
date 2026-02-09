"use strict";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KECAMATAN_LIST } from "@/lib/constants";
import { firebaseService } from "@/lib/firebase-service";
import { toast } from "sonner";
import { Loader2, Save, Database, RefreshCw, Trash2 } from "lucide-react";
import { REAL_SCHOOL_DATA } from "@/lib/school-data";

// Mock Data Generators for missing districts
const generateMockSchools = (kecamatan: string, count: number) => {
    const schools = [];
    const cleanName = kecamatan.replace('Kec. ', '').toUpperCase();
    for (let i = 1; i <= count; i++) {
        schools.push({
            name: `SD NEGERI ${i} ${cleanName}`,
            npsn: `303${Math.floor(10000 + Math.random() * 90000)}`, // Random 303xxxxx
            kecamatan: kecamatan,
            address: `Desa ${cleanName}, ${kecamatan}`,
            password: `303${Math.floor(10000 + Math.random() * 90000)}` // Temp
        });
    }
    return schools;
};

// Known counts (approximate/from search)
const DISTRICT_COUNTS: Record<string, number> = {
    "Kec. Bintang Ara": 15,
    "Kec. Haruai": 25,
    "Kec. Kelua": 20,
    "Kec. Muara Harus": 8,
    "Kec. Murung Pudak": 25,
    "Kec. Pugaan": 9,
    "Kec. Tanjung": 35,
    "Kec. Tanta": 22,
    "Kec. Upau": 8,
    // Previously seeded or small
    "Kec. Jaro": 0, // Done
    "Kec. Banua Lawas": 0, // Done
    "Kec. Muara Uya": 0 // Done
};

export function SeedingTool() {
    const [selectedKec, setSelectedKec] = useState(KECAMATAN_LIST[0]);
    const [schoolList, setSchoolList] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);

    const handleGenerate = () => {
        if (!selectedKec) return;

        const realData = REAL_SCHOOL_DATA[selectedKec];
        let schools = [];

        if (realData && realData.length > 0) {
            schools = realData.map(s => ({
                ...s,
                kecamatan: selectedKec,
                address: s.address || selectedKec,
                password: s.npsn // Default password
            }));
            toast.success(`Loaded ${schools.length} REAL schools for ${selectedKec}`);
        } else {
            const count = DISTRICT_COUNTS[selectedKec] || 10;
            if (count === 0) toast.info("Info: Kuota default 0 (mungkin sudah ada data).");

            schools = generateMockSchools(selectedKec, count);
            toast.info(`Generated ${schools.length} MOCK schools (No real data found)`);
        }

        // Format as JSON string for editing
        setSchoolList(JSON.stringify(schools, null, 2));
        setPreview(schools);
    };

    const handleParse = () => {
        try {
            const parsed = JSON.parse(schoolList);
            if (Array.isArray(parsed)) {
                setPreview(parsed);
                toast.success(`Valid JSON: ${parsed.length} schools found.`);
            } else {
                toast.error("Format JSON tidak valid (harus array).");
            }
        } catch (e) {
            toast.error("Gagal memparsing JSON. Cek sintaks.");
        }
    };

    const handleSeed = async () => {
        if (preview.length === 0) return;
        if (!confirm(`Yakin ingin menambahkan ${preview.length} sekolah ke ${selectedKec}?`)) return;

        setLoading(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const s of preview) {
                try {
                    // Update regex to fix NPSN format if creating random
                    const fixedNpsn = s.npsn || `303${Math.floor(Date.now() / 1000).toString().slice(-5)}`;

                    await firebaseService.saveSchool({
                        npsn: fixedNpsn,
                        name: s.name,
                        kecamatan: s.kecamatan || selectedKec,
                        address: s.address || selectedKec,
                        createdAt: new Date().toISOString()
                    });

                    await firebaseService.ensureSchoolUser({
                        uid: fixedNpsn,
                        name: s.name,
                        npsn: fixedNpsn,
                        password: fixedNpsn // Default password is NPSN
                    });
                    successCount++;
                } catch (err) {
                    console.error(err);
                    errorCount++;
                }
            }
            toast.success(`Selesai! Sukses: ${successCount}, Gagal: ${errorCount}`);
            // Clear after success
            if (successCount > 0) {
                setSchoolList("");
                setPreview([]);
            }
        } catch (e) {
            toast.error("Terjadi kesalahan fatal saat seeding.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manajemen Data Sekolah</h2>
                    <p className="text-slate-500">Tambah data sekolah per kecamatan secara massal.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 col-span-1 space-y-4 h-fit">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Database size={18} /> Kontrol Generator
                    </h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Pilih Kecamatan</label>
                        <select
                            className="w-full p-2 border border-slate-200 rounded-md bg-white"
                            value={selectedKec}
                            onChange={(e) => setSelectedKec(e.target.value)}
                        >
                            {KECAMATAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                        <Button onClick={handleGenerate} variant="outline" className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50">
                            <RefreshCw size={16} className="mr-2" /> Generate Template
                        </Button>
                        <hr className="border-slate-100" />
                        <Button
                            onClick={handleSeedAll}
                            disabled={loading}
                            className="w-full justify-start bg-slate-800 text-white hover:bg-slate-700"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Database size={16} className="mr-2" />}
                            Seed Semua Kecamatan ({Object.values(REAL_SCHOOL_DATA).reduce((a, b) => a + b.length, 0)} Sekolah)
                        </Button>
                        <p className="text-xs text-slate-400">
                            *Otomatis memasukkan semua data sekolah dari setiap kecamatan yang tersedia di sistem.
                        </p>
                    </div>
                </Card>

                <Card className="p-6 col-span-1 lg:col-span-2 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-700">Editor Data (JSON)</h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={handleParse} disabled={!schoolList}>
                                Validasi Format
                            </Button>
                            <Button size="sm" onClick={handleSeed} disabled={loading || preview.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                                Simpan ke Database
                            </Button>
                        </div>
                    </div>

                    <textarea
                        className="flex-1 w-full bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-lg outline-none resize-none overflow-auto"
                        value={schoolList}
                        onChange={(e) => setSchoolList(e.target.value)}
                        placeholder="// Klik 'Generate Template' atau paste JSON data sekolah di sini...
[
  {
    'name': 'SD NEGERI CONTOH',
    'npsn': '12345678',
    'kecamatan': 'Kec. Contoh'
  }
]"
                    />

                    <div className="mt-2 text-xs text-slate-500 flex justify-between">
                        <span>{preview.length > 0 ? `${preview.length} sekolah siap ditambahkan.` : 'Belum ada data valid.'}</span>
                        <span>Format: JSON Array of Objects</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
