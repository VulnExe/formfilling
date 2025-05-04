import * as XLSX from 'xlsx';
import { FormField } from '../types/formField';

export function generateExcel(data: FormField[], fileName: string): void {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert the data to the format needed by SheetJS
  const worksheetData = data.map(field => [field.name, field.value]);
  
  // Add header row
  worksheetData.unshift(['Field', 'Value']);
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Apply styling
  applyExcelStyling(ws, worksheetData.length);
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'AGS Form Data');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, fileName);
}

function applyExcelStyling(ws: XLSX.WorkSheet, totalRows: number): void {
  // Define cell styles
  
  // Header style - Light blue background with bold text
  const headerStyle = {
    fill: { 
      fgColor: { rgb: "D6EAF8" } // Light blue header background (matches AGS Form template)
    }, 
    font: { 
      bold: true, 
      color: { rgb: "000000" } 
    },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    },
    alignment: { 
      horizontal: "center", 
      vertical: "center" 
    }
  };
  
  // Field name style - Left side cells
  const fieldNameStyle = {
    font: { 
      bold: true,
      color: { rgb: "000000" } 
    },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    },
    alignment: { 
      horizontal: "left", 
      vertical: "center" 
    }
  };
  
  // Field value style - Right side cells
  const fieldValueStyle = {
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    },
    alignment: { 
      horizontal: "left", 
      vertical: "center" 
    }
  };
  
  // Special style for numerical values
  const numberValueStyle = {
    ...fieldValueStyle,
    alignment: { 
      horizontal: "right", 
      vertical: "center" 
    },
    numFmt: '#,##0.00' // Format numbers with commas and two decimal places
  };
  
  // Set column widths
  ws['!cols'] = [
    { width: 25 }, // Field column
    { width: 30 }  // Value column
  ];
  
  // Set row heights for better readability
  ws['!rows'] = [];
  for (let i = 0; i < totalRows; i++) {
    ws['!rows'][i] = { hpt: 25 }; // Height in points
  }
  
  // Apply styles to header cells
  ['A1', 'B1'].forEach(cellRef => {
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = headerStyle;
  });
  
  // Apply styles to body rows
  for (let i = 2; i <= totalRows; i++) {
    // Field names (A column)
    const fieldCell = `A${i}`;
    if (!ws[fieldCell]) ws[fieldCell] = { t: 's', v: '' };
    ws[fieldCell].s = fieldNameStyle;
    
    // Field values (B column)
    const valueCell = `B${i}`;
    if (!ws[valueCell]) ws[valueCell] = { t: 's', v: '' };
    
    // Check if the field is a number-related field for special formatting
    const cellValue = ws[valueCell].v;
    const fieldName = ws[`A${i}`]?.v?.toString()?.toUpperCase() || '';
    
    // Apply number formatting to amount fields
    if (
      fieldName.includes('AMOUNT') || 
      fieldName.includes('DISCOUNT') || 
      fieldName === 'NET'
    ) {
      try {
        // If it's a number, format it properly
        if (!isNaN(Number(cellValue))) {
          ws[valueCell].t = 'n'; // Set cell type to number
          ws[valueCell].v = Number(cellValue); // Ensure value is a number
          ws[valueCell].s = numberValueStyle;
          continue;
        }
      } catch (e) {
        // If conversion to number fails, use normal styling
      }
    }
    
    // Apply standard value style for non-numeric fields
    ws[valueCell].s = fieldValueStyle;
  }
  
  // Add a title row above the header (optional but common in AGS forms)
  // This requires shifting all existing data down one row
  XLSX.utils.sheet_add_aoa(ws, [['AGS FORM DATA']], { origin: 'A1' });
  
  // Merge the title cell across both columns
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  
  // Apply title styling
  const titleStyle = {
    font: { bold: true, color: { rgb: "000000" }, sz: 14 },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "E0F2F1" } }, // Light teal background
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  
  // Apply title styling
  if (!ws['A1']) ws['A1'] = { t: 's', v: 'AGS FORM DATA' };
  ws['A1'].s = titleStyle;
  
  // Update header row to be row 2 now
  ['A2', 'B2'].forEach(cellRef => {
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = headerStyle;
  });
  
  // Shift the body styles down by one row
  for (let i = 3; i <= totalRows + 1; i++) {
    const fieldCell = `A${i}`;
    const valueCell = `B${i}`;
    
    if (!ws[fieldCell]) ws[fieldCell] = { t: 's', v: '' };
    ws[fieldCell].s = fieldNameStyle;
    
    if (!ws[valueCell]) ws[valueCell] = { t: 's', v: '' };
    
    // Apply number formatting to appropriate fields
    const fieldName = ws[fieldCell]?.v?.toString()?.toUpperCase() || '';
    const cellValue = ws[valueCell].v;
    
    if (
      fieldName.includes('AMOUNT') || 
      fieldName.includes('DISCOUNT') || 
      fieldName === 'NET'
    ) {
      try {
        if (!isNaN(Number(cellValue))) {
          ws[valueCell].t = 'n';
          ws[valueCell].v = Number(cellValue);
          ws[valueCell].s = numberValueStyle;
          continue;
        }
      } catch (e) {
        // If conversion fails, use standard styling
      }
    }
    
    ws[valueCell].s = fieldValueStyle;
  }
  
  // Update row heights for the new structure
  ws['!rows'] = [{ hpt: 30 }]; // Height for title row
  for (let i = 1; i <= totalRows; i++) {
    ws['!rows'][i] = { hpt: 25 }; // Height for data rows
  }
}