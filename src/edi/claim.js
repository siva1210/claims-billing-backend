import { sanitizeAmount } from './utils.js';

export function buildClaimSegment(claim) {
  const amount = sanitizeAmount(claim.service.billedAmount);
  const clm = `CLM*${claim.claimId}*${amount}***${claim.service.placeOfService}:B:1*Y*A*Y*Y~`;
  const hi = `HI*ABK:${claim.service.diagnosisCode}~`;

  return [clm, hi].join('\n');
}