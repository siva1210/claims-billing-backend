// edi/closing.js

export function buildSE(segmentCount, controlNumber) {
  return `SE*${segmentCount}*${String(controlNumber).padStart(4, '0')}~`;
}

export function buildGE(controlNumber) {
  return `GE*1*${controlNumber}~`;
}

export function buildIEA(controlNumber) {
  return `IEA*1*${String(controlNumber).padStart(9, '0')}~`;
}