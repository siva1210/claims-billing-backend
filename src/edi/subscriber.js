import { parseAddress } from './utils.js';

function formatDOB(dobString) {
  // Expects "YYYY-MM-DD" → returns "YYYYMMDD"
  return (dobString || '').replace(/-/g, '');
}

export function buildSubscriberLoop(patient) {
  const { street, city, state, zip } = parseAddress(patient.address);
  const dob = formatDOB(patient.dob);

  const sbr = `SBR*P*18*******CI~`;
  const nm1 = `NM1*IL*1*${patient.lastName}*${patient.firstName}****MI*${patient.memberId}~`;
  const n3 = `N3*${street}~`;
  const n4 = `N4*${city}*${state}*${zip}~`;
  const dmg = `DMG*D8*${dob}*${patient.gender}~`;

  return [sbr, nm1, n3, n4, dmg].join('\n');
}