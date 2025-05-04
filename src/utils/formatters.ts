/**
 * Format dates to MM/DD/YYYY
 * Handles formats like "June 4 2007" → 06/04/2007 and "28/1/2001" → 01/28/2001
 */
export function formatDate(input: string): string {
  if (!input || input.trim() === '') return '';
  
  // Clean up the input
  input = input.trim().replace(/\s+/g, ' ');
  
  // Collection of month names and abbreviations
  const monthNames = [
    ["january", "jan"],
    ["february", "feb"],
    ["march", "mar"],
    ["april", "apr"],
    ["may"],
    ["june", "jun"],
    ["july", "jul"],
    ["august", "aug"],
    ["september", "sep", "sept"],
    ["october", "oct"],
    ["november", "nov"],
    ["december", "dec"]
  ];
  
  // Try different date formats
  
  // First try to match Month Day Year format (ex: June 4 2007)
  const textDateRegex = /(?:([a-z]+)\.?\s+(\d{1,2})(?:[a-z]{0,2})?(?:,?\s+|\s+,\s+)(\d{2,4}))/i;
  const textMatch = input.match(textDateRegex);
  
  if (textMatch) {
    const monthText = textMatch[1].toLowerCase();
    const day = parseInt(textMatch[2], 10);
    let year = parseInt(textMatch[3], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Find the month index
    let monthIndex = -1;
    for (let i = 0; i < monthNames.length; i++) {
      if (monthNames[i].some(name => monthText.startsWith(name))) {
        monthIndex = i;
        break;
      }
    }
    
    if (monthIndex !== -1) {
      // Month is 0-indexed in JS Date but we need 1-indexed for our format
      const month = monthIndex + 1;
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    }
  }
  
  // Try to match MM/DD/YYYY format
  const usDateRegex = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/;
  const usMatch = input.match(usDateRegex);
  
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    let year = parseInt(usMatch[3], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
  }
  
  // Try to match DD/MM/YYYY format
  const euDateRegex = /(\d{1,2})[.-](\d{1,2})[.-](\d{2,4})/;
  const euMatch = input.match(euDateRegex);
  
  if (euMatch) {
    const day = parseInt(euMatch[1], 10);
    const month = parseInt(euMatch[2], 10);
    let year = parseInt(euMatch[3], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // If day > 12 and month <= 12, it's likely DD/MM/YYYY
    // Otherwise, assume MM/DD/YYYY
    if (day > 12 && month <= 12) {
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    } else {
      // Assume MM/DD/YYYY format
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
  }
  
  // Try to match just Month Year format (ex: June 2007)
  const monthYearRegex = /([a-z]+)\.?\s+(\d{2,4})/i;
  const monthYearMatch = input.match(monthYearRegex);
  
  if (monthYearMatch) {
    const monthText = monthYearMatch[1].toLowerCase();
    let year = parseInt(monthYearMatch[2], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Find the month index
    let monthIndex = -1;
    for (let i = 0; i < monthNames.length; i++) {
      if (monthNames[i].some(name => monthText.startsWith(name))) {
        monthIndex = i;
        break;
      }
    }
    
    if (monthIndex !== -1) {
      // Month is 0-indexed in JS Date but we need 1-indexed for our format
      const month = monthIndex + 1;
      // Use the 15th as a default day when only month and year are provided
      return `${month.toString().padStart(2, '0')}/15/${year}`;
    }
  }
  
  // If we can't parse the date, return it unchanged
  return input;
}

/**
 * Generate initials from a name
 * Example: "John Stuard" → "J.S.", "Robert jr S" → "R.jr.S."
 */
export function generateInitials(name: string): string {
  if (!name || name.trim() === '') return '';
  
  // Split the name into parts and handle edge cases
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
  
  // Special case: If there's only one part and it's a single character
  if (parts.length === 1 && parts[0].length === 1) {
    return `${parts[0]}.`;
  }
  
  // Special case: If there are no valid parts
  if (parts.length === 0) {
    return '';
  }
  
  // Process each part of the name to generate initials
  return parts
    .map(part => {
      // Normalize the part (remove special characters except dots)
      const normalizedPart = part.replace(/[^a-zA-Z0-9.]/g, '');
      
      // If the part is empty after normalization, skip it
      if (normalizedPart.length === 0) {
        return '';
      }
      
      // If the part is already an initial (single character), just use it
      if (normalizedPart.length === 1) {
        return `${normalizedPart}.`;
      }
      
      // Handle special cases like "jr", "sr", "ii", "iii", etc. where we keep the whole word
      if (['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'vi'].includes(normalizedPart.toLowerCase())) {
        return `${normalizedPart}.`;
      }
      
      // Handle parts that already have periods (like "Ph.D.")
      if (normalizedPart.includes('.')) {
        return normalizedPart.endsWith('.') ? normalizedPart : `${normalizedPart}.`;
      }
      
      // Otherwise just take the first character
      return `${normalizedPart.charAt(0)}.`;
    })
    .filter(initial => initial.length > 0) // Filter out empty initials
    .join('');
}