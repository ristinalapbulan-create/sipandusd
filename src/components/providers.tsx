"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Toaster } from "sonner";
import { User, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => Promise<void> | void;
    logout: () => Promise<void> | void;
    updateUser: (data: Partial<User['data']>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!db) {
            console.error("Firestore DB instance is undefined in AuthProvider. Check /lib/firebase export.");
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
            if (firebaseUser) {
                try {
                    const email = firebaseUser.email || "";
                    let userFound = false;

                    // OPTIMIZATION: Check 'schools' first if email looks like NPSN@sipandu.com
                    const isSchoolEmail = email.endsWith("@sipandu.com") && /^\d+@/.test(email);

                    if (isSchoolEmail) {
                        try {
                            const npsn = email.split("@")[0];
                            const schoolDocRef = doc(db, "schools", npsn);
                            // Fast timeout for school check
                            const schoolDoc = await Promise.race([
                                getDoc(schoolDocRef),
                                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
                            ]) as any;

                            if (schoolDoc && schoolDoc.exists()) {
                                const schoolData = schoolDoc.data();
                                setUser({
                                    role: 'school',
                                    data: { ...schoolData, id: firebaseUser.uid }
                                } as any);
                                userFound = true;
                            }
                        } catch (e) { console.log("Quick school check failed, trying fallback..."); }
                    }

                    // If not found yet (or not school email), check 'users' collection (Admins/Others)
                    if (!userFound) {
                        const userDocRef = doc(db, "users", firebaseUser.uid);
                        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));

                        try {
                            const userDoc = await Promise.race([getDoc(userDocRef), timeout]) as any;

                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const isMainAdmin = email === "admin@sipandu.com" || email.startsWith("admin@");

                                setUser({
                                    role: isMainAdmin ? 'admin' : (userData.role || 'school'),
                                    data: { ...userData, id: firebaseUser.uid }
                                } as User);
                                userFound = true;
                            }
                        } catch (e) { console.log("Users check failed or timed out"); }
                    }

                    // Final Fallback if still not found (Just use Auth Data)
                    if (!userFound) {
                        const isMainAdmin = email === "admin@sipandu.com" || email?.startsWith("admin@");
                        setUser({
                            role: isMainAdmin ? 'admin' : 'school',
                            data: {
                                id: firebaseUser.uid,
                                name: firebaseUser.displayName || (isMainAdmin ? 'Administrator' : 'User'),
                                email: email,
                                username: email?.split('@')[0] || 'user'
                            } as any
                        });
                    }

                } catch (error) {
                    console.error("Auth Error:", error);
                    // Critical Error Fallback
                    const isMainAdmin = firebaseUser.email === "admin@sipandu.com";
                    setUser({
                        role: isMainAdmin ? 'admin' : 'school',
                        data: {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email,
                        } as any
                    });
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (newUser: User) => {
        // Login should now be handled by signInWithEmailAndPassword in the login component
        // This function might be deprecated or used to manually set simple state if needed,
        // but for Firebase, state is handled by onAuthStateChanged.
        // For backwards compatibility or manual override:
        setUser(newUser);
    };

    const updateUser = (data: Partial<User['data']>) => {
        if (user) {
            setUser({ ...user, data: { ...user.data, ...data } });
            // TODO: Update Firestore document here
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.push("/");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
        </AuthProvider>
    );
}
