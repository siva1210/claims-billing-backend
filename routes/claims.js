import { Router } from 'express';
import { pool } from '../db.js';
import { validateForEligibility, validateForEdi } from '../src/validation/claimValidation.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.claim_id, c.date_of_service, c.place_of_service,
        c.diagnosis_code, c.procedure_code, c.modifier, c.units,
        c.billed_amount, c.auth_number, c.asam_level,
        c.eligibility_status, c.validation_errors, c.edi_errors,
        p.member_id, p.first_name, p.last_name, p.dob, p.gender, p.address AS patient_address,
        pr.name AS provider_name, pr.npi, pr.tax_id, pr.address AS provider_address, pr.taxonomy_code,
        pa.name AS payer_name, pa.payer_id
      FROM claims c
      JOIN patients p ON c.patient_id = p.id
      JOIN providers pr ON c.provider_id = pr.id
      JOIN payers pa ON c.payer_id = pa.id
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Looks up a patient by member_id, inserting one if it doesn't exist yet.
// Returns the patient's id either way.
async function upsertPatient(client, patient) {
  const result = await client.query(
    `INSERT INTO patients (member_id, first_name, last_name, dob, gender, address)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (member_id) DO UPDATE SET member_id = EXCLUDED.member_id
     RETURNING id`,
    [patient.memberId, patient.firstName, patient.lastName, patient.dob, patient.gender, patient.address]
  );
  return result.rows[0].id;
}

async function upsertProvider(client, provider) {
  const result = await client.query(
    `INSERT INTO providers (name, npi, tax_id, address, taxonomy_code)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (npi) DO UPDATE SET npi = EXCLUDED.npi
     RETURNING id`,
    [provider.name, provider.npi, provider.taxId, provider.address, provider.taxonomyCode]
  );
  return result.rows[0].id;
}

async function upsertPayer(client, payer) {
  const result = await client.query(
    `INSERT INTO payers (name, payer_id)
     VALUES ($1, $2)
     ON CONFLICT (payer_id) DO UPDATE SET payer_id = EXCLUDED.payer_id
     RETURNING id`,
    [payer.name, payer.payerId]
  );
  return result.rows[0].id;
}

router.post('/', async (req, res) => {
  const { claims } = req.body;

  if (!Array.isArray(claims) || claims.length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "claims" array.' });
  }

  const client = await pool.connect();
  const insertedClaimIds = [];

  try {
    await client.query('BEGIN');

    for (const claim of claims) {
      const patientId = await upsertPatient(client, claim.patient);
      const providerId = await upsertProvider(client, claim.provider);
      const payerId = await upsertPayer(client, claim.payer);

      // Mirror ExcelUpload.jsx's mapRowToClaim(): build fullName from
      // firstName + lastName if it wasn't already provided.
      if (!claim.patient.fullName) {
        claim.patient.fullName = `${claim.patient.firstName} ${claim.patient.lastName}`.trim();
      }

      // Recompute validation server-side rather than trusting whatever
      // the client sent — the server is the source of truth here.
      const validationErrors = validateForEligibility(claim);
      const ediErrors = validateForEdi(claim);

      const claimResult = await client.query(
        `INSERT INTO claims (
           claim_id, patient_id, provider_id, payer_id,
           date_of_service, place_of_service, diagnosis_code, procedure_code,
           modifier, units, billed_amount, auth_number, asam_level,
           eligibility_status, validation_errors, edi_errors
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (claim_id) DO UPDATE SET
           patient_id = EXCLUDED.patient_id,
           provider_id = EXCLUDED.provider_id,
           payer_id = EXCLUDED.payer_id,
           date_of_service = EXCLUDED.date_of_service,
           place_of_service = EXCLUDED.place_of_service,
           diagnosis_code = EXCLUDED.diagnosis_code,
           procedure_code = EXCLUDED.procedure_code,
           modifier = EXCLUDED.modifier,
           units = EXCLUDED.units,
           billed_amount = EXCLUDED.billed_amount,
           auth_number = EXCLUDED.auth_number,
           asam_level = EXCLUDED.asam_level,
           eligibility_status = EXCLUDED.eligibility_status,
           validation_errors = EXCLUDED.validation_errors,
           edi_errors = EXCLUDED.edi_errors,
           updated_at = now()
         RETURNING id, claim_id`,
        [
          claim.claimId, patientId, providerId, payerId,
          claim.service.dos, claim.service.placeOfService, claim.service.diagnosisCode, claim.service.procedureCode,
          claim.service.modifier, claim.service.units, claim.service.billedAmount, claim.service.authNumber, claim.asamLevel,
          claim.eligibilityStatus, JSON.stringify(validationErrors), JSON.stringify(ediErrors)
        ]
      );

      insertedClaimIds.push(claimResult.rows[0].claim_id);
    }

    await client.query('COMMIT');
    res.status(201).json({ inserted: insertedClaimIds.length, claimIds: insertedClaimIds });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { patient, provider, service, eligibilityStatus } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Look up the claim to get its patient_id/provider_id
    const claimLookup = await client.query('SELECT patient_id, provider_id FROM claims WHERE id = $1', [id]);
    if (claimLookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `No claim found with id ${id}` });
    }
    const { patient_id, provider_id } = claimLookup.rows[0];

    if (patient) {
      await client.query(
        `UPDATE patients SET first_name = $1, last_name = $2, member_id = $3, dob = $4 WHERE id = $5`,
        [patient.firstName, patient.lastName, patient.memberId, patient.dob, patient_id]
      );
    }

    if (provider) {
      await client.query(
        `UPDATE providers SET name = $1, npi = $2 WHERE id = $3`,
        [provider.name, provider.npi, provider_id]
      );
    }

    if (service) {
      await client.query(
        `UPDATE claims SET
           procedure_code = $1, diagnosis_code = $2,
           billed_amount = $3, auth_number = $4,
           eligibility_status = NULL, updated_at = now()
         WHERE id = $5`,
        [service.procedureCode, service.diagnosisCode, service.billedAmount, service.authNumber, id]
      );
    }

    if (eligibilityStatus !== undefined) {
      await client.query(
        `UPDATE claims SET eligibility_status = $1, updated_at = now() WHERE id = $2`,
        [eligibilityStatus, id]
      );
    }

    await client.query('COMMIT');
    res.json({ updated: id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM claims');
    res.json({ message: 'All claims deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM claims WHERE id = $1 RETURNING id, claim_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No claim found with id ${req.params.id}` });
    }

    res.json({ deleted: result.rows[0].claim_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;