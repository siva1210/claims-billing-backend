CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  npi TEXT NOT NULL UNIQUE,
  tax_id TEXT,
  address TEXT,
  taxonomy_code TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  payer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  claim_id TEXT NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  payer_id INTEGER NOT NULL REFERENCES payers(id),
  date_of_service DATE NOT NULL,
  place_of_service TEXT,
  diagnosis_code TEXT,
  procedure_code TEXT,
  modifier TEXT,
  units INTEGER,
  billed_amount NUMERIC(10,2),
  auth_number TEXT,
  asam_level TEXT,
  eligibility_status TEXT,
  validation_errors JSONB DEFAULT '[]',
  edi_errors JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE rules (
  id SERIAL PRIMARY KEY,
  payer TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE edi_control_number (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO edi_control_number (id, current_value) VALUES (1, 0);