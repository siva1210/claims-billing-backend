// edi/envelope.js
function pad(str, len) {
  return (str || '').toString().padEnd(len, ' ').slice(0, len);
}
function formatDate(date, fmt) {
  const d = date ? new Date(date) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return fmt === 'YYMMDD' ? `${yy}${mm}${dd}` : `${yyyy}${mm}${dd}`;
}
export function buildISA(controlNumber, submitterId, receiverId) {
  const date = formatDate(new Date(), 'YYMMDD');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const ctrl = String(controlNumber).padStart(9, '0');
  return [
    'ISA', '00', pad('', 10), '00', pad('', 10),
    'ZZ', pad(submitterId, 15),
    'ZZ', pad(receiverId, 15),
    date, time, '^', '00501', ctrl, '0', 'T', ':'
  ].join('*') + '~';
}
export function buildGS(controlNumber, submitterId, receiverId) {
  const date = formatDate(new Date(), 'CCYYMMDD');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  return [
    'GS', 'HC', submitterId, receiverId,
    date, time, controlNumber, 'X', '005010X222A1'
  ].join('*') + '~';
}
export function buildST(controlNumber) {
  return `ST*837*${String(controlNumber).padStart(4, '0')}*005010X222A1~`;
}
export function buildBHT(controlNumber) {
  const date = formatDate(new Date(), 'CCYYMMDD');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  return `BHT*0019*00*${controlNumber}*${date}*${time}*CH~`;
}
// Loop 2000A — Billing Provider Hierarchical Level.
// HL01=1 (this loop's own ID), HL02 blank (top of hierarchy, no parent),
// HL03=20 (Information Source level code), HL04=1 (has a subordinate HL, i.e. subscribers).
export function buildBillingProviderHL() {
  return `HL*1**20*1~`;
}
// Loop 2000B — Subscriber Hierarchical Level, one per claim/subscriber.
// hlId increments per subscriber (2, 3, 4...). HL02=1 always, since the
// billing provider (HL01=1) is every subscriber's parent in this single-provider-per-batch design.
// HL03=22 (Subscriber level code), HL04=0 (no further child HL, patient = subscriber here).
export function buildSubscriberHL(hlId) {
  return `HL*${hlId}*1*22*0~`;
}