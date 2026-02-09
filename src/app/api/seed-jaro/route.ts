
import { NextResponse } from 'next/server';
import { firebaseService } from '@/lib/firebase-service';

const JARO_SCHOOLS = [
    { name: "SD NEGERI 1 GARAGATA", npsn: "30303176" },
    { name: "SD NEGERI 1 JARO", npsn: "30303114" },
    { name: "SD NEGERI 1 MUANG", npsn: "30302909" },
    { name: "SD NEGERI 1 NALUI", npsn: "30302903" },
    { name: "SD NEGERI 1 NAMUN", npsn: "30302904" },
    { name: "SD NEGERI 1 SOLAN", npsn: "30302889" },
    { name: "SD NEGERI 2 GARAGATA", npsn: "30303177" },
    { name: "SD NEGERI 2 JARO", npsn: "30305470" },
    { name: "SD NEGERI 2 MUANG", npsn: "30302901" },
    { name: "SD NEGERI 2 NAMUN", npsn: "30311729" },
    { name: "SD NEGERI 3 JARO", npsn: "30303126" },
    { name: "SD NEGERI 3 SOLAN", npsn: "30302891" },
    { name: "SD NEGERI LANO", npsn: "30303154" },
    { name: "SD NEGERI PURUI", npsn: "30302856" },
    { name: "SD NEGERI TERATAU", npsn: "30302990" },
    { name: "SD ISLAM AL MADANIYAH", npsn: "30305469" }
];

export async function GET() {
    try {
        console.log("Starting Seeding Process for Jaro...");
        let processed = 0;
        const results = [];

        for (const s of JARO_SCHOOLS) {
            try {
                // 1. Save School
                await firebaseService.saveSchool({
                    npsn: s.npsn,
                    name: s.name,
                    kecamatan: "Kec. Jaro",
                    address: "Kec. Jaro", // Default address
                    createdAt: new Date().toISOString()
                });

                // 2. Ensure User Account
                await firebaseService.ensureSchoolUser({
                    uid: s.npsn,
                    name: s.name,
                    npsn: s.npsn,
                    password: s.npsn // Default pass
                });
                processed++;
                results.push({ npsn: s.npsn, status: 'success' });
            } catch (err: any) {
                console.error(`Error processing ${s.npsn}:`, err);
                results.push({ npsn: s.npsn, status: 'error', error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seeding Complete. Processed ${processed} / ${JARO_SCHOOLS.length}`,
            results
        });
    } catch (error: any) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
