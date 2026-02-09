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

        // 3. Perform Reset
        const { uid, newPassword } = await request.json();

        if (!uid || !newPassword) {
            return NextResponse.json({ error: 'Missing uid or password' }, { status: 400 });
        }

        const email = `${uid}@sipandu.com`;
        let targetUid = uid;

        // Try to find user by UID first
        try {
            await adminAuth.updateUser(targetUid, { password: newPassword });
            console.log(`Updated password for UID: ${targetUid}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // UID not found. Check if email exists (maybe user has random UID)
                try {
                    const userByEmail = await adminAuth.getUserByEmail(email);
                    targetUid = userByEmail.uid;
                    console.log(`Found user by email: ${email} -> UID: ${targetUid}`);

                    // Update this user's password
                    await adminAuth.updateUser(targetUid, { password: newPassword });
                } catch (emailError: any) {
                    if (emailError.code === 'auth/user-not-found') {
                        // Truly new user. Create with forced UID if possible.
                        console.log(`Creating new user for ${uid}`);
                        try {
                            await adminAuth.createUser({
                                uid: uid,
                                email: email,
                                password: newPassword,
                                displayName: `Sekolah ${uid}`
                            });
                            targetUid = uid;
                        } catch (createError: any) {
                            // Rare race condition or other error
                            console.error("Create user failed:", createError);
                            throw createError;
                        }
                    } else {
                        throw emailError;
                    }
                }
            } else {
                throw error;
            }
        }

        // Update Firestore User Doc
        // We update the doc logic to use targetUid to match the Auth User
        // BUT we also want to ensure the "NPSN" doc exists if targetUid != npsn?
        // Actually, for simplicity, let's update data at targetUid. 
        // Admin likely expects `users/{npsn}` to exist. 
        // If targetUid is random, `users/{random}` will be verified.
        // `users/{npsn}` might be orphaned if we don't fix it.
        // Let's update both if they differ, just to be safe.

        // Fetch School Data to get the name
        const schoolDoc = await adminDb.collection('schools').doc(uid).get();
        const schoolName = schoolDoc.exists ? schoolDoc.data()?.name : `Sekolah ${uid}`;

        const timestamp = new Date().toISOString();

        // Prepare User Data
        const userData: any = {
            password: newPassword,
            username: uid, // username is NPSN
            npsn: uid,
            role: 'school',
            name: schoolName, // Ensure name is synced
            updatedAt: timestamp
        };

        const batch = adminDb.batch();

        // 1. Update Auth UID doc
        const userRef = adminDb.collection('users').doc(targetUid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            userData.createdAt = timestamp; // Add createdAt for new docs
        }

        batch.set(userRef, userData, { merge: true });

        // 2. If targetUid != uid (NPSN) collision case
        if (targetUid !== uid) {
            const npsnRef = adminDb.collection('users').doc(uid);
            // We also want to make sure the NPSN doc has the data
            batch.set(npsnRef, { ...userData, createdAt: timestamp }, { merge: true });
        }

        // 3. Ensure School Data exists (and update seed status if needed?)
        // optional: batch.set(adminDb.collection('schools').doc(uid), { ... }, { merge: true });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Password reset success. Login with NPSN: ${uid}`,
            details: { targetUid, email, name: schoolName }
        });

    } catch (error: any) {
        console.error("Reset Password API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
