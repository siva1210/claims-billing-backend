import { sanitizeAmount } from './utils.js';

export function buildServiceLineSegment(service) {
  const amount = sanitizeAmount(service.billedAmount);
  const procCode = service.modifier
    ? `HC:${service.procedureCode}:${service.modifier}`
    : `HC:${service.procedureCode}`;

  const sv1 = `SV1*${procCode}*${amount}*UN*${service.units}***1~`;

  return sv1;
}