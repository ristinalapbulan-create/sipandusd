import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        const email = 'admin@disdikbudtabalong.id'; // Hardcoded for safety/specificity

        console.log(`Attempting to fix admin for: ${email}`);

        // 1. Get User by Email
        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                return NextResponse.json({ error: `User ${email} not found in Auth. Please register first.` }, { status: 404 });
            }
            throw e;
        }

        const uid = userRecord.uid;
        console.log(`Found UID: ${uid}`);

        // 2. Force Update Firestore
        await adminDb.collection('users').doc(uid).set({
            email: email,
            role: 'admin',
            name: 'Administrator Dinas', // Default name
            updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`Success! ${email} is now an ADMIN.`);

        return NextResponse.json({
            success: true,
            message: `User ${email} (${uid}) has been promoted to ADMIN. Please try resetting passwords now.`
        });

    } catch (error: any) {
        console.error("Fix Admin API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
