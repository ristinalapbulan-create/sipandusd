
import { NextResponse } from 'next/server';
import { firebaseService } from '@/lib/firebase-service';
import { MUARA_UYA_SCHOOLS } from '@/lib/seeding-data';

export async function GET() {
    try {
        console.log("Starting Seeding Process for Muara Uya...");
        let processed = 0;

        // Parallel execution for speed? No, sequential to be safe with rate limits or race conditions
        const results = [];

        for (const s of MUARA_UYA_SCHOOLS) {
            // 1. Save School
            // We use client SDK methods here. Note that on server-side Next.js, 
            // the client SDK might complain if 'window' is missing (Auth persistence), 
            // but Firestore calls usually work if app is initialized.
            // Let's hope `firebase-service` creates a valid instance.

            try {
                await firebaseService.saveSchool({
                    npsn: s.npsn,
                    name: s.name,
                    kecamatan: "Kec. Muara Uya",
                    address: "Kec. Muara Uya", // Default address
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
            message: `Seeding Complete. Processed ${processed} / ${MUARA_UYA_SCHOOLS.length}`,
            results
        });
    } catch (error: any) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
