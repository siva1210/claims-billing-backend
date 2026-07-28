// edi/payer.js

export function buildPayerLoop(payer) {
  return `NM1*PR*2*${payer.name}*****PI*${payer.payerId}~`;
}