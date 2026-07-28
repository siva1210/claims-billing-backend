// edi/utils.js
// Shared low-level formatting helpers used across multiple EDI segment builders.

export function sanitizeAmount(amount) {
  // Strip anything that isn't a digit or decimal point, then ensure 2 decimal places
  const num = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
  return num.toFixed(2);
}

export function parseAddress(addressString) {
  // Expects: "Street, City, State ZIP"
  const parts = (addressString || '').split(',').map(p => p.trim());
  const street = parts[0] || '';
  const city = parts[1] || '';
  const stateZip = (parts[2] || '').split(' ').filter(Boolean);
  const state = stateZip[0] || '';
  const zip = stateZip[1] || '';
  return { street, city, state, zip };
}