export function isDxFlagged(rules, claim) {
  return rules.some(r =>
    r.payer === claim.payer.name &&
    r.level === claim.asamLevel &&
    r.type === 'DX' &&
    r.code === claim.service.diagnosisCode
  );
}

export function isFullyReady(claim, rules) {
  const isEdiReady = claim.eligibilityStatus === 'eligible' && claim.ediErrors.length === 0;
  return isEdiReady && !isDxFlagged(rules, claim);
}