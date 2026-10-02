// =============================================================================
// ATS PLURIX 360° | Persistência Relacional Serverless (LocalStorage / Memory Engine)
// =============================================================================

import { INITIAL_JOBS, INITIAL_CANDIDATES, INITIAL_APPLICATIONS, INITIAL_STAGE_HISTORY, INITIAL_JOB_HISTORY } from './seedData.js';
import { supabaseService } from '../services/supabaseService.js';
import { isSupabaseConfigured } from './supabaseClient.js';


export function formatSalaryRange(salaryMin, salaryMax) {
  const min = (salaryMin !== null && salaryMin !== undefined && salaryMin !== '') ? Number(salaryMin) : null;
  const max = (salaryMax !== null && salaryMax !== undefined && salaryMax !== '') ? Number(salaryMax) : null;

  if (min && max) {
    return `R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - R$ ${max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (min) {
    return `A partir de R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (max) {
    return `Até R$ ${max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  return 'A combinar';
}

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

  async loadFromSupabase() {
    if (!isSupabaseConfigured()) return;
    try {
      const [jobs, candidates, applications, stageHistory, jobHistory] = await Promise.all([
        supabaseService.getJobs(),
        supabaseService.getCandidates(),
        supabaseService.getApplications(),
        supabaseService.getAllStageHistory(),
        supabaseService.getAllJobHistory()
      ]);

      if (jobs && jobs.length > 0) this.jobs = jobs;
      if (candidates && candidates.length > 0) this.candidates = candidates;
      if (applications && applications.length > 0) this.applications = applications;
      if (stageHistory && stageHistory.length > 0) this.stageHistory = stageHistory;
      if (jobHistory && jobHistory.length > 0) this.jobHistory = jobHistory;

      this.save();
    } catch (e) {
      console.warn('Falha ao carregar dados do Supabase:', e);
    }
  }

  syncCandidateAndApplication(candidate, application) {
    if (candidate) {
      const existingIdx = this.candidates.findIndex(c => c.id === candidate.id || c.email === candidate.email);
      if (existingIdx >= 0) {
        this.candidates[existingIdx] = { ...this.candidates[existingIdx], ...candidate };
      } else {
        this.candidates.unshift(candidate);
      }
    }
    if (application) {
      const existingAppIdx = this.applications.findIndex(a => a.id === application.id);
      if (existingAppIdx >= 0) {
        this.applications[existingAppIdx] = { ...this.applications[existingAppIdx], ...application };
      } else {
        this.applications.unshift(application);
      }
    }
    this.save();
  }

  syncJob(job) {
    if (!job) return;
    const idx = this.jobs.findIndex(j => j.id === job.id);
    if (idx >= 0) {
      this.jobs[idx] = { ...this.jobs[idx], ...job };
    } else {
      this.jobs.unshift(job);
    }
    this.save();
  }

  syncApplication(application) {
    if (!application) return;
    const idx = this.applications.findIndex(a => a.id === application.id);
    if (idx >= 0) {
      this.applications[idx] = { ...this.applications[idx], ...application };
    } else {
      this.applications.unshift(application);
    }
    this.save();
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
      work_model: jobData.work_model || 'Presencial',
      positions_count: (jobData.positions_count && Number(jobData.positions_count) > 0) ? Number(jobData.positions_count) : 1,
      salary_min: (jobData.salary_min !== undefined && jobData.salary_min !== '' && jobData.salary_min !== null) ? Number(jobData.salary_min) : null,
      salary_max: (jobData.salary_max !== undefined && jobData.salary_max !== '' && jobData.salary_max !== null) ? Number(jobData.salary_max) : null,
      is_pcd: !!jobData.is_pcd,
      status: jobData.status || 'Alinhamento',
      stage_sla_days: Number(jobData.stage_sla_days) || 4,
      opened_by_role: jobData.opened_by_role, // MUST BE 'BP' or 'GESTORA_RH'
      bp_in_charge_email: jobData.bp_in_charge_email,
      recruiter_email: jobData.recruiter_email || null,
      is_confidential: !!jobData.is_confidential,
      observation: jobData.observation || '',
      description: jobData.description || '',
      comment: jobData.comment || '',
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
      linkedin: candData.linkedin || '',
      comment: candData.comment || '',
      resume_url: candData.resume_url || null,
      resume_name: candData.resume_name || null,
      created_at: new Date().toISOString()
    };

    this.candidates.unshift(newCandidate);
    this.save();
    return { candidate: newCandidate, created: true };
  }

  updateCandidate(candidateId, updates) {
    const idx = this.candidates.findIndex(c => c.id === candidateId || (updates.originalEmail && c.email === updates.originalEmail));
    if (idx === -1) return null;

    const oldCand = this.candidates[idx];
    const newEmail = updates.email ? updates.email.trim().toLowerCase() : oldCand.email;

    this.candidates[idx] = {
      ...oldCand,
      full_name: updates.full_name !== undefined ? updates.full_name : oldCand.full_name,
      email: newEmail,
      phone: updates.phone !== undefined ? updates.phone : oldCand.phone,
      source: updates.source !== undefined ? updates.source : oldCand.source,
      linkedin: updates.linkedin !== undefined ? updates.linkedin : oldCand.linkedin,
      comment: updates.comment !== undefined ? updates.comment : oldCand.comment,
      resume_url: updates.resume_url !== undefined ? updates.resume_url : oldCand.resume_url,
      resume_name: updates.resume_name !== undefined ? updates.resume_name : oldCand.resume_name
    };

    const updatedCand = this.candidates[idx];

    // Sync candidate reference in applications list
    this.applications.forEach(app => {
      if (app.candidate_id === updatedCand.id || (app.candidate && app.candidate.email === oldCand.email)) {
        app.candidate = { ...updatedCand };
      }
    });

    this.save();
    return updatedCand;
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

  // ---------------------------------------------------------------------------
  // Deletion APIs
  // ---------------------------------------------------------------------------
  deleteApplication(id) {
    this.applications = this.applications.filter(a => a.id !== id);
    this.stageHistory = this.stageHistory.filter(h => h.application_id !== id);
    this.save();
    return true;
  }

  deleteCandidate(candidateId) {
    const candApps = this.applications.filter(a => a.candidate_id === candidateId);
    const appIds = candApps.map(a => a.id);
    
    this.candidates = this.candidates.filter(c => c.id !== candidateId);
    this.applications = this.applications.filter(a => a.candidate_id !== candidateId);
    this.stageHistory = this.stageHistory.filter(h => !appIds.includes(h.application_id));
    this.save();
    return true;
  }

  deleteJob(jobId) {
    const jobApps = this.applications.filter(a => a.job_id === jobId);
    const appIds = jobApps.map(a => a.id);

    this.jobs = this.jobs.filter(j => j.id !== jobId);
    this.applications = this.applications.filter(a => a.job_id !== jobId);
    this.stageHistory = this.stageHistory.filter(h => !appIds.includes(h.application_id));
    this.jobHistory = this.jobHistory.filter(h => h.job_id !== jobId);
    this.save();
    return true;
  }
}

export const store = new DataStore();
