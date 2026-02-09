/**
 * SI-PANDU SD Backend (Google Apps Script)
 * 
 * setupDatabase() - Run this first to create sheets and columns
 * doGet() - Handles GET requests (fetch data)
 * doPost() - Handles POST requests (create/update/delete)
 */

const SHEET_NAMES = {
    SCHOOLS: 'Schools',
    REPORTS: 'Reports',
    ADMINS: 'Admins'
};

const SCHEMAS = {
    [SHEET_NAMES.SCHOOLS]: [
        'id', 'npsn', 'password', 'name', 'address', 'kecamatan', 'phoneNumber', 'photoUrl'
    ],
    [SHEET_NAMES.REPORTS]: [
        'id', 'npsn', 'school_name', 'month', 'year', 'type', 'link', 'status', 'date', 'notes'
    ],
    [SHEET_NAMES.ADMINS]: [
        'username', 'password', 'name', 'photoUrl'
    ]
};

/**
 * SETUP DATABASE (Run Once)
 */
function setupDatabase() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Create Sheets and Set Headers
    Object.keys(SHEET_NAMES).forEach(key => {
        const sheetName = SHEET_NAMES[key];
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
        }

        // Set Header Row if empty
        const headers = SCHEMAS[sheetName];
        const range = sheet.getRange(1, 1, 1, headers.length);
        if (range.isBlank()) {
            range.setValues([headers]);
            range.setFontWeight('bold');
            range.setBackground('#e2e8f0'); // Slate-200ish
            sheet.setFrozenRows(1);
        }
    });

    // 2. Setup Default Admin if not exists
    const adminSheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
    if (adminSheet.getLastRow() <= 1) {
        adminSheet.appendRow(['admin', 'admin123', 'Admin Dinas', '']);
    }
}

/**
 * API HANDLERS
 */
function doGet(e) {
    const action = e.parameter.action;

    try {
        if (action === 'getInitialData') {
            return jsonResponse(getInitialData());
        }

        return jsonResponse({ success: false, message: 'Invalid action' });
    } catch (err) {
        return jsonResponse({ success: false, error: err.toString() });
    }
}

function doPost(e) {
    // Handle POST (Create, Update, Delete)
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        if (action === 'updateProfile') return updateProfile(data);
        if (action === 'changePassword') return changePassword(data);
        if (action === 'submitReport') return submitReport(data);
        if (action === 'saveSchoolData') return saveSchoolData(data);
        if (action === 'deleteSchool') return deleteSchool(data);
        if (action === 'resetSchoolPassword') return resetSchoolPassword(data);
        if (action === 'updateReportStatus') return updateReportStatus(data);

        return jsonResponse({ success: false, message: 'Invalid action' });
    } catch (err) {
        return jsonResponse({ success: false, error: err.toString() });
    }
}

/**
 * ACTIONS
 */
function submitReport(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.REPORTS);
    const id = Date.now().toString();
    const row = [
        id, data.npsn, data.school_name, data.month, data.year,
        data.type, data.link, 'pending', new Date().toISOString().split('T')[0], ''
    ];
    sheet.appendRow(row);
    return jsonResponse({ success: true, reports: getInitialData().reports });
}

function saveSchoolData(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SCHOOLS);

    if (data.id) {
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0];
        const idIdx = headers.indexOf('id');

        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][idIdx]) === String(data.id)) {
                Object.keys(data).forEach(key => {
                    const colIdx = headers.indexOf(key);
                    if (colIdx !== -1) sheet.getRange(i + 1, colIdx + 1).setValue(data[key]);
                });
                return jsonResponse({ success: true, schools: getInitialData().schools });
            }
        }
    } else {
        const id = Date.now().toString();
        const row = [
            id, data.npsn, 'admin', data.name, data.address,
            data.kecamatan, data.phoneNumber || '', ''
        ];
        sheet.appendRow(row);
        return jsonResponse({ success: true, schools: getInitialData().schools });
    }
    return jsonResponse({ success: false });
}

function deleteSchool(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SCHOOLS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('id');

    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(data.id)) {
            sheet.deleteRow(i + 1);
            return jsonResponse({ success: true, schools: getInitialData().schools });
        }
    }
    return jsonResponse({ success: false });
}

function resetSchoolPassword(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SCHOOLS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('id');
    const passIdx = headers.indexOf('password');

    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(data.id)) {
            sheet.getRange(i + 1, passIdx + 1).setValue('admin');
            return jsonResponse({ success: true, schools: getInitialData().schools });
        }
    }
    return jsonResponse({ success: false });
}

function updateReportStatus(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.REPORTS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.indexOf('id');
    const statusIdx = headers.indexOf('status');
    const notesIdx = headers.indexOf('notes');

    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(data.id)) {
            sheet.getRange(i + 1, statusIdx + 1).setValue(data.status);
            if (data.notes) sheet.getRange(i + 1, notesIdx + 1).setValue(data.notes);
            return jsonResponse({ success: true, reports: getInitialData().reports });
        }
    }
    return jsonResponse({ success: false });
}


/**
 * HELPER FUNCTIONS
 */
function getInitialData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const schools = getSheetData(ss.getSheetByName(SHEET_NAMES.SCHOOLS));
    const reports = getSheetData(ss.getSheetByName(SHEET_NAMES.REPORTS));
    const admins = getSheetData(ss.getSheetByName(SHEET_NAMES.ADMINS)).map(a => {
        // Hide password for admins in list (though frontend shouldn't see it really, but strictly speaking)
        const { password, ...rest } = a;
        return rest;
    });

    return { schools, reports, admins };
}

function updateProfile(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const { role, id, data } = payload; // id is username for admin, id for school

    if (role === 'admin') {
        const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0];
        const usernameIdx = headers.indexOf('username');

        // Find admin by username (id)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][usernameIdx] === id) {
                // Update fields
                Object.keys(data).forEach(key => {
                    const colIdx = headers.indexOf(key);
                    if (colIdx !== -1) {
                        sheet.getRange(i + 1, colIdx + 1).setValue(data[key]);
                    }
                });
                return jsonResponse({ success: true });
            }
        }
    } else if (role === 'school') {
        const sheet = ss.getSheetByName(SHEET_NAMES.SCHOOLS);
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0];
        const idIdx = headers.indexOf('id');

        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][idIdx]) === String(id)) {
                Object.keys(data).forEach(key => {
                    const colIdx = headers.indexOf(key);
                    if (colIdx !== -1) {
                        sheet.getRange(i + 1, colIdx + 1).setValue(data[key]);
                    }
                });
                return jsonResponse({ success: true });
            }
        }
    }
    return jsonResponse({ success: false, message: 'User not found' });
}

function changePassword(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const { role, id, newPassword } = payload;

    if (role === 'admin') {
        const sheet = ss.getSheetByName(SHEET_NAMES.ADMINS);
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0];
        const usernameIdx = headers.indexOf('username');
        const passwordIdx = headers.indexOf('password');

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][usernameIdx] === id) {
                sheet.getRange(i + 1, passwordIdx + 1).setValue(newPassword);
                return jsonResponse({ success: true });
            }
        }
    } else if (role === 'school') {
        const sheet = ss.getSheetByName(SHEET_NAMES.SCHOOLS);
        const rows = sheet.getDataRange().getValues();
        const headers = rows[0];
        const idIdx = headers.indexOf('id');
        const passwordIdx = headers.indexOf('password');

        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][idIdx]) === String(id)) {
                sheet.getRange(i + 1, passwordIdx + 1).setValue(newPassword);
                return jsonResponse({ success: true });
            }
        }
    }
    return jsonResponse({ success: false });
}

// Helper to safely get data
function getSheetData(sheet) {
    if (!sheet) return [];
    const range = sheet.getDataRange();
    if (range.isBlank()) return [];

    const rows = range.getValues();
    if (rows.length < 2) return []; // Only header or empty

    // Trim headers to avoid ' school_name ' issues
    const headers = rows[0].map(h => String(h).trim());

    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            // Only map strict columns we expect, or just all
            if (header) obj[header] = row[index];
        });
        return obj;
    });
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
