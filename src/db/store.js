// =============================================================================
// ATS PLURIX 360° | Persistência Relacional Serverless (LocalStorage / Memory Engine)
// =============================================================================

import { INITIAL_JOBS, INITIAL_CANDIDATES, INITIAL_APPLICATIONS, INITIAL_STAGE_HISTORY, INITIAL_JOB_HISTORY } from './seedData.js';

const STORAGE_KEY = 'ats_plurix_360_db_v1';

class DataStore {
  constructor() {
    this.jobs = [];
    this.candidates = [];
    this.applications = [];
    this.stageHistory = [];
    this.jobHistory = [];
    this.init();
  }

  init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.jobs = parsed.jobs || [];
        this.candidates = parsed.candidates || [];
        this.applications = parsed.applications || [];
        this.stageHistory = parsed.stageHistory || [];
        this.jobHistory = parsed.jobHistory || [];
        return;
      }
    } catch (e) {
      console.warn('Falha ao ler LocalStorage, inicializando com dados padrões:', e);
    }
    this.seed();
  }

  seed() {
    this.jobs = JSON.parse(JSON.stringify(INITIAL_JOBS));
    this.candidates = JSON.parse(JSON.stringify(INITIAL_CANDIDATES));
    this.applications = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS));
    this.stageHistory = JSON.parse(JSON.stringify(INITIAL_STAGE_HISTORY));
    this.jobHistory = JSON.parse(JSON.stringify(INITIAL_JOB_HISTORY));
    this.save();
  }

  reset() {
    this.seed();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        jobs: this.jobs,
        candidates: this.candidates,
        applications: this.applications,
        stageHistory: this.stageHistory,
        jobHistory: this.jobHistory
      }));
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Jobs API
  // ---------------------------------------------------------------------------
  getJobs() {
    return [...this.jobs];
  }

  getJobById(id) {
    return this.jobs.find(j => j.id === id) || null;
  }

  createJob(jobData) {
    // Generate next VAG-XXX code
    const existingNums = this.jobs
      .map(j => parseInt(j.id.replace('VAG-', ''), 10))
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 100;
    const newId = `VAG-${maxNum + 1}`;

    const newJob = {
      id: newId,
      title: jobData.title,
      business_unit: jobData.business_unit,
      department: jobData.department,
      hiring_manager: jobData.hiring_manager || null,
      headcount_type: jobData.headcount_type || 'Substituição',
      selection_type: jobData.selection_type,
      is_pcd: !!jobData.is_pcd,
      status: jobData.status || 'Alinhamento',
      stage_sla_days: Number(jobData.stage_sla_days) || 4,
      opened_by_role: jobData.opened_by_role, // MUST BE 'BP' or 'GESTORA_RH'
      bp_in_charge_email: jobData.bp_in_charge_email,
      recruiter_email: jobData.recruiter_email || null,
      is_confidential: !!jobData.is_confidential,
      observation: jobData.observation || '',
      opened_at: new Date().toISOString(),
      closed_at: null
    };

    this.jobs.unshift(newJob);

    // Initial audit log for Job Creation
    this.addJobHistoryRecord({
      job_id: newId,
      previous_status: 'Abertura de Vaga',
      new_status: newJob.status,
      observation: jobData.observation || 'Requisição de vaga criada no sistema.',
      changed_by: jobData.created_by || jobData.bp_in_charge_email || 'Sistema ATS'
    });

    this.save();
    return newJob;
  }

  updateJob(id, updates, auditMeta = {}) {
    const jobIndex = this.jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return null;

    const previousJob = { ...this.jobs[jobIndex] };

    this.jobs[jobIndex] = {
      ...this.jobs[jobIndex],
      ...updates
    };

    // If status changed or audit note provided, write audit log
    if (updates.status && updates.status !== previousJob.status) {
      this.addJobHistoryRecord({
        job_id: id,
        previous_status: previousJob.status,
        new_status: updates.status,
        observation: auditMeta.observation || updates.observation || `Status alterado de "${previousJob.status}" para "${updates.status}".`,
        changed_by: auditMeta.changed_by || 'Sistema ATS'
      });
    } else if (auditMeta.observation) {
      this.addJobHistoryRecord({
        job_id: id,
        previous_status: previousJob.status,
        new_status: previousJob.status,
        observation: auditMeta.observation,
        changed_by: auditMeta.changed_by || 'Sistema ATS'
      });
    }

    this.save();
    return this.jobs[jobIndex];
  }

  // ---------------------------------------------------------------------------
  // Job History & Audit API (INSERT-Only)
  // ---------------------------------------------------------------------------
  addJobHistoryRecord(record) {
    const newRecord = {
      id: `job-hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      job_id: record.job_id,
      previous_status: record.previous_status || null,
      new_status: record.new_status,
      observation: record.observation || '',
      changed_by: record.changed_by,
      changed_at: record.changed_at || new Date().toISOString()
    };

    this.jobHistory.unshift(newRecord);
    this.save();
    return newRecord;
  }

  getJobHistoryByJobId(jobId) {
    return this.jobHistory
      .filter(h => h.job_id === jobId)
      .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
  }

  // ---------------------------------------------------------------------------
  // Candidates API (RN-01: Deduplicação por Email)
  // ---------------------------------------------------------------------------
  getCandidates() {
    return [...this.candidates];
  }

  findCandidateByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return this.candidates.find(c => c.email.trim().toLowerCase() === normalized) || null;
  }

  createOrGetCandidate(candData) {
    const existing = this.findCandidateByEmail(candData.email);
    if (existing) {
      return { candidate: existing, created: false };
    }

    const newCandidate = {
      id: `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      full_name: candData.full_name,
      email: candData.email.trim().toLowerCase(),
      phone: candData.phone || '',
      source: candData.source,
      created_at: new Date().toISOString()
    };

    this.candidates.unshift(newCandidate);
    this.save();
    return { candidate: newCandidate, created: true };
  }

  // ---------------------------------------------------------------------------
  // Applications API (RN-02: Candidatura Exclusiva Vaga x Candidato)
  // ---------------------------------------------------------------------------
  getApplications() {
    return this.applications.map(app => {
      const job = this.getJobById(app.job_id);
      const candidate = this.candidates.find(c => c.id === app.candidate_id);
      return {
        ...app,
        job,
        candidate
      };
    });
  }

  getApplicationById(id) {
    const app = this.applications.find(a => a.id === id);
    if (!app) return null;
    return {
      ...app,
      job: this.getJobById(app.job_id),
      candidate: this.candidates.find(c => c.id === app.candidate_id)
    };
  }

  createApplication(jobId, candidateId) {
    // Check UNIQUE constraint
    const existing = this.applications.find(a => a.job_id === jobId && a.candidate_id === candidateId);
    if (existing) {
      throw new Error('RN-02: Candidato já possui candidatura registrada nesta vaga.');
    }

    const newApp = {
      id: `app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      job_id: jobId,
      candidate_id: candidateId,
      current_stage: 'Aguardando Conexão / LinkedIn',
      status: 'EM_ANDAMENTO',
      rejection_reason: null,
      stage_entered_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    this.applications.unshift(newApp);

    // Initial audit trail record
    this.addStageHistoryRecord({
      application_id: newApp.id,
      previous_stage: 'Cadastro Inicial',
      new_stage: newApp.current_stage,
      status_at_move: 'EM_ANDAMENTO',
      feedback: 'Candidatura registrada no sistema ATS Plurix 360°.',
      moved_by: 'Sistema ATS',
      duration_days: 0
    });

    this.save();
    return newApp;
  }

  // ---------------------------------------------------------------------------
  // Pipeline Movement & Stage History (RN-03 Imutabilidade & CA-04, CA-05)
  // ---------------------------------------------------------------------------
  moveApplicationStage(applicationId, { newStage, newStatus, feedback, movedBy }) {
    const appIndex = this.applications.findIndex(a => a.id === applicationId);
    if (appIndex === -1) {
      throw new Error('Candidatura não encontrada.');
    }

    const app = this.applications[appIndex];
    const previousStage = app.current_stage;
    const now = new Date();
    const stageEnteredDate = new Date(app.stage_entered_at);

    // Duration in previous stage (days)
    const durationMs = now.getTime() - stageEnteredDate.getTime();
    const durationDays = Math.max(0, Math.floor(durationMs / 86400000));

    // Update application stage & status and RESET stage_entered_at (CA-05)
    this.applications[appIndex] = {
      ...app,
      current_stage: newStage,
      status: newStatus || app.status,
      stage_entered_at: now.toISOString() // Resets clock against job stage_sla_days
    };

    // INSERT-only into stage_history (RN-03, CA-04)
    this.addStageHistoryRecord({
      application_id: applicationId,
      previous_stage: previousStage,
      new_stage: newStage,
      status_at_move: newStatus || app.status,
      feedback: feedback || '',
      moved_by: movedBy,
      duration_days: durationDays,
      moved_at: now.toISOString()
    });

    this.save();
    return this.applications[appIndex];
  }

  // Alias method for updateApplicationStage
  updateApplicationStage(applicationId, params) {
    return this.moveApplicationStage(applicationId, params);
  }

  // INSERT-Only to stage_history
  addStageHistoryRecord(record) {
    const newRecord = {
      id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      application_id: record.application_id,
      previous_stage: record.previous_stage,
      new_stage: record.new_stage,
      status_at_move: record.status_at_move,
      feedback: record.feedback || '',
      moved_by: record.moved_by,
      duration_days: record.duration_days || 0,
      moved_at: record.moved_at || new Date().toISOString()
    };

    this.stageHistory.unshift(newRecord);
    this.save();
    return newRecord;
  }

  getStageHistoryByApplication(applicationId) {
    return this.stageHistory
      .filter(h => h.application_id === applicationId)
      .sort((a, b) => new Date(b.moved_at) - new Date(a.moved_at));
  }

  // ---------------------------------------------------------------------------
  // Apuração Determinística de SLA (RN-08)
  // ---------------------------------------------------------------------------
  calculateSLA(application, job) {
    if (!application || !job) {
      return { code: 'NO_PRAZO', badgeClass: 'badge-a', label: 'No Prazo', days: 0, limit: 4 };
    }

    const enteredAt = new Date(application.stage_entered_at);
    const now = new Date();
    const daysInStage = Math.floor((now.getTime() - enteredAt.getTime()) / 86400000);
    const slaLimit = job.stage_sla_days || 4;

    if (daysInStage > slaLimit) {
      return {
        code: 'ESTOURADO',
        badgeClass: 'badge-c',
        label: `Estourado (${daysInStage}/${slaLimit} dias)`,
        days: daysInStage,
        limit: slaLimit
      };
    } else if (daysInStage >= slaLimit - 1) {
      return {
        code: 'ATENCAO',
        badgeClass: 'badge-b',
        label: `Atenção (${daysInStage}/${slaLimit} dias)`,
        days: daysInStage,
        limit: slaLimit
      };
    } else {
      return {
        code: 'NO_PRAZO',
        badgeClass: 'badge-a',
        label: `No Prazo (${daysInStage}/${slaLimit} dias)`,
        days: daysInStage,
        limit: slaLimit
      };
    }
  }
}

export const store = new DataStore();
