
import { NextResponse } from 'next/server';
import { firebaseService } from '@/lib/firebase-service';

const BANUA_LAWAS_SCHOOLS = [
    { name: "SD NEGERI 1 HAPALAH", npsn: "30303194" },
    { name: "SD NEGERI 2 HAPALAH", npsn: "30303195" },
    { name: "SD NEGERI BANGKILING", npsn: "30303067" },
    { name: "SD NEGERI BANUA RANTAU", npsn: "30303068" },
    { name: "SD NEGERI BATANG BANYU", npsn: "30303059" },
    { name: "SD NEGERI HABAU", npsn: "30303191" },
    { name: "SD NEGERI HABAU HULU", npsn: "30303192" },
    { name: "SD NEGERI HARIANG", npsn: "30303196" },
    { name: "SD NEGERI KUALA PERAK", npsn: "30303149" },
    { name: "SD NEGERI PASAR ARBA", npsn: "30302924" },
    { name: "SD NEGERI PEMATANG", npsn: "30302929" },
    { name: "SD NEGERI PURAI", npsn: "30302864" },
    { name: "SD NEGERI SEI HANYAR 2", npsn: "30302897" },
    { name: "SD NEGERI TALAN", npsn: "30302941" },
    { name: "SD NEGERI TELAGA RAYA", npsn: "30302989" }
];

export async function GET() {
    try {
        console.log("Starting Seeding Process for Banua Lawas...");
        let processed = 0;
        const results = [];

        for (const s of BANUA_LAWAS_SCHOOLS) {
            try {
                // 1. Save School
                await firebaseService.saveSchool({
                    npsn: s.npsn,
                    name: s.name,
                    kecamatan: "Kec. Banua Lawas",
                    address: "Kec. Banua Lawas", // Default address
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
            message: `Seeding Complete. Processed ${processed} / ${BANUA_LAWAS_SCHOOLS.length}`,
            results
        });
    } catch (error: any) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
