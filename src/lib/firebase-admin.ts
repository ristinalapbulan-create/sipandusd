import "server-only";
import admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
        }

        // Parse the JSON string
        // Note: If standard nextjs load env handling behaves well, newlines might be escaped. 
        // JSON.parse might need unescaping if it comes as string with literals?
        // Usually storing as single line JSON string is safest. 
        const serviceAccount = JSON.parse(serviceAccountKey);

        // Handle private key newlines if they were escaped
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log(`Attempting to init Firebase Admin with project: ${serviceAccount.project_id}`);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Firebase Admin Init Error:", error);
        // Throwing here to prevent usage of uninitialized app
        throw new Error("Failed to initialize Firebase Admin");
    }
}

// Lazy getters to ensure init runs first
export const getAdminAuth = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.auth();
};

export const getAdminDb = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.firestore();
};
