import { Report, SchoolData, UserRole } from "./types";

const isLocal = process.env.NODE_ENV === 'development';

// Mock Data
let mockSchools: SchoolData[] = [
    { id: '1', npsn: '10001', password: 'admin', name: 'SDN 1 Tanjung', address: 'Jl. Basuki Rahmat No. 12', kecamatan: 'Kec. Tanjung', phoneNumber: '081234567890' },
    { id: '2', npsn: '10002', password: 'admin', name: 'SDN 2 Mabuun', address: 'Jl. Jendral Sudirman Km 10', kecamatan: 'Kec. Murung Pudak', phoneNumber: '082198765432' }
];

let mockReports: Report[] = [
    { id: '101', npsn: '10001', school_name: 'SDN 1 Tanjung', month: 'Januari', year: '2025', type: 'Laporan Bulanan', link: 'http://drive.google.com', status: 'approved', date: '2025-01-28', notes: '' },
    { id: '102', npsn: '10002', school_name: 'SDN 2 Mabuun', month: 'Januari', year: '2025', type: 'Laporan Bulanan', link: 'http://drive.google.com', status: 'pending', date: '2025-01-29', notes: '' }
];

// Placeholder for GAS Web App URL
const GAS_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const api = {
    getInitialData: async () => {
        if (isLocal) {
            // Return shallow copy
            return { schools: [...mockSchools], reports: [...mockReports], admins: [{ username: 'admin', name: 'Super Admin' }] };
        }
        // Implement fetch to GAS
        // return fetch(`${GAS_API_URL}?action=getInitialData`).then(res => res.json());
        // For now we assume fetch is not ready until user provides URL
        return { schools: [], reports: [], admins: [] };
    },

    login: async (username: string, password: string, type: UserRole) => {
        if (isLocal) {
            await new Promise(r => setTimeout(r, 500)); // Simulate delay
            if (type === 'admin') {
                if (username === 'admin' && password === 'admin123') {
                    return { success: true, user: { role: 'admin', data: { username: 'admin', name: 'Super Admin' } } };
                }
            } else {
                const school = mockSchools.find(s => s.npsn === username && s.password === password);
                if (school) {
                    return { success: true, user: { role: 'school', data: school } };
                }
            }
        }
        // TODO: Fetch login
        return { success: false };
    },

    submitReport: async (data: Partial<Report>) => {
        if (isLocal) {
            const newReport = {
                ...data,
                id: Date.now().toString(),
                status: 'pending' as const,
                date: new Date().toISOString().split('T')[0],
                notes: ''
            } as Report;
            mockReports = [...mockReports, newReport];
            return { reports: mockReports };
        }
        // Fetch
        return { reports: [] };
    },

    updateReportStatus: async (id: string, status: string, notes?: string) => {
        if (isLocal) {
            const idx = mockReports.findIndex(r => r.id === id);
            if (idx !== -1) {
                mockReports[idx] = { ...mockReports[idx], status: status as any, notes: notes || mockReports[idx].notes };
            }
            return { reports: [...mockReports] };
        }
        return { reports: [] };
    },

    updateReport: async (id: string, data: Partial<Report>) => {
        if (isLocal) {
            const idx = mockReports.findIndex(r => r.id === id);
            if (idx !== -1) {
                // If editing a rejected report, typically we reset status to pending so admin can review again
                // Or we let the UI decide. Let's assume we update data.
                // If status is not provided in data, we might want to default to pending if it was rejected?
                // For now, let's just update fields. The UI should pass status: 'pending' if it's a resubmission.
                mockReports[idx] = { ...mockReports[idx], ...data };
            }
            return { reports: [...mockReports] };
        }
        return { reports: [] };
    },

    saveSchoolData: async (data: Partial<SchoolData>) => {
        if (isLocal) {
            if (data.id) {
                const idx = mockSchools.findIndex(s => s.id === data.id);
                if (idx !== -1) mockSchools[idx] = { ...mockSchools[idx], ...data } as SchoolData;
            } else {
                const newSchool = { ...data, id: Date.now().toString(), password: 'admin' } as SchoolData;
                mockSchools = [...mockSchools, newSchool];
            }
            return { schools: [...mockSchools] };
        }
        return { schools: [] };
    },

    deleteSchool: async (id: string) => {
        if (isLocal) {
            mockSchools = mockSchools.filter(s => s.id !== id);
            return { schools: [...mockSchools] };
        }
        return { schools: [] };
    },

    resetSchoolPassword: async (id: string) => {
        if (isLocal) {
            const idx = mockSchools.findIndex(s => s.id === id);
            if (idx !== -1) mockSchools[idx].password = 'admin';
            return { schools: [...mockSchools] };
        }
        return { schools: [] };
    },

    changePassword: async (userType: UserRole, id: string, newPassword: string) => {
        if (isLocal) {
            return { success: true };
        }
        return { success: false };
    },

    updateProfile: async (id: string, data: Partial<SchoolData>) => {
        if (isLocal) {
            const idx = mockSchools.findIndex(s => s.id === id);
            if (idx !== -1) {
                mockSchools[idx] = { ...mockSchools[idx], ...data };
                return { success: true, user: { role: 'school', data: mockSchools[idx] } };
            }
        }
        return { success: false };
    }
};
