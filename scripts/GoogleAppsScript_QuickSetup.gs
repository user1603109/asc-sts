/**
 * =========================================================================
 * APAYAO STATE COLLEGE - AUTOMATED SCORING & TABULATION SYSTEM (ASC-STS)
 * Google Apps Script: Quick Database Initializer
 * =========================================================================
 * 
 * HOW TO USE:
 * 1. Open your Google Spreadsheet in your browser.
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Delete any code in the editor, paste this entire script, and click "Run" (initializeDatabase).
 * 4. All 13 relational tables and seed data will be created instantly!
 */

function initializeDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    system_settings: ['id', 'setting_key', 'setting_value'],
    users: ['id', 'username', 'password', 'full_name', 'role', 'approval_status'],
    event_types: ['id', 'type_name'],
    courses: ['id', 'course_name'],
    departments: ['id', 'department_name', 'department_code'],
    organizers: ['id', 'organizer_name'],
    events: ['id', 'name', 'description', 'type', 'participation_mode', 'department', 'organizer', 'academic_year', 'start_date', 'end_date', 'status'],
    event_judges: ['id', 'event_id', 'user_id'],
    candidates: ['id', 'event_id', 'name', 'image_path', 'course_id', 'year_level', 'order_number', 'registry_id'],
    event_portions: ['id', 'event_id', 'portion_name', 'percentage', 'order_number', 'status'],
    criteria: ['id', 'event_id', 'portion_id', 'name', 'max_score', 'percentage'],
    scores: ['id', 'event_id', 'judge_id', 'candidate_id', 'criteria_id', 'score'],
    participants_registry: ['id', 'name', 'course_id', 'year_level', 'image_path']
  };

  const seedData = {
    system_settings: [
      [1, 'system_name', 'Automated Scoring & Tabulation System'],
      [2, 'organization', 'Apayao State College'],
      [3, 'academic_year', '2025-2026']
    ],
    users: [
      [1, 'admin', 'adminpassword123', 'ASC Administrator', 'admin', 'approved']
    ],
    event_types: [
      [1, 'Pageant'],
      [2, 'Cultural'],
      [3, 'Academic'],
      [4, 'Sports'],
      [5, 'Literary']
    ],
    courses: [
      [1, 'Bachelor of Secondary Education'],
      [2, 'Bachelor of Elementary Education'],
      [3, 'Bachelor in Information Technology'],
      [4, 'Bachelor in Industrial Technology'],
      [5, 'Bachelor of Technical Teacher Education'],
      [6, 'Bachelor of Science in Civil Engineering'],
      [7, 'Bachelor of Science in Hotel & Restaurant Mgmt.'],
      [8, 'Bachelor of Science in Agriculture'],
      [9, 'Bachelor of Science in Business Administration'],
      [10, 'Bachelor of Science in Tourism'],
      [11, 'Bachelor of Science in Criminology']
    ],
    departments: [
      [1, 'Bachelor of Secondary Education', 'BSED'],
      [2, 'Bachelor of Elementary Education', 'BEED'],
      [3, 'Bachelor in Information Technology', 'BSIT'],
      [4, 'Bachelor in Industrial Technology', 'BINDT'],
      [5, 'Bachelor of Technical Teacher Education', 'BTTE'],
      [6, 'Bachelor of Science in Civil Engineering', 'BSCE'],
      [7, 'Bachelor of Science in Hotel & Restaurant Mgmt.', 'BSHRM'],
      [8, 'Bachelor of Science in Agriculture', 'BSA'],
      [9, 'Bachelor of Science in Business Administration', 'BSBA'],
      [10, 'Bachelor of Science in Tourism', 'BST'],
      [11, 'Bachelor of Science in Criminology', 'BSCrim']
    ],
    organizers: [
      [1, 'ASC Supreme Student Council'],
      [2, 'ASC Sports & Cultural Affairs']
    ]
  };

  for (const [tabName, columns] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      
      // Add and format headers
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      const headerRange = sheet.getRange(1, 1, 1, columns.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0A192F'); // ASC Navy
      headerRange.setFontColor('#FFBF00'); // ASC Amber
      
      // Add Seed Data if any
      if (seedData[tabName] && seedData[tabName].length > 0) {
        const rows = seedData[tabName];
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      Logger.log('Created and formatted tab: ' + tabName);
    } else {
      Logger.log('Tab already exists: ' + tabName);
    }
  }

  // Remove default "Sheet1" if empty and other sheets exist
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }

  SpreadsheetApp.getUi().alert('Success! All 13 ASC-STS database tables have been set up in this Google Sheet.');
}
