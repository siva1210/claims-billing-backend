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