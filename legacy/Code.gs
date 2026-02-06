/**
 * Si-PANDU SD - Backend Logic
 */

// --- CONFIGURATION ---
const SHEET_ID = ''; // Leave empty if attached to the sheet, otherwise put ID here.
const SHEET_NAMES = {
  SCHOOLS: 'Sekolah',
  REPORTS: 'Laporan',
  ADMIN: 'Admin'
};

// --- SERVING HTML ---
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Si-PANDU SD')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- HELPER FUNCTIONS ---
function _getDb() {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return ss;
}

function _getData(sheetName) {
  const ss = _getDb();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only header or empty
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function _appendData(sheetName, rowData) {
  const ss = _getDb();
  let sheet = ss.getSheetByName(sheetName);
  
  // Create sheet and header if not exists (for fresh setup)
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === SHEET_NAMES.SCHOOLS) {
      sheet.appendRow(['id', 'npsn', 'password', 'name', 'address']);
    } else if (sheetName === SHEET_NAMES.REPORTS) {
      sheet.appendRow(['id', 'npsn', 'school_name', 'month', 'year', 'type', 'link', 'status', 'date', 'notes']);
    } else if (sheetName === SHEET_NAMES.ADMIN) {
      sheet.appendRow(['username', 'password', 'name']);
      // Add default admin if newly created
      sheet.appendRow(['admin', 'admin123', 'Super Admin']); 
    }
  }

  // Map object to array based on header
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowArray = headers.map(header => rowData[header] || '');
  sheet.appendRow(rowArray);
  return _getData(sheetName); // Return updated data
}

function _updateRow(sheetName, id, updates) {
  const ss = _getDb();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find row index (1-based for getRange)
  // Assuming 'id' is in the first column (index 0 of row array)
  // But strictly we should check header 'id'
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) throw new Error('ID column not found');

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) throw new Error('Item not found');

  // Apply updates
  Object.keys(updates).forEach(key => {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
    }
  });

  return _getData(sheetName);
}

function _deleteRow(sheetName, id) {
  const ss = _getDb();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return _getData(sheetName);
    }
  }
  return _getData(sheetName);
}


// --- PUBLIC API (google.script.run) ---

/**
 * Get all initial data required for the app
 */
function getInitialData() {
  // Ensure "Admin" sheet exists to prevent errors on first run
  const ss = _getDb();
  if(!ss.getSheetByName(SHEET_NAMES.ADMIN)) {
    _appendData(SHEET_NAMES.ADMIN, {}); 
  }

  return {
    schools: _getData(SHEET_NAMES.SCHOOLS),
    reports: _getData(SHEET_NAMES.REPORTS),
    admins: _getData(SHEET_NAMES.ADMIN)
  };
}

/**
 * Submit a new report
 */
function submitReport(reportData) {
  const newReport = {
    ...reportData,
    id: new Date().getTime().toString(),
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  const updatedReports = _appendData(SHEET_NAMES.REPORTS, newReport);
  return { reports: updatedReports };
}

/**
 * Update report status (Admin Verify)
 */
function updateReportStatus(id, status, notes) {
  const updates = { status: status };
  if (notes !== undefined) updates.notes = notes;
  
  const updatedReports = _updateRow(SHEET_NAMES.REPORTS, id, updates);
  return { reports: updatedReports };
}

/**
 * Save School Data (Create or Update)
 */
function saveSchoolData(schoolData) {
  if (schoolData.id) {
    // Update
    const updatedSchools = _updateRow(SHEET_NAMES.SCHOOLS, schoolData.id, schoolData);
    return { schools: updatedSchools };
  } else {
    // Create
    const newSchool = {
      ...schoolData,
      id: new Date().getTime().toString(),
      password: 'admin' // Default password
    };
    const updatedSchools = _appendData(SHEET_NAMES.SCHOOLS, newSchool);
    return { schools: updatedSchools };
  }
}

/**
 * Delete School
 */
function deleteSchool(id) {
  const updatedSchools = _deleteRow(SHEET_NAMES.SCHOOLS, id);
  return { schools: updatedSchools };
}

/**
 * Reset School Password
 */
function resetSchoolPassword(id) {
  const updatedSchools = _updateRow(SHEET_NAMES.SCHOOLS, id, { password: 'admin' });
  return { schools: updatedSchools };
}

/**
 * Change Password (for both Admin and School)
 * userType: 'admin' | 'school'
 * username: npsn (for school) or username (for admin)
 */
function changePassword(userType, id, newPassword) {
  const sheetName = userType === 'admin' ? SHEET_NAMES.ADMIN : SHEET_NAMES.SCHOOLS;
  // For Admin the ID might be tricky if we don't have a unique ID column, assume username is unique or use row index
  // However, simple approach: look up by ID passed from frontend (for schools) or username (for admin)
  
  // Note: The Admin sheet structure was defined as username, password, name. No ID. 
  // Let's assume for Admin we find by 'username'.
  
  if (userType === 'admin') {
      // Custom update for Admin since it might not have 'id'
      const ss = _getDb();
      const sheet = ss.getSheetByName(sheetName);
      const data = sheet.getDataRange().getValues();
      // data[0] is header, assume col 0 is username
      for(let i=1; i<data.length; i++) {
          if (String(data[i][0]) === String(id)) { // id treated as username here
               sheet.getRange(i+1, 2).setValue(newPassword); // Col B is password
               break;
          }
      }
      return { admins: _getData(SHEET_NAMES.ADMIN) };

  } else {
      const updatedData = _updateRow(sheetName, id, { password: newPassword });
      return { schools: updatedData };
  }
}
