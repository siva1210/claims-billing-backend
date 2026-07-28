const eligibilityRequiredFields = [
  { path: ['patient', 'memberId'], label: 'Member ID' },
  { path: ['patient', 'fullName'], label: 'Patient Name' },
  { path: ['patient', 'dob'], label: 'Date of Birth' }
];

const claimRequiredFields = [
  { path: ['provider', 'npi'], label: 'Provider NPI' },
  { path: ['provider', 'name'], label: 'Provider Name' },
  { path: ['patient', 'memberId'], label: 'Member ID' },
  { path: ['patient', 'fullName'], label: 'Patient Name' },
  { path: ['patient', 'dob'], label: 'Date of Birth' },
  { path: ['service', 'procedureCode'], label: 'Procedure Code' },
  { path: ['service', 'diagnosisCode'], label: 'Diagnosis Code' },
  { path: ['service', 'billedAmount'], label: 'Billed Amount' },
  { path: ['service', 'authNumber'], label: 'Auth Number' }
];

function checkFields(claim, fields) {
  const errors = [];
  fields.forEach(field => {
    const value = field.path.reduce((obj, key) => obj?.[key], claim);
    if (!value) {
      errors.push(field.label);
    }
  });
  return errors;
}

export function validateForEligibility(claim) {
  return checkFields(claim, eligibilityRequiredFields);
}

export function validateForEdi(claim) {
  return checkFields(claim, claimRequiredFields);
}

// Single source of truth: a claim is EDI-ready only if it's both
// eligible AND has every field the 837P standard requires.
export function isEdiReady(claim) {
  return claim.eligibilityStatus === "eligible" &&
    claim.ediErrors &&
    claim.ediErrors.length === 0;
}