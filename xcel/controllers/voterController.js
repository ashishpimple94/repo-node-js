// controllers/voterController.js
import XLSX from 'xlsx';
import VoterData from '../models/VoterData.js';
import fs from 'fs';
import { processVoterName, processGender, isMarathiText } from '../utils/transliteration.js';
import { isVercel, isRender } from '../middleware/upload.js';

// Helper: normalize header keys for robust matching (trim, lowercase, remove dots/punctuations, collapse spaces)
const normalizeKey = (key) =>
  key
    ? String(key)
        .trim()
        .toLowerCase()
        .replace(/[.\u0964:()\-_/]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

// Helper: get value from a row by trying multiple candidate headers (supports normalized exact and partial matches)
const getVal = (row, candidates = []) => {
  if (!row || typeof row !== 'object') return '';

  // First try exact match (case-insensitive, preserve spaces but ignore trailing/leading)
  for (const cand of candidates) {
    for (const [k, v] of Object.entries(row)) {
      if (v == null || v === '') continue;
      
      // Exact match (case-insensitive, trim)
      const keyTrimmed = String(k).trim();
      const candTrimmed = String(cand).trim();
      
      if (keyTrimmed.toLowerCase() === candTrimmed.toLowerCase()) {
        return String(v).trim();
      }
      
      // Match ignoring case and extra spaces
      if (keyTrimmed.replace(/\s+/g, ' ').toLowerCase() === candTrimmed.replace(/\s+/g, ' ').toLowerCase()) {
        return String(v).trim();
      }
    }
  }

  // Second: try with underscores/spaces normalized (SR_NO = SR NO = sr no)
  for (const cand of candidates) {
    for (const [k, v] of Object.entries(row)) {
      if (v == null || v === '') continue;
      
      const keyNormalized = String(k).trim().toLowerCase().replace(/[\s_]/g, '');
      const candNormalized = String(cand).trim().toLowerCase().replace(/[\s_]/g, '');
      
      if (keyNormalized === candNormalized) {
        return String(v).trim();
      }
    }
  }

  // Third: try normalized match (remove special chars)
  const normRow = {};
  for (const [k, v] of Object.entries(row)) {
    normRow[normalizeKey(k)] = v;
  }

  for (const cand of candidates) {
    const normCand = normalizeKey(cand);
    if (normCand in normRow && normRow[normCand] != null && normRow[normCand] !== '') {
      return String(normRow[normCand]).trim();
    }
  }

  // Fourth: partial match by contains for flexible headers
  const flexible = candidates.map((c) => normalizeKey(c));
  for (const [k, v] of Object.entries(normRow)) {
    if (v == null || v === '') continue;
    for (const f of flexible) {
      if (f && k.includes(f)) return String(v).trim();
    }
  }

  return '';
};

export const uploadExcelFile = async (req, res) => {
  // Early return if response already sent
  if (res.headersSent) {
    console.warn('Response already sent, skipping upload handler');
    return;
  }

  // Set timeout for Render (5 minutes) and headers to prevent timeout
  if (process.env.RENDER) {
    req.setTimeout(300000);
    res.setTimeout(300000);
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=300');
  }

  try {
    console.log('=== UPLOAD DEBUG ===');
    console.log('req.file:', req.file ? 'File received' : 'No file');
    console.log('req.body:', Object.keys(req.body || {}));

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file. Use field name "file"',
        message_mr: 'कृपया Excel फाइल अपलोड करें। फील्ड नाम "file" का उपयोग करें',
      });
    }

    console.log(`Processing: ${req.file.originalname}`);
    console.log(`File size: ${req.file.size} bytes`);
    console.log(`Storage type: ${isVercel ? 'memory (Vercel)' : isRender ? 'disk (Render)' : 'disk (local)'}`);

    // Read Excel file - handle both memory storage (Vercel) and disk storage (Render/local)
    let workbook;
    try {
      if (isVercel && req.file.buffer) {
        // Vercel serverless: read from buffer (memory storage)
        console.log('Reading Excel from buffer (memory storage)');
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } else {
        // Render or local development: read from file path (disk storage)
        console.log(`Reading Excel from file path: ${req.file.path}`);
        if (!fs.existsSync(req.file.path)) {
          return res.status(400).json({
            success: false,
            message: 'Uploaded file not found',
            message_mr: 'अपलोड की गई फाइल नहीं मिली',
          });
        }
        workbook = XLSX.readFile(req.file.path);
      }
    } catch (xlsxError) {
      console.error('XLSX read error:', xlsxError);
      // Cleanup uploaded file (only for disk storage - Render or local)
      if (!isVercel && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('File cleanup error (non-critical):', cleanupError.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel file format',
        message_mr: 'अमान्य Excel फाइल फॉर्मेट',
        error: xlsxError.message
      });
    }

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      // Cleanup uploaded file (only for disk storage - Render or local)
      if (!isVercel && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('File cleanup error (non-critical):', cleanupError.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no sheets',
        message_mr: 'Excel फाइल खाली है या कोई शीट नहीं है',
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    // Auto-detect header row (handles files with title rows above headers)
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const headerCandidates = [
      ['नाव', 'नाम', 'name', 'full name', 'name of elector', 'elector name', 'name english', 'name marathi', 'name_en', 'name_mr', 'name_english', 'name_marathi'],
      ['अनु क्र', 'serial', 'sr no', 'क्रमांक', 'sr_no', 'sr_no', 'serial_number'],
      ['घर', 'house', 'house_no', 'house_number', 'house_no'],
      ['लिंग', 'gender', 'sex', 'gender_en', 'gender_mr', 'gender_english', 'gender_marathi'],
      ['वय', 'age'],
      ['मतदान', 'voter', 'epic', 'id card', 'elector photo identity', 'epic_id', 'epic_id', 'voter_id'],
      ['मोबाईल', 'mobile', 'phone', 'contact', 'mobile_no', 'mobile_number']
    ];
    const scoreRow = (cells = []) => {
      const normCells = cells.map(normalizeKey);
      let score = 0;
      for (const group of headerCandidates) {
        const found = group.some(tok => {
          const nt = normalizeKey(tok);
          return normCells.some(c => c && c.includes(nt));
        });
        if (found) score++;
      }
      return score;
    };
    let headerRowIndex = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const s = scoreRow(rows[i] || []);
      if (s > bestScore) {
        bestScore = s;
        headerRowIndex = i;
      }
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '', raw: true });

    console.log('Detected header row index:', headerRowIndex);
    console.log('Total rows found:', jsonData.length);
    console.log('First row sample keys:', jsonData[0] ? Object.keys(jsonData[0]) : 'No data');
    
    // Debug: Show first row actual values
    if (jsonData.length > 0) {
      console.log('First row actual values:', JSON.stringify(jsonData[0], null, 2));
      console.log('First row Name_En:', jsonData[0]['Name_En']);
      console.log('First row Name_Mr:', jsonData[0]['Name_Mr']);
      console.log('First row Gender_En:', jsonData[0]['Gender_En']);
      console.log('First row Gender_Mr:', jsonData[0]['Gender_Mr']);
    }

    // Get all field names from the detected header row
    const headerRow = rows[headerRowIndex] || [];
    const fieldNames = jsonData.length > 0 ? Object.keys(jsonData[0]) : headerRow.filter(h => h);
    
    // Create field information
    const fieldsInfo = {
      detectedHeaderRow: headerRowIndex,
      totalColumns: fieldNames.length,
      columnNames: fieldNames,
      headerRow: headerRow,
      sampleRow: jsonData.length > 0 ? jsonData[0] : null,
      allRows: jsonData.slice(0, 10) // First 10 rows as sample
    };

    if (jsonData.length === 0) {
      // Cleanup uploaded file (only for disk storage - Render or local)
      if (!isVercel && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('File cleanup error (non-critical):', cleanupError.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty',
        message_mr: 'Excel फाइल खाली है',
      });
    }

// Transform data
    const voterDataArray = jsonData.map((row, index) => {
      if (!row || typeof row !== 'object') return null;

      // Debug: Log first row to see actual field names
      if (index === 0) {
        console.log('\n=== FIRST ROW FIELD NAMES (DEBUG) ===');
        const actualKeys = Object.keys(row);
        console.log('Total keys found:', actualKeys.length);
        console.log('Actual keys in Excel:', actualKeys);
        console.log('\n--- All field values ---');
        
        // Try direct access with various formats
        for (const key of actualKeys) {
          const val = row[key];
          console.log(`"${key}" = "${val}" (type: ${typeof val})`);
        }
        
        console.log('\n--- Field detection test ---');
        // Test all possible variations
        const testFields = ['SR_NO', 'SR NO', 'House_No', 'House No', 'Name_En', 'Name En', 'Name_Mr', 'Name Mr', 
                           'Gender_En', 'Gender En', 'Gender_Mr', 'Gender Mr', 'Epic_id', 'Epic id', 'Mobile_No', 'Mobile No', 'Age'];
        for (const field of testFields) {
          const found = row[field] !== undefined ? row[field] : 'NOT FOUND';
          if (found !== 'NOT FOUND') {
            console.log(`✅ "${field}" = "${found}"`);
          }
        }
        
        // Check case-insensitive matches
        console.log('\n--- Case-insensitive matches ---');
        const rowKeysLower = actualKeys.map(k => k.toLowerCase().replace(/[\s_]/g, ''));
        const testFieldsLower = testFields.map(f => f.toLowerCase().replace(/[\s_]/g, ''));
        for (let i = 0; i < testFields.length; i++) {
          const fieldLower = testFieldsLower[i];
          const idx = rowKeysLower.indexOf(fieldLower);
          if (idx !== -1) {
            const actualKey = actualKeys[idx];
            console.log(`✅ "${testFields[i]}" matches "${actualKey}" = "${row[actualKey]}"`);
          }
        }
        
        console.log('=====================================\n');
      }

      // Helper: Direct field access with case-insensitive matching
      const getField = (row, possibleNames) => {
        if (!row || typeof row !== 'object') return '';
        
        // First try exact match (case-sensitive, exact string match)
        for (const name of possibleNames) {
          if (row.hasOwnProperty(name)) {
            const val = row[name];
            if (val !== undefined && val !== null) {
              const trimmed = String(val).trim();
              // Return even if empty string (let caller handle empty)
              return trimmed;
            }
          }
        }
        
        // Then try case-insensitive match with underscore/space normalization
        const rowKeys = Object.keys(row);
        for (const name of possibleNames) {
          // Normalize: remove spaces, underscores, convert to lowercase
          const nameNormalized = name.toLowerCase().trim().replace(/[\s_]/g, '');
          for (const key of rowKeys) {
            const keyNormalized = key.toLowerCase().trim().replace(/[\s_]/g, '');
            if (keyNormalized === nameNormalized) {
              const val = row[key];
              if (val !== undefined && val !== null) {
                const trimmed = String(val).trim();
                return trimmed;
              }
            }
          }
        }
        
        // Try with just spaces removed (not underscores)
        for (const name of possibleNames) {
          const nameNormalized = name.toLowerCase().trim().replace(/\s+/g, '');
          for (const key of rowKeys) {
            const keyNormalized = key.toLowerCase().trim().replace(/\s+/g, '');
            if (keyNormalized === nameNormalized) {
              const val = row[key];
              if (val !== undefined && val !== null) {
                const trimmed = String(val).trim();
                return trimmed;
              }
            }
          }
        }
        
        // Last resort: use getVal function
        return getVal(row, possibleNames);
      };

      // Priority order: DIRECT ACCESS FIRST for exact Excel column names
      // Note: SR_NO can have spaces like "1 / 1"
      let serialNumber = '';
      if (row['SR_NO'] !== undefined && row['SR_NO'] !== null) {
        serialNumber = String(row['SR_NO']).trim();
      }
      if (!serialNumber) {
        serialNumber = getField(row, [
          'SR_NO', 'SR NO', 'Sr_No', 'Sr_Number', 'Serial_Number', 'SRNO',
        'अनु क्र.', 'अनु क्र', 'अनु क्र .', 'अनु.क्र.', 'अनु क्रमांक', 'Serial Number', 'Serial No', 'Sr No', 'Sr Number', 'क्रमांक'
        ])?.trim();
      }

      // Get House Number - DIRECT ACCESS FIRST
      let houseNumber = '';
      if (row['House_No'] !== undefined && row['House_No'] !== null) {
        houseNumber = String(row['House_No']).trim();
      }
      if (!houseNumber) {
        houseNumber = getField(row, [
          'House_No', 'House_Number', 'HouseNo', 'House No', 'House no',
          'घर क्र.', 'घर क्र', 'घर क्र .', 'House Number', 'घर नंबर', 'घर क्रमांक'
        ]);
      }

      // EXCEL FILE STRUCTURE: SR_NO, House_No, Name_Mr, Gender_Mr, Age, Epic_id, Mobile_No, Name_En, Gender_En
      // IMPORTANT: Check Name_En and Name_Mr FIRST - these are the exact column names
      
      // Get English name - DIRECT ACCESS FIRST (Excel has exact column Name_En)
      let nameEnglish = '';
      if (row['Name_En'] !== undefined && row['Name_En'] !== null) {
        nameEnglish = String(row['Name_En']).trim();
        if (index === 0) console.log('✅ Direct access: row["Name_En"] =', nameEnglish);
      }
      
      // If not found, try getField with variations
      if (!nameEnglish) {
        nameEnglish = getField(row, [
          'Name_En', 'Name En', 'Name_English', 'NameEnglish', 'NameEn', 'Name English'
        ]);
        if (index === 0 && nameEnglish) console.log('✅ getField found Name_En:', nameEnglish);
      }
      if (index === 0 && !nameEnglish) console.log('❌ Name_En NOT FOUND');
      
      // Get Marathi name - DIRECT ACCESS FIRST (Excel has exact column Name_Mr)
      let nameMarathi = '';
      if (row['Name_Mr'] !== undefined && row['Name_Mr'] !== null) {
        nameMarathi = String(row['Name_Mr']).trim();
        if (index === 0) console.log('✅ Direct access: row["Name_Mr"] =', nameMarathi);
      }
      
      // If not found, try getField with variations
      if (!nameMarathi) {
        nameMarathi = getField(row, [
          'Name_Mr', 'Name Mr', 'Name_Marathi', 'NameMarathi', 'NameMr', 'Name Marathi'
        ]);
        if (index === 0 && nameMarathi) console.log('✅ getField found Name_Mr:', nameMarathi);
      }
      if (index === 0 && !nameMarathi) console.log('❌ Name_Mr NOT FOUND');
      
      // Only if Name_En and Name_Mr are not found, try other field names
      // But do NOT check generic 'नाव' or 'Name' if we already have Name_En or Name_Mr
      // This prevents Marathi from going into name field incorrectly
      
      // Check if Name_En field actually exists in Excel (even if empty)
      const nameEnFieldExists = Object.keys(row).some(key => {
        const keyNormalized = key.toLowerCase().trim().replace(/[\s_]/g, '');
        return keyNormalized === 'nameen' || keyNormalized === 'name_en';
      });
      
      // DON'T check generic fields if Name_En column exists in Excel
      // Excel file has Name_En column, so we should only use that
      // Generic fields check only if Name_En column doesn't exist at all

      // Check if Name_Mr field exists in Excel
      const nameMrFieldExists = Object.keys(row).some(key => {
        const keyNormalized = key.toLowerCase().trim().replace(/[\s_]/g, '');
        return keyNormalized === 'namemr' || keyNormalized === 'name_mr';
      });
      
      // DON'T check generic Marathi fields if Name_Mr column exists in Excel
      // Excel file has Name_Mr column, so we should only use that

      // Process name - NO TRANSLITERATION, direct mapping
      let name, name_mr;
      
      // Check if values are actually present (not just empty strings)
      const hasEnglish = nameEnglish && String(nameEnglish).trim() !== '';
      const hasMarathi = nameMarathi && String(nameMarathi).trim() !== '';
      
      if (index === 0) {
        console.log('\n=== NAME PROCESSING DEBUG ===');
        console.log('nameEnglish (raw):', JSON.stringify(nameEnglish));
        console.log('nameMarathi (raw):', JSON.stringify(nameMarathi));
        console.log('hasEnglish:', hasEnglish);
        console.log('hasMarathi:', hasMarathi);
      }
      
      // CRITICAL LOGIC FOR EXCEL FILE STRUCTURE:
      // Excel has: Name_En, Name_Mr, Gender_En, Gender_Mr columns
      // 1. Always use Name_En for name (even if empty in some rows)
      // 2. Always use Name_Mr for name_mr
      // 3. Don't mix them up
      
      if (hasEnglish) {
        // We have English name from Name_En field
        name = String(nameEnglish).trim();
        if (index === 0) console.log('✅ Setting name from Name_En:', name);
      } else {
        // Name_En is empty - keep name empty, don't use Marathi
        // This is correct because Name_En field exists in Excel (just empty for this row)
        name = '';
        if (index === 0) console.log('⚠️ Name_En is empty, keeping name empty');
      }
      
      // Always put Marathi in name_mr if available
      if (hasMarathi) {
        name_mr = String(nameMarathi).trim();
        if (index === 0) console.log('✅ Setting name_mr from Name_Mr:', name_mr);
      } else {
        name_mr = '';
        if (index === 0) console.log('⚠️ Name_Mr is empty, keeping name_mr empty');
      }

      // If no name at all (both empty), use Unknown for validation
      if (!name || name.trim() === '') {
        if (!hasMarathi) {
          name = `Unknown_${index}`;
          if (index === 0) console.log('⚠️ Both empty, setting name to Unknown');
        }
      }
      
      if (index === 0) {
        console.log('Final name:', JSON.stringify(name));
        console.log('Final name_mr:', JSON.stringify(name_mr));
        console.log('============================\n');
      }

      // Process gender - check Gender_En first (EXACT column name from Excel)
      
      // Check if Gender_En field actually exists in Excel (even if empty)
      const genderEnFieldExists = Object.keys(row).some(key => {
        const keyNormalized = key.toLowerCase().trim().replace(/[\s_]/g, '');
        return keyNormalized === 'genderen' || keyNormalized === 'gender_en';
      });
      
      // Get English gender - DIRECT ACCESS FIRST (Excel has exact column Gender_En)
      let genderEnglish = '';
      if (row['Gender_En'] !== undefined && row['Gender_En'] !== null) {
        genderEnglish = String(row['Gender_En']).trim();
      }
      
      // If not found, try getField with variations
      if (!genderEnglish) {
        genderEnglish = getField(row, [
          'Gender_En', 'Gender En', 'Gender_English', 'GenderEnglish', 'GenderEn', 'Gender English'
        ]);
      }
      
      // Get Marathi gender - DIRECT ACCESS FIRST (Excel has exact column Gender_Mr)
      let genderMarathi = '';
      if (row['Gender_Mr'] !== undefined && row['Gender_Mr'] !== null) {
        genderMarathi = String(row['Gender_Mr']).trim();
      }
      
      // If not found, try getField with variations
      if (!genderMarathi) {
        genderMarathi = getField(row, [
          'Gender_Mr', 'Gender Mr', 'Gender_Marathi', 'GenderMarathi', 'GenderMr', 'Gender Marathi'
        ]);
      }
      
      // Check if Gender_Mr field exists in Excel
      const genderMrFieldExists = Object.keys(row).some(key => {
        const keyNormalized = key.toLowerCase().trim().replace(/[\s_]/g, '');
        return keyNormalized === 'gendermr' || keyNormalized === 'gender_mr';
      });
      
      // DON'T check generic fields if Gender_En/Gender_Mr columns exist in Excel
      // Excel file has these columns, so we should only use those
      
      let gender, gender_mr;
      
      // Check if values are actually present
      const hasGenderEnglish = genderEnglish && String(genderEnglish).trim() !== '';
      const hasGenderMarathi = genderMarathi && String(genderMarathi).trim() !== '';
      
      // CRITICAL LOGIC (same as name):
      // Excel has: Gender_En, Gender_Mr columns
      // 1. Always use Gender_En for gender (even if empty in some rows)
      // 2. Always use Gender_Mr for gender_mr
      // 3. Don't mix them up
      
      if (hasGenderEnglish) {
        // We have English gender from Gender_En field
        gender = String(genderEnglish).trim();
      } else {
        // Gender_En is empty - keep gender empty, don't use Marathi
        // This is correct because Gender_En field exists in Excel (just empty for this row)
        gender = '';
      }
      
      // Always put Marathi in gender_mr if available
      if (hasGenderMarathi) {
        gender_mr = String(genderMarathi).trim();
      } else {
        gender_mr = '';
      }

      const ageRaw = getField(row, [
        'Age', 'वय'
      ]);
      const age = parseInt(ageRaw || 0) || 0;

      // Get EPIC ID - DIRECT ACCESS FIRST
      let voterIdCard = '';
      if (row['Epic_id'] !== undefined && row['Epic_id'] !== null) {
        voterIdCard = String(row['Epic_id']).trim();
      }
      if (!voterIdCard) {
        voterIdCard = getField(row, [
          'Epic_id', 'Epic_ID', 'EpicId', 'EPIC_ID', 'Epic Id', 'Epic id', 'EPICID',
        // English variants
        'Voter ID', 'Voter ID No', 'Voter ID Number', 'Voter Id Card', 'Voter Id Card No', 'Voter Card Number', 'VoterCard No', 'VoterID',
          'EPIC No', 'EPIC Number', 'EPIC', 'Elector Photo Identity Card No', 'ID Card No', 'IDCard No', 'ID Card Number', 'Voter_ID',
          // Marathi/Hindi variants
          'मतदान कार्ड क्र.', 'मतदान कार्ड क्र', 'मतदान कार्ड क्र .', 'मतदान कार्ड क्रमांक', 'मतदार ओळखपत्र', 'मतदार ओळखपत्र क्र.', 'मतदार ओळख क्रमांक'
        ])?.trim();
      }

      // Get Mobile Number - DIRECT ACCESS FIRST
      let mobileNumber = '';
      if (row['Mobile_No'] !== undefined && row['Mobile_No'] !== null) {
        mobileNumber = String(row['Mobile_No']).trim();
      }
      if (!mobileNumber) {
        mobileNumber = getField(row, [
          'Mobile_No', 'Mobile_Number', 'MobileNo', 'Mobile No', 'Mobile no',
          'मोबाईल नं.', 'मोबाईल नं .', 'मोबाईल', 'Mobile Number', 'Phone', 'Phone Number', 'Contact', 'Contact Number'
        ]);
      }

      // Map all new fields from Excel
      // AC_NO, PART_NO, SLNOINPART, C_HOUSE_NO, SECTION_NO, RLN_TYPE, EPIC_NO, DOB
      const AC_NO = getField(row, ['AC_NO', 'AC NO', 'ACNO', 'Assembly Constituency No']);
      const PART_NO = getField(row, ['PART_NO', 'PART NO', 'PARTNO', 'Part No']);
      const SLNOINPART = getField(row, ['SLNOINPART', 'SLNO IN PART', 'SLNOINPART', 'Serial No in Part']);
      const C_HOUSE_NO = getField(row, ['C_HOUSE_NO', 'C HOUSE NO', 'CHOUSENO', 'House No']);
      const SECTION_NO = getField(row, ['SECTION_NO', 'SECTION NO', 'SECTIONNO', 'Section No']);
      const RLN_TYPE = getField(row, ['RLN_TYPE', 'RLN TYPE', 'RLNTYPE', 'Relation Type']);
      const EPIC_NO = getField(row, ['EPIC_NO', 'EPIC NO', 'EPICNO', 'EPIC No', 'Epic_id', 'Epic Id']);
      const DOB = getField(row, ['DOB', 'Date of Birth', 'Date Of Birth', 'Birth Date']);
      
      // Name fields in English
      const FM_NAME_EN = getField(row, ['FM_NAME_EN', 'FM NAME EN', 'FMNAMEEN', 'First Middle Name EN', 'First Name EN']);
      const MN_NAME_EN = getField(row, ['MN_NAME_EN', 'MN NAME EN', 'MNNAMEEN', 'Middle Name EN']);
      const LASTNAME_EN = getField(row, ['LASTNAME_EN', 'LASTNAME EN', 'LASTNAMEEN', 'Last Name EN', 'Surname EN']);
      
      // Relation name fields in English
      const RLN_FM_NM_EN = getField(row, ['RLN_FM_NM_EN', 'RLN FM NM EN', 'RLNFMNMEN', 'Relation First Middle Name EN']);
      const RLN_L_NM_EN = getField(row, ['RLN_L_NM_EN', 'RLN L NM EN', 'RLNLNMEN', 'Relation Last Name EN']);
      
      // Name fields in Vernacular (V1)
      const FM_NAME_V1 = getField(row, ['FM_NAME_V1', 'FM NAME V1', 'FMNAMEV1', 'First Middle Name V1', 'First Name V1']);
      const LASTNAME_V1 = getField(row, ['LASTNAME_V1', 'LASTNAME V1', 'LASTNAMEV1', 'Last Name V1', 'Surname V1']);
      
      // Relation name fields in Vernacular (V1)
      const RLN_FM_NM_V1 = getField(row, ['RLN_FM_NM_V1', 'RLN FM NM V1', 'RLNFMNMV1', 'Relation First Middle Name V1']);
      const RLN_L_NM_V1 = getField(row, ['RLN_L_NM_V1', 'RLN L NM V1', 'RLNLNMV1', 'Relation Last Name V1']);
      const C_HOUSE_NO_V1 = getField(row, ['C_HOUSE_NO_V1', 'C HOUSE NO V1', 'CHOUSENOV1', 'House No V1']);
      
      // Address fields
      const adr1 = getField(row, ['adr1', 'ADR1', 'Address 1', 'Address Line 1', 'Address1']);
      const adr2 = getField(row, ['adr2', 'ADR2', 'Address 2', 'Address Line 2', 'Address2']);
      
      // Polling station address
      const POLLING_STATION_ADR1 = getField(row, ['POLLING_STATION_ADR1', 'POLLING STATION ADR1', 'POLLINGSTATIONADR1', 'Polling Station Address 1']);
      const POLLING_STATION_ADR2 = getField(row, ['POLLING_STATION_ADR2', 'POLLING STATION ADR2', 'POLLINGSTATIONADR2', 'Polling Station Address 2']);
      
      // MOB field (alternative mobile field)
      const MOB = getField(row, ['MOB', 'Mobile', 'Mobile Number', 'Mobile_No', 'Mobile No']);
      
      // pp field
      const pp = getField(row, ['pp', 'PP', 'Polling Place', 'Polling Place No']);

      const transformedRow = { 
        serialNumber, 
        houseNumber, 
        name, 
        name_mr, 
        gender, 
        gender_mr, 
        age, 
        voterIdCard, 
        mobileNumber: mobileNumber || MOB, // Use MOB if mobileNumber is empty
        // New fields
        AC_NO,
        PART_NO,
        SLNOINPART,
        C_HOUSE_NO: C_HOUSE_NO || houseNumber, // Use existing houseNumber if C_HOUSE_NO is empty
        SECTION_NO,
        RLN_TYPE,
        EPIC_NO: EPIC_NO || voterIdCard, // Use existing voterIdCard if EPIC_NO is empty
        DOB,
        FM_NAME_EN,
        MN_NAME_EN,
        LASTNAME_EN,
        RLN_FM_NM_EN,
        RLN_L_NM_EN,
        FM_NAME_V1,
        LASTNAME_V1,
        RLN_FM_NM_V1,
        RLN_L_NM_V1,
        C_HOUSE_NO_V1,
        adr1,
        adr2,
        POLLING_STATION_ADR1,
        POLLING_STATION_ADR2,
        pp
      };

      // Debug first row
      if (index === 0) {
        console.log('\n=== TRANSFORMED ROW DEBUG ===');
        console.log('serialNumber:', serialNumber);
        console.log('houseNumber:', houseNumber);
        console.log('name:', name);
        console.log('name_mr:', name_mr);
        console.log('gender:', gender);
        console.log('gender_mr:', gender_mr);
        console.log('age:', age);
        console.log('voterIdCard:', voterIdCard);
        console.log('mobileNumber:', mobileNumber);
        console.log('================================\n');
      }

      // Validate required field - at least name or name_mr should be present
      // Don't skip rows if name_mr exists even if name is empty
      if ((!transformedRow.name || /^Unknown_/.test(transformedRow.name)) && (!transformedRow.name_mr || transformedRow.name_mr.trim() === '')) {
        console.warn(`Row ${index}: Missing valid name (both name and name_mr empty), skipping`);
        return null;
      }
      
      // IMPORTANT: DO NOT overwrite name with name_mr
      // If Name_En is empty in Excel, name should stay empty, not be replaced with name_mr
      // This ensures correct separation between English and Marathi fields

      return transformedRow;
    }).filter(row => row !== null);

    console.log(`Valid records to insert: ${voterDataArray.length}`);

    if (voterDataArray.length === 0) {
      // Cleanup uploaded file (only for disk storage - Render or local)
      if (!isVercel && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('File cleanup error (non-critical):', cleanupError.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'No valid data found (with name)',
        message_mr: 'कोई वैध डेटा नहीं मिला (नाम के साथ)',
      });
    }

    // For Render, send periodic updates to prevent timeout
    // Note: We'll process normally but with reduced batch size

    // Insert data in batches to avoid memory issues
    const BATCH_SIZE = 500; // Reduced batch size for Render to prevent timeout
    let totalInserted = 0;
    let totalErrors = 0;
    const errors = [];

    console.log(`📦 Processing ${voterDataArray.length} records in batches of ${BATCH_SIZE}...`);

    // Process in batches
    for (let i = 0; i < voterDataArray.length; i += BATCH_SIZE) {
      const batch = voterDataArray.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(voterDataArray.length / BATCH_SIZE);

      try {
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
        
        // Insert batch
        const batchResult = await VoterData.insertMany(batch, {
          ordered: false // Continue even if some fail
        });

        totalInserted += batchResult.length;
        console.log(`✅ Batch ${batchNumber} inserted: ${batchResult.length} records`);
        
        // Force garbage collection hint (if available)
        if (global.gc) {
          global.gc();
        }
      } catch (batchError) {
        console.error(`❌ Batch ${batchNumber} error:`, batchError.message);
        
        // If batch fails, try inserting individually
        if (batchError.writeErrors) {
          for (const writeError of batchError.writeErrors) {
            errors.push({
              index: i + writeError.index,
              error: writeError.errmsg
            });
            totalErrors++;
          }
        } else {
          // Try individual inserts for this batch
          for (let j = 0; j < batch.length; j++) {
            try {
              await VoterData.create(batch[j]);
              totalInserted++;
            } catch (individualError) {
              errors.push({
                index: i + j,
                error: individualError.message
              });
              totalErrors++;
            }
          }
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + BATCH_SIZE < voterDataArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Total inserted: ${totalInserted}, Errors: ${totalErrors}`);

    // Prepare response
    const savedData = voterDataArray.slice(0, Math.min(5, totalInserted)); // Sample for response

    // Cleanup uploaded file (only for disk storage, not needed for memory storage)
    if (!isVercel && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('File cleanup error (non-critical):', cleanupError.message);
      }
    }

    // Check if response already sent
    if (res.headersSent) {
      console.warn('Response already sent, cannot send success response');
      return;
    }

    res.status(201).json({
      success: true,
      message: `Data uploaded successfully (${totalInserted} records inserted)`,
      message_mr: `डेटा सफलतापूर्वक अपलोड हो गया (${totalInserted} रिकॉर्ड्स)`,
      count: totalInserted,
      totalProcessed: voterDataArray.length,
      errors: totalErrors,
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : [], // First 10 errors
      sample: savedData,
      fieldsInfo: fieldsInfo, // Include fields information
    });

  } catch (error) {
    console.error('=== UPLOAD ERROR ===', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    // Cleanup file if exists (only for disk storage)
    if (req.file && !isVercel && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    // Check if response was already sent
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }

    // Send error response
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      message_mr: 'फाइल अपलोड के दौरान सर्वर त्रुटि',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      error_mr: process.env.NODE_ENV === 'development' ? error.message : 'आंतरिक सर्वर त्रुटि',
      errorType: error.name || 'UnknownError',
    });
  }
};

// Update other functions with Hindi messages
export const getAllVoters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50000;
    const skip = (page - 1) * limit;

    const voters = await VoterData.find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await VoterData.countDocuments();

    res.status(200).json({
      success: true,
      count: voters.length,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      data: voters,
    });
  } catch (error) {
    console.error('Get voters error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      message_mr: 'सर्वर एरर',
      error: error.message,
    });
  }
};

export const getVoterById = async (req, res) => {
  try {
    const voter = await VoterData.findById(req.params.id);

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found',
        message_mr: 'वोटर नहीं मिला',
      });
    }

    res.status(200).json({
      success: true,
      data: voter,
    });
  } catch (error) {
    console.error('Get voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      message_mr: 'सर्वर एरर',
      error: error.message,
    });
  }
};

export const deleteAllVoters = async (req, res) => {
  try {
    const result = await VoterData.deleteMany({});

    res.status(200).json({
      success: true,
      message: 'All data deleted successfully',
      message_mr: 'सभी डेटा सफलतापूर्वक डिलीट हो गया',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      message_mr: 'सर्वर एरर',
      error: error.message,
    });
  }
};

// Search voters by name (supports both English and Marathi)
// Note: isMarathiText is imported from '../utils/transliteration.js'
export const searchVoters = async (req, res) => {
  try {
    const { query, page = 1, limit = 50 } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
        message_mr: 'कृपया शोध क्वेरी प्रदान करें',
      });
    }

    const searchTerm = query.trim();
    const isMarathi = isMarathiText(searchTerm);
    
    // Search in appropriate field based on language
    const searchField = isMarathi ? 'name_mr' : 'name';
    
    console.log(`Searching for: "${searchTerm}" (${isMarathi ? 'Marathi' : 'English'})`);
    console.log(`Search field: ${searchField}`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Case-insensitive partial match search
    const searchQuery = {
      [searchField]: { $regex: searchTerm, $options: 'i' }
    };

    const voters = await VoterData.find(searchQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalCount = await VoterData.countDocuments(searchQuery);

    // Format response - always include both English and Marathi names and all new fields
    const formattedData = voters.map(voter => {
      const voterObj = voter.toObject();
      
      // Always return both English and Marathi names and all fields
        return {
          _id: voterObj._id,
          serialNumber: voterObj.serialNumber,
          houseNumber: voterObj.houseNumber,
          name: voterObj.name, // English name
          name_mr: voterObj.name_mr || '', // Marathi name
          gender: voterObj.gender, // English gender
          gender_mr: voterObj.gender_mr || '', // Marathi gender
          age: voterObj.age,
          voterIdCard: voterObj.voterIdCard,
          mobileNumber: voterObj.mobileNumber,
          // New fields
          AC_NO: voterObj.AC_NO || '',
          PART_NO: voterObj.PART_NO || '',
          SLNOINPART: voterObj.SLNOINPART || '',
          C_HOUSE_NO: voterObj.C_HOUSE_NO || '',
          SECTION_NO: voterObj.SECTION_NO || '',
          RLN_TYPE: voterObj.RLN_TYPE || '',
          EPIC_NO: voterObj.EPIC_NO || '',
          DOB: voterObj.DOB || '',
          FM_NAME_EN: voterObj.FM_NAME_EN || '',
          MN_NAME_EN: voterObj.MN_NAME_EN || '',
          LASTNAME_EN: voterObj.LASTNAME_EN || '',
          RLN_FM_NM_EN: voterObj.RLN_FM_NM_EN || '',
          RLN_L_NM_EN: voterObj.RLN_L_NM_EN || '',
          FM_NAME_V1: voterObj.FM_NAME_V1 || '',
          LASTNAME_V1: voterObj.LASTNAME_V1 || '',
          RLN_FM_NM_V1: voterObj.RLN_FM_NM_V1 || '',
          RLN_L_NM_V1: voterObj.RLN_L_NM_V1 || '',
          C_HOUSE_NO_V1: voterObj.C_HOUSE_NO_V1 || '',
          adr1: voterObj.adr1 || '',
          adr2: voterObj.adr2 || '',
          POLLING_STATION_ADR1: voterObj.POLLING_STATION_ADR1 || '',
          POLLING_STATION_ADR2: voterObj.POLLING_STATION_ADR2 || '',
          pp: voterObj.pp || '',
          createdAt: voterObj.createdAt,
          updatedAt: voterObj.updatedAt
        };
    });

    res.status(200).json({
      success: true,
      message: isMarathi 
        ? `${totalCount} रिकॉर्ड मिले` 
        : `Found ${totalCount} records`,
      searchTerm: searchTerm,
      searchLanguage: isMarathi ? 'Marathi' : 'English',
      count: formattedData.length,
      totalCount: totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      data: formattedData,
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      message_mr: 'सर्वर एरर',
      error: error.message,
    });
  }
};