import { Router } from 'express';
import { pool } from '../db.js';
import { isFullyReady } from '../src/rules/ruleLogic.js';
import { buildISA, buildGS, buildST, buildBHT, buildBillingProviderHL, buildSubscriberHL } from '../src/edi/envelope.js';
import { getNextControlNumber } from '../src/edi/controlNumber.js';
import { buildBillingProviderLoop } from '../src/edi/billingProvider.js';
import { buildSubscriberLoop } from '../src/edi/subscriber.js';
import { buildPayerLoop } from '../src/edi/payer.js';
import { buildClaimSegment } from '../src/edi/claim.js';
import { buildServiceLineSegment } from '../src/edi/serviceLine.js';
import { buildSE, buildGE, buildIEA } from '../src/edi/closing.js';

const router = Router();

// Converts a flat DB row (from the claims JOIN query) into the nested
// claim shape the edi/ builder functions and isFullyReady() expect.
function mapRowToClaim(row) {
  return {
    claimId: row.claim_id,
    asamLevel: row.asam_level,
    eligibilityStatus: row.eligibility_status,
    ediErrors: row.edi_errors || [],
    patient: {
      memberId: row.member_id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      dob: row.dob,
      gender: row.gender,
      address: row.patient_address
    },
    provider: {
      name: row.provider_name,
      npi: row.npi,
      taxId: row.tax_id,
      address: row.provider_address,
      taxonomyCode: row.taxonomy_code
    },
    payer: {
      name: row.payer_name,
      payerId: row.payer_id
    },
    service: {
      dos: row.date_of_service,
      placeOfService: row.place_of_service,
      diagnosisCode: row.diagnosis_code,
      procedureCode: row.procedure_code,
      modifier: row.modifier,
      units: row.units,
      billedAmount: row.billed_amount,
      authNumber: row.auth_number
    }
  };
}

router.post('/generate', async (req, res) => {
  try {
    const [claimsResult, rulesResult] = await Promise.all([
      pool.query(`
        SELECT
          c.claim_id, c.date_of_service, c.place_of_service,
          c.diagnosis_code, c.procedure_code, c.modifier, c.units,
          c.billed_amount, c.auth_number, c.asam_level,
          c.eligibility_status, c.edi_errors,
          p.member_id, p.first_name, p.last_name, p.dob, p.gender, p.address AS patient_address,
          pr.name AS provider_name, pr.npi, pr.tax_id, pr.address AS provider_address, pr.taxonomy_code,
          pa.name AS payer_name, pa.payer_id
        FROM claims c
        JOIN patients p ON c.patient_id = p.id
        JOIN providers pr ON c.provider_id = pr.id
        JOIN payers pa ON c.payer_id = pa.id
      `),
      pool.query('SELECT payer, level, type, code FROM rules')
    ]);

    const allClaims = claimsResult.rows.map(mapRowToClaim);
    const rules = rulesResult.rows;

    const eligibleClaims = allClaims.filter(claim => isFullyReady(claim, rules));

    if (eligibleClaims.length === 0) {
      return res.status(400).json({ error: 'No eligible, fully-complete, rule-compliant claims to generate.' });
    }

    const controlNumber = await getNextControlNumber();

    const isaSegment = buildISA(controlNumber, 'SUBMITTERID', 'AVAILITYRECV');
    const gsSegment = buildGS(controlNumber, 'SUBMITTERID', 'AVAILITYRECV');

    // Loop 2000A: Billing Provider HL, then the billing provider's own segments.
    const billingProviderBlock = [
      buildBillingProviderHL(),
      buildBillingProviderLoop(eligibleClaims[0].provider)
    ].join('\n');

    // Loop 2000B: one Subscriber HL per claim (hlId starts at 2, since
    // the billing provider's HL took id 1), followed by that claim's
    // subscriber/payer/claim/service-line segments.
    const perClaimBlocks = eligibleClaims.map((claim, index) => {
      const hlId = index + 2;
      return [
        buildSubscriberHL(hlId),
        buildSubscriberLoop(claim.patient),
        buildPayerLoop(claim.payer),
        buildClaimSegment(claim),
        buildServiceLineSegment(claim.service)
      ].join('\n');
    });

    const transactionSegments = [
      buildST(controlNumber),
      buildBHT(controlNumber),
      billingProviderBlock,
      ...perClaimBlocks
    ];
    const transactionContent = transactionSegments.join('\n');

    const segmentCount = transactionContent.split('~').filter(seg => seg.trim() !== '').length + 1;

    const seSegment = buildSE(segmentCount, controlNumber);
    const geSegment = buildGE(controlNumber);
    const ieaSegment = buildIEA(controlNumber);

    const fullEdiFile = [isaSegment, gsSegment, transactionContent, seSegment, geSegment, ieaSegment].join('\n');

    res.json({ controlNumber, claimCount: eligibleClaims.length, ediContent: fullEdiFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;