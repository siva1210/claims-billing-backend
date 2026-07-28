import { parseAddress } from './utils.js';

export function buildBillingProviderLoop(provider) {
  const { street, city, state, zip } = parseAddress(provider.address);

  const nm1 = `NM1*85*2*${provider.name}*****XX*${provider.npi}~`;
  const n3 = `N3*${street}~`;
  const n4 = `N4*${city}*${state}*${zip}~`;
  const ref = `REF*EI*${provider.taxId}~`;
  const prv = `PRV*BI*PXC*${provider.taxonomyCode}~`;

  return [nm1, n3, n4, ref, prv].join('\n');
}