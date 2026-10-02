-- =============================================================================
-- ATS PLURIX 360° | MVP 1: Operação e Governança de R&S
-- Schema DDL em PostgreSQL (Serverless Supabase Compatible)
-- =============================================================================

-- 1. Tabela de Vagas
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  business_unit TEXT NOT NULL,
  department TEXT NOT NULL,
  hiring_manager TEXT,
  headcount_type TEXT NOT NULL DEFAULT 'Substituição',
  selection_type TEXT NOT NULL,
  work_model TEXT NOT NULL DEFAULT 'Presencial',
  positions_count INTEGER NOT NULL DEFAULT 1,
  salary_min NUMERIC(10, 2),
  salary_max NUMERIC(10, 2),
  is_pcd BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Alinhamento',
  stage_sla_days INTEGER NOT NULL DEFAULT 4,
  opened_by_role TEXT NOT NULL CHECK (opened_by_role IN ('BP', 'GESTORA_RH')),
  bp_in_charge_email TEXT NOT NULL,
  recruiter_email TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  observation TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min NUMERIC(10, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max NUMERIC(10, 2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_model TEXT DEFAULT 'Presencial';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS positions_count INTEGER DEFAULT 1;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS comment TEXT;

-- 2. Tabela de Candidatos
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  source TEXT NOT NULL,
  linkedin TEXT,
  comment TEXT,
  resume_url TEXT,
  resume_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_name TEXT;

-- 3. Tabela de Candidaturas
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'Aguardando Conexão / LinkedIn',
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  rejection_reason TEXT,
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- 4. Histórico e Auditoria Temporal de Candidatos (INSERT-Only)
CREATE TABLE IF NOT EXISTS stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_stage TEXT NOT NULL,
  new_stage TEXT NOT NULL,
  status_at_move TEXT NOT NULL,
  feedback TEXT,
  moved_by TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 0,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Histórico e Auditoria de Vagas (INSERT-Only)
CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  observation TEXT,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices recomendados para performance de pesquisa e auditoria
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter ON jobs(recruiter_email);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_app ON stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_job_history_job ON job_history(job_id);

-- Politicas de Segurança Row Level Security (RLS) para o Supabase
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso total a jobs') THEN
    CREATE POLICY "Acesso total a jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso total a candidates') THEN
    CREATE POLICY "Acesso total a candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso total a applications') THEN
    CREATE POLICY "Acesso total a applications" ON applications FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso total a stage_history') THEN
    CREATE POLICY "Acesso total a stage_history" ON stage_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso total a job_history') THEN
    CREATE POLICY "Acesso total a job_history" ON job_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

