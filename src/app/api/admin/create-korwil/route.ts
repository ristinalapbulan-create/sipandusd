import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Verify Admin Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const decodedToken = await adminAuth.verifyIdToken(token);
        const requesterUid = decodedToken.uid;

        // 2. Check Admin Role
        const requesterDoc = await adminDb.collection('users').doc(requesterUid).get();
        const requesterData = requesterDoc.data();

        if (!requesterDoc.exists || requesterData?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        // 3. Extract Data
        const { email, password, name, kecamatan } = await request.json();

        if (!email || !password || !name || !kecamatan || kecamatan.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let userRecord;
        try {
            // Check if user with email already exists
            userRecord = await adminAuth.getUserByEmail(email);
            // If exists, update password
            userRecord = await adminAuth.updateUser(userRecord.uid, { password });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Create new generic Auth User
                userRecord = await adminAuth.createUser({
                    email: email,
                    password: password,
                    displayName: name
                });
            } else {
                throw error;
            }
        }

        const targetUid = userRecord.uid;
        const timestamp = new Date().toISOString();

        // 4. Update Firestore User Doc
        const userData = {
            email: email,
            name: name,
            role: 'korwil',
            kecamatan: kecamatan,
            updatedAt: timestamp
        };

        const userRef = adminDb.collection('users').doc(targetUid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            (userData as any).createdAt = timestamp;
        }

        await userRef.set(userData, { merge: true });

        return NextResponse.json({
            success: true,
            message: `Akun Korwil berhasil dibuat.`,
            uid: targetUid
        });

    } catch (error: any) {
        console.error("Create Korwil API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
