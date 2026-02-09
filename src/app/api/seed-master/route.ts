
import { NextResponse } from 'next/server';
import { firebaseService } from '@/lib/firebase-service';
import { REAL_SCHOOL_DATA } from '@/lib/school-data';

export async function GET() {
    try {
        console.log("Starting MASTER Seeding Process...");
        let processed = 0;
        let errors = 0;
        const results = [];

        const districts = Object.keys(REAL_SCHOOL_DATA);

        for (const kec of districts) {
            const schools = REAL_SCHOOL_DATA[kec];
            console.log(`Processing ${kec} (${schools.length} schools)...`);

            for (const s of schools) {
                try {
                    // 1. Save School
                    await firebaseService.saveSchool({
                        npsn: s.npsn,
                        name: s.name,
                        kecamatan: kec,
                        address: s.address || `Desa di ${kec}`,
                        createdAt: new Date().toISOString()
                    });

                    // 2. Ensure User Account
                    await firebaseService.ensureSchoolUser({
                        uid: s.npsn, // Use NPSN as UID for easier lookup
                        name: s.name,
                        npsn: s.npsn,
                        password: s.npsn // Default pass
                    });

                    processed++;
                } catch (err: any) {
                    console.error(`Error processing ${s.npsn}:`, err);
                    errors++;
                    results.push({ npsn: s.npsn, status: 'error', error: err.message });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Master Seeding Complete. Processed ${processed}, Errors: ${errors}`,
            results
        });
    } catch (error: any) {
        console.error("Master Seeding Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
