import { Report, SchoolData, UserRole } from "./types";

// GAS API URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwM2KsUaH-NUT6M3SMleQbQDVPtikL68NvhCGPjxkv8h3gdKKa3gBPKElwWV12i6IKZPg/exec";

// Shared fetch wrapper
const fetchAPI = async (method: string, data?: any) => {
    try {
        const options: RequestInit = {
            method: method,
        };

        if (method !== 'GET') {
            options.headers = { "Content-Type": "text/plain" };
        }

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const url = method === 'GET'
            ? `${GAS_API_URL}${data ? '?' + new URLSearchParams(data).toString() : ''}`
            : GAS_API_URL;

        const res = await fetch(url, options);
        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        return { success: false, error: e };
    }
};

export const api = {
    getInitialData: async () => {
        const result = await fetchAPI('GET', { action: 'getInitialData' });
        if (result && (result.schools || result.reports)) {
            return result;
        }
        return { schools: [], reports: [], admins: [] };
    },

    login: async (username: string, password: string, type: UserRole) => {
        const data = await api.getInitialData();
        console.log("Login Attempt:", { username, password, type });
        console.log("Fetched Data:", {
            schoolCount: data.schools.length,
            schools: data.schools
        });

        if (type === 'admin') {
            // Fallback for admin using hardcoded credential if API check not implemented yet
            if (username === 'admin' && password === 'admin123') return { success: true, user: { role: 'admin', data: { username: 'admin', name: 'Admin Dinas', photoUrl: '' } } };
            return { success: false };
        } else {
            const school = data.schools.find((s: SchoolData) => String(s.npsn) === String(username) && String(s.password) === String(password));
            console.log("Found School:", school);
            if (school) return { success: true, user: { role: 'school', data: school } };
            return { success: false };
        }
    },

    submitReport: async (data: Partial<Report>) => {
        const res = await fetchAPI('POST', { action: 'submitReport', ...data });
        return { reports: res.reports || [] };
    },

    updateReportStatus: async (id: string, status: string, notes?: string) => {
        const res = await fetchAPI('POST', { action: 'updateReportStatus', id, status, notes });
        return { reports: res.reports || [] };
    },

    updateReport: async (id: string, data: Partial<Report>) => {
        // Not explicitly in GAS yet
        return { reports: [] };
    },

    saveSchoolData: async (data: Partial<SchoolData>) => {
        const res = await fetchAPI('POST', { action: 'saveSchoolData', ...data });
        return { schools: res.schools || [] };
    },

    deleteSchool: async (id: string) => {
        const res = await fetchAPI('POST', { action: 'deleteSchool', id });
        return { schools: res.schools || [] };
    },

    resetSchoolPassword: async (id: string) => {
        const res = await fetchAPI('POST', { action: 'resetSchoolPassword', id });
        return { schools: res.schools || [] };
    },

    changePassword: async (userType: UserRole, id: string, newPassword: string) => {
        const res = await fetchAPI('POST', { action: 'changePassword', role: userType, id, newPassword });
        return { success: res.success };
    },

    updateProfile: async (id: string, data: any) => {
        // Assume 'admin' username means admin role
        const role = id === 'admin' ? 'admin' : 'school';
        const res = await fetchAPI('POST', { action: 'updateProfile', role, id, data });
        return { success: res.success };
    }
};
