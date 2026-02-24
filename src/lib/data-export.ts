import { firebaseService } from "./firebase-service";
import * as XLSX from 'xlsx';
import { Report, SchoolData } from "./types";

const EXPORT_MONTHS = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
];

export const backupDatabase = async () => {
    try {
        const [reports, schools] = await Promise.all([
            firebaseService.getReports('admin', 'admin'),
            firebaseService.getSchools()
        ]);

        const backupData = {
            timestamp: new Date().toISOString(),
            schools,
            reports
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `backup-sipandu-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, count: { schools: schools.length, reports: reports.length } };
    } catch (error) {
        console.error("Backup failed:", error);
        throw error;
    }
};

export const exportReportsToExcel = (
    reports: Report[],
    schools: SchoolData[],
    month: string,
    year: string,
    role: 'admin' | 'korwil' | 'school' = 'admin',
    wilayahName: string = ''
) => {
    try {
        const displayMonthLabel = month ? (EXPORT_MONTHS.find(m => m.value === month || m.value.padStart(2, '0') === month)?.label || month) : "SEMUA BULAN";
        const displayYear = year || "SEMUA TAHUN";

        // Sort schools by Kecamatan then Name
        const sortedSchools = [...schools].sort((a, b) => {
            if (a.kecamatan === b.kecamatan) {
                return a.name.localeCompare(b.name);
            }
            return a.kecamatan.localeCompare(b.kecamatan);
        });

        // 2. Build Rows (Array of Arrays)
        const wsData: any[][] = [];

        // --- HEADER ---
        wsData.push(["REKAPITULASI LAPORAN BULANAN SEKOLAH"]);

        if (role === 'korwil') {
            wsData.push([`KORWIL ${wilayahName.toUpperCase()}`]);
            wsData.push(["DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. TABALONG"]);
        } else {
            wsData.push(["BIDANG PEMBINAAN SD"]);
            wsData.push(["DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. TABALONG"]);
        }

        wsData.push([""]); // Spacer
        wsData.push(["BULAN", ": " + displayMonthLabel]);
        wsData.push(["TAHUN", ": " + displayYear]);
        wsData.push([""]); // Spacer

        // --- TABLE HEADERS ---
        wsData.push(["No.", "Nama Sekolah", "Kecamatan", "Link Laporan"]);

        // --- DATA ROWS ---
        let currentNo = 1;

        sortedSchools.forEach(school => {
            // Find report for this school matching criteria
            // If month/year filters are active, we check them.
            // If month is empty, do we pick the LATEST? or All?
            // "Link Laporan" column implies one link. 
            // If multiple reports exist (e.g. all months), this format breaks.
            // Assuming this export is used typically for a specific period.
            // If "All Months" selected, we might list multiple rows or just empty?
            // Let's try to find the report for the specfic month/year if selected.

            let matchedReport: Report | undefined;

            if (month && year) {
                matchedReport = reports.find(r => r.npsn === school.npsn && r.month === month && r.year === year);
            } else if (year) {
                // If only year, maybe latest match?
                matchedReport = reports.find(r => r.npsn === school.npsn && r.year === year);
            } else {
                matchedReport = reports.find(r => r.npsn === school.npsn);
            }

            const link = matchedReport?.link || "-";

            // Should we hyperlink the link? Yes.
            // We'll handle hyperlinks in cell object later if needed, but for simple AOA, text is fine.
            // But for Excel to treat as link, we might need { t:'s', v:..., l:{ Target:... } } logic.
            // For now, simple text string.

            wsData.push([
                currentNo++,
                school.name,
                school.kecamatan,
                link === "-" ? "Belum Lapor" : link // Or just the link? User said "Link Laporan".
            ]);
        });

        // --- FOOTER ---
        wsData.push([""]);
        wsData.push([""]);

        // Date Format: "Tabalong, dd MMMM yyyy"
        const today = new Date();
        const dateStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(today);

        // We need the signature to be on the right side usually, or left?
        // User example:
        // Tabalong , ....
        // Nama Jabatan
        // 
        // Nama.
        // NIP.
        // Usually signature is on the right (last columns). 
        // Let's put it in column 3 (Index 2) or 4 (Index 3).
        // Table has 4 columns (0,1,2,3).

        const signColIndex = 3; // Link column (usually wide) or merged.

        const addFooterRow = (text: string) => {
            const row = new Array(4).fill("");
            row[signColIndex] = text;
            wsData.push(row);
        };

        addFooterRow(`Tabalong, ${dateStr}`);
        addFooterRow("Kepala Bidang Pembinaan SD"); // Placeholder title
        addFooterRow("");
        addFooterRow("");
        addFooterRow(""); // Space for signature
        addFooterRow(".........................................."); // Name Placeholder
        addFooterRow("NIP. ................................."); // NIP Placeholder

        // 3. Create Workbook & Sheet
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // 4. Styling & Merges (Basic)
        // Merge Headers: A1:D1, A2:D2, A3:D3
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Row 1
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Row 2
            { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Row 3
        ];

        // Set column widths
        worksheet['!cols'] = [
            { wch: 5 },  // No
            { wch: 40 }, // Nama Sekolah
            { wch: 25 }, // Kecamatan
            { wch: 50 }, // Link
        ];

        // 5. Generate File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap");

        const filename = `rekap-laporan-${displayMonthLabel}-${displayYear}-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);

        return { success: true };
    } catch (error) {
        console.error("Export Excel failed:", error);
        throw error;
    }
};

export const restoreDatabase = async (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);

        // Basic validation
        if (!data.schools || !Array.isArray(data.schools) || !data.reports || !Array.isArray(data.reports)) {
            throw new Error("Format file backup tidak valid. Harus mengandung 'schools' dan 'reports'.");
        }

        const stats = {
            schools: 0,
            reports: 0,
            errors: 0
        };

        // Restore Schools
        for (const school of data.schools) {
            try {
                // Ensure ID is present (fetch from npsn if missing or use id)
                // saveSchool handles update/create based on ID or NPSN
                await firebaseService.saveSchool(school);
                stats.schools++;
            } catch (e) {
                console.error("Failed to restore school:", school, e);
                stats.errors++;
            }
        }

        // Restore Reports
        for (const report of data.reports) {
            try {
                await firebaseService.restoreReport(report);
                stats.reports++;
            } catch (e) {
                console.error("Failed to restore report:", report, e);
                stats.errors++;
            }
        }

        return { success: true, stats };
    } catch (error) {
        console.error("Restore failed:", error);
        throw error;
    }
};
