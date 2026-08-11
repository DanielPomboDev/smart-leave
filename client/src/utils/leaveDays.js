import axios from '../services/api';

// Format a Date as YYYY-MM-DD (local time)
export const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Normalize a holiday list into a Set of YYYY-MM-DD strings.
// Accepts plain date strings or objects with `date_in_year` / `date` fields.
export const normalizeHolidays = (holidays) => {
  const set = new Set();
  if (!Array.isArray(holidays)) return set;
  holidays.forEach(h => {
    if (typeof h === 'string') set.add(h);
    else if (h && h.date_in_year) set.add(h.date_in_year);
    else if (h && h.date) set.add(String(h.date).slice(0, 10));
  });
  return set;
};

// Count working days (Mon–Fri, excluding non-working holidays) between two YYYY-MM-DD dates.
// Matches CS Form 6 6.C "Number of Working Days Applied For".
export const calculateLeaveDays = (start, end, holidays = []) => {
  const holidaySet = normalizeHolidays(holidays);
  if (start && end) {
    const partsS = String(start).split('-').map(Number);
    const partsE = String(end).split('-').map(Number);
    if (partsS.length === 3 && partsE.length === 3 && !partsS.some(isNaN) && !partsE.some(isNaN)) {
      const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
      const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
      if (e < s) return 1;

      let workingDays = 0;
      const current = new Date(s);
      while (current <= e) {
        const day = current.getDay();
        const dateStr = toDateStr(current);
        if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      return workingDays > 0 ? workingDays : 1;
    }
  }
  return 1;
};

// Calculate the adjusted end date for a given number of WORKING days
// (skips weekends and non-working holidays)
export const calculateAdjustedEndDate = (startDate, numberOfDays, holidays = []) => {
  const holidaySet = normalizeHolidays(holidays);
  const parts = String(startDate).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return startDate;
  const endDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  let remaining = Math.max(1, Math.floor(numberOfDays));
  while (remaining > 1) {
    endDateObj.setDate(endDateObj.getDate() + 1);
    const day = endDateObj.getDay();
    const dateStr = toDateStr(endDateObj);
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
      remaining--;
    }
  }
  return toDateStr(endDateObj);
};

// Fetch non-working holiday dates for a given year from the API
export const fetchHolidays = async (year) => {
  try {
    const response = await axios.get(`/api/holidays?year=${year}`);
    return response.data.holidays || [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
};
