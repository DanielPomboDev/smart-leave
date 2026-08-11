const Holiday = require('../models/Holiday');

// Format a Date as YYYY-MM-DD (local time, not UTC)
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse YYYY-MM-DD into a local Date
const parseDate = (str) => {
  const parts = String(str).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// All dates in a given year that fall on a holiday.
// Categories that are still working days (special_working) are excluded by default.
const getHolidayDates = async (year, { includeWorking = false } = {}) => {
  const holidays = await Holiday.find().exec();
  const result = { dates: [], holidays: [] };

  for (const holiday of holidays) {
    if (holiday.category === 'special_working' && !includeWorking) continue;

    const base = new Date(holiday.date);
    let effective;

    if (holiday.recurring) {
      // Same month/day every year
      effective = new Date(year, base.getMonth(), base.getDate());
    } else {
      // One-off: only applies in its own year
      if (base.getFullYear() !== year) continue;
      effective = base;
    }

    const dateStr = toDateStr(effective);
    result.dates.push(dateStr);
    result.holidays.push({
      name: holiday.name,
      date: dateStr,
      category: holiday.category
    });
  }

  return result;
};

// Check whether a specific YYYY-MM-DD string is a non-working holiday in that year
const isHoliday = async (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return false;
  const { dates } = await getHolidayDates(d.getFullYear());
  return dates.includes(dateStr);
};

module.exports = { getHolidayDates, isHoliday, toDateStr, parseDate };
