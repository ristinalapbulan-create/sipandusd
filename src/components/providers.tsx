"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Toaster } from "sonner";
import { User, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    // Persist auth (optional, simplified for now)
    useEffect(() => {
        const stored = localStorage.getItem("sipandu_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem("sipandu_user");
            }
        }
    }, []);

    const login = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem("sipandu_user", JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("sipandu_user");
        router.push("/");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
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
            <Toaster position="top-right" richColors />
        </AuthProvider>
    );
}
