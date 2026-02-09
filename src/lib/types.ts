export type UserRole = 'admin' | 'school';

export interface User {
    role: UserRole;
    data: UserData | SchoolData;
}

export interface UserData {
    id?: string;
    username: string;
    name: string;
    photoUrl?: string;
}

export interface SchoolData {
    id: string;
    npsn: string;
    password?: string; // Should be handled carefully
    name: string;
    address: string;
    kecamatan: string;
    phoneNumber?: string;
    photoUrl?: string;
}

export interface Report {
    id: string;
    npsn: string;
    school_name: string;
    month: string;
    year: string;
    type: string;
    link: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
    notes: string;
}

export interface AdminData extends UserData {
    // specific admin fields
}
