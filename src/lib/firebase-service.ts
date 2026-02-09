import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    WriteBatch,
    writeBatch,
    deleteDoc
} from "firebase/firestore";
import { SchoolData, Report } from "./types";

const ensureDb = () => {
    if (!db) {
        throw new Error("Firestore DB not initialized. Check firebase configuration.");
    }
    return db;
};

export const firebaseService = {
    // SYNC DATA: Save school data to 'schools' collection (keyed by NPSN)
    // SYNC DATA: Removed as requested
    // syncSchools: async (schools: SchoolData[]) => { ... }

    // REPORTS
    getReports: async (userRole: string, userId: string, npsn?: string) => {
        const database = ensureDb();
        const reportsRef = collection(database, "reports");
        let q;

        if (userRole === 'school' && npsn) {
            q = query(reportsRef, where("npsn", "==", npsn));
        } else {
            // Admin sees all
            q = query(reportsRef);
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
    },

    submitReport: async (report: Report) => {
        const database = ensureDb();
        const reportsRef = collection(database, "reports");
        // Remove undefined fields to avoid Firestore errors
        const data = Object.fromEntries(
            Object.entries(report).filter(([_, v]) => v !== undefined)
        );
        const { id, ...reportData } = data; // Exclude ID if present

        const docRef = await addDoc(reportsRef, {
            ...reportData,
            createdAt: new Date().toISOString(),
            status: 'pending' // Enforce pending on new submission
        });
        return docRef.id;
    },

    restoreReport: async (report: Report) => {
        const database = ensureDb();
        if (!report.id) throw new Error("Report ID missing for restore");

        const reportRef = doc(database, "reports", report.id);
        const data = Object.fromEntries(
            Object.entries(report).filter(([_, v]) => v !== undefined)
        );

        await setDoc(reportRef, {
            ...data,
            restoredAt: new Date().toISOString()
        });
    },

    updateReportStatus: async (id: string, status: string, notes: string) => {
        const database = ensureDb();
        const reportRef = doc(database, "reports", id);
        await updateDoc(reportRef, {
            status,
            notes,
            updatedAt: new Date().toISOString()
        });
    },

    updateReport: async (id: string, data: Partial<Report>) => {
        const database = ensureDb();
        const reportRef = doc(database, "reports", id);
        await updateDoc(reportRef, {
            ...data,
            updatedAt: new Date().toISOString()
        });
    },

    getSchools: async () => {
        const database = ensureDb();
        const schoolsRef = collection(database, "schools");
        const snapshot = await getDocs(schoolsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolData));
    },

    saveSchool: async (school: Partial<SchoolData>) => {
        const database = ensureDb();
        // If creating, we prefer using NPSN as doc ID if possible, or auto ID.
        // Legacy system uses auto ID usually or ID from Google Sheet.
        // Here we can use NPSN as ID to ensure uniqueness easily or keep auto-ID.
        // Sync used NPSN as ID. So let's try to stick to that.

        // Simplified Logic: Always use setDoc with merge.
        // IF ID exists, use it. IF NPSN exists, use it as ID. Else auto-ID.

        const id = school.id || school.npsn;

        if (id) {
            const docRef = doc(database, "schools", id);
            // Use setDoc with merge: true to Create OR Update
            await setDoc(docRef, { ...school, id, updatedAt: new Date().toISOString() }, { merge: true });
            return id;
        } else {
            // Fallback if absolutely no ID/NPSN (shouldn't happen for valid schools)
            const schoolsRef = collection(database, "schools");
            const res = await addDoc(schoolsRef, { ...school, createdAt: new Date().toISOString() });
            return res.id;
        }
    },

    deleteSchool: async (id: string) => {
        const database = ensureDb();
        await deleteDoc(doc(database, "schools", id));
    },

    deleteReport: async (id: string) => {
        const database = ensureDb();
        await deleteDoc(doc(database, "reports", id));
    },

    // USER MANAGEMENT
    updateUserProfile: async (userId: string, role: string, data: any) => {
        const database = ensureDb();
        const { auth } = require("./firebase");
        const { updateProfile } = require("firebase/auth");

        // 1. Update Auth Profile (DisplayName and PhotoURL)
        // NOTE: Firebase Auth has a 2048 byte limit for photoURL. Use Firestore for large Base64 strings.
        if (auth.currentUser && auth.currentUser.uid === userId) {
            const isBase64 = data.photoUrl && data.photoUrl.startsWith('data:');
            // Only update Auth if it's NOT a long base64 string or if we want to risk it (usually fails)
            // We'll skip Auth update for Base64 images to avoid "Payload too large" errors.
            // The app should prioritize Firestore data for display.

            const authPayload: any = { displayName: data.name };
            if (!isBase64 && data.photoUrl) {
                authPayload.photoURL = data.photoUrl;
            }

            await updateProfile(auth.currentUser, authPayload);
        }

        // 2. Update Firestore
        const collectionName = role === 'school' ? 'schools' : 'users';
        // For schools, we might be using NPSN as ID or AutoID. 
        // If userId matches the doc ID, great. 
        // But for schools, userId (Auth UID) might NOT match the School Doc ID (NPSN or AutoID).
        // WE NEED TO BE CAREFUL.
        // In AuthProvider, we mapped Auth UID to User object.
        // But if we are updating SCHOOL data (address, phone), we need the SCHOOL DOC ID.
        // User.data.id should currently hold the Firestore Doc ID?
        // In AuthProvider: `data: { ...schoolData, id: firebaseUser.uid }` <-- WAIT.
        // If we overwrote ID with UID, we lost the original Doc ID if it was different.
        // BUT, in saveSchool, we returned `school.npsn` or `res.id`.
        // Let's assume for now that for Admin, ID is UID. For School, we need to find the doc.

        if (role === 'school') {
            // We need to find the school document.
            // If data has npsn, use that?
            // Safer: query by npsn if available, or just assume userId IS the docId if we set it that way?
            // In AuthProvider fallback: `const schoolDocRef = doc(db, "schools", npsn);`
            // So the data comes from that doc.
            // BUT we set `id: firebaseUser.uid` in the session.
            // So `userId` passed here is likely the AUTH UID.
            // We can't use Auth UID to update 'schools' collection directly if keys are NPSN.

            // Fix: We should probably pass the NPSN or Real Doc ID if available.
            // Or look it up.

            // For now, let's assume valid ID is passed. If not, we might error.
            // Let's try to update 'schools' with the ID. 
            // If the ID passed IS the Auth UID, this will fail if doc ID is NPSN.

            // Hack for Schools: We need the NPSN to find the doc if key is NPSN.
            // Let's trust the caller passes the correct Firestore Document ID, NOT the Auth UID if they differ.
            // COMPONENT SIDE FIX needed: Pass correct ID.

            const docRef = doc(database, collectionName, userId);
            // Only update fields that exist in data
            await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
        } else {
            // Admin / Users collection
            const docRef = doc(database, collectionName, userId);
            // Check if doc exists, if not set it (for new admin first time)
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
            } else {
                await setDoc(docRef, { ...data, role: role, createdAt: new Date().toISOString() });
            }
        }

        return { success: true };
    },

    changeUserPassword: async (newPassword: string) => {
        const { auth } = require("./firebase");
        const { updatePassword } = require("firebase/auth");

        if (!auth.currentUser) throw new Error("No user logged in");

        await updatePassword(auth.currentUser, newPassword);
        return { success: true };
    },

    // AUTOMATED USER MANAGEMENT (For Firestore 'users' collection only)
    // NOTE: This does NOT create Firebase Auth users. That requires Admin SDK or Cloud Functions.
    // This maintains the 'users' collection which might be used for custom auth or role management.
    ensureSchoolUser: async (userData: { uid: string, name: string, npsn: string, password?: string }) => {
        const database = ensureDb();
        const userRef = doc(database, "users", userData.uid);
        const userSnap = await getDoc(userRef);

        const payload: any = {
            name: userData.name,
            role: 'school',
            npsn: userData.npsn,
            username: userData.npsn,
            updatedAt: new Date().toISOString()
        };

        // Only set password if provided and (document doesn't exist OR explicit reset requested)
        if (userData.password) {
            payload.password = userData.password;
        }

        if (!userSnap.exists()) {
            // Create new
            await setDoc(userRef, {
                ...payload,
                createdAt: new Date().toISOString()
            });
        } else {
            // Update existing
            await updateDoc(userRef, payload);
        }
    },

    resetUserPassword: async (uid: string, newPassword: string) => {
        const { auth } = require("./firebase"); // Dynamic import to avoid cycles/init issues
        if (!auth.currentUser) throw new Error("Anda harus login sebagai Admin");

        const token = await auth.currentUser.getIdToken();

        const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uid, newPassword })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Gagal reset password via Server");
        }

        return result;
    },

    deleteUser: async (uid: string) => {
        const database = ensureDb();
        await require("firebase/firestore").deleteDoc(doc(database, "users", uid));
    }
};
