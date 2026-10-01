// =============================================================================
// ATS PLURIX 360° | Serviço de Gestão de Vagas (RN-04, RN-05, RN-06, RN-07)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class JobService {
  getVisibleJobs() {
    const allJobs = store.getJobs();
    return allJobs.filter(job => authService.canViewJob(job));
  }

  getJobById(id) {
    const job = store.getJobById(id);
    if (job && authService.canViewJob(job)) {
      return job;
    }
    return null;
  }

  // CA-01 & RN-04: Somente BPs e Gestora de RH
  async createJob(jobData) {
    if (!authService.canCreateJob()) {
      throw new Error('RN-04: Recrutadores e utilizadores não autorizados não possuem permissão para abrir vagas.');
    }

    const currentPersona = authService.getPersona();
    const openedByRole = currentPersona.role === 'GESTORA_RH' ? 'GESTORA_RH' : 'BP';
    const payload = {
      ...jobData,
      opened_by_role: openedByRole,
      bp_in_charge_email: currentPersona.role === 'BP' ? currentPersona.email : (jobData.bp_in_charge_email || currentPersona.email),
      created_by: currentPersona.email
    };

    let newJob;
    if (isSupabaseConfigured()) {
      newJob = await supabaseService.createJob(payload);
      await supabaseService.addJobHistoryRecord({
        job_id: newJob.id,
        previous_status: 'Abertura de Vaga',
        new_status: newJob.status,
        observation: jobData.observation || 'Requisição de vaga criada no sistema.',
        changed_by: currentPersona.email
      });
    } else {
      newJob = store.createJob(payload);
    }

    store.syncJob(newJob);
    return newJob;
  }

  // RN-05 & RN-06: Atribuição de Recrutadora / Autoatribuição de BP
  async assignRecruiter(jobId, recruiterEmail) {
    const job = store.getJobById(jobId);
    if (!job) {
      throw new Error('Vaga não encontrada.');
    }

    if (!authService.canAssignRecruiter(job)) {
      throw new Error('RN-05: Somente a Gestora de RH ou a BP titular da vaga podem alterar a recrutadora atribuída.');
    }

    const currentPersona = authService.getPersona();
    const obs = recruiterEmail ? `Recrutadora atribuída: ${recruiterEmail}` : 'Atribuição de recrutadora removida.';

    let updatedJob;
    if (isSupabaseConfigured()) {
      updatedJob = await supabaseService.updateJob(jobId, { recruiter_email: recruiterEmail || null });
      await supabaseService.addJobHistoryRecord({
        job_id: jobId,
        previous_status: job.status,
        new_status: job.status,
        observation: obs,
        changed_by: currentPersona.email
      });
    } else {
      updatedJob = store.updateJob(jobId, {
        recruiter_email: recruiterEmail || null
      }, {
        observation: obs,
        changed_by: currentPersona.email
      });
    }

    store.syncJob(updatedJob);
    return updatedJob;
  }

  // Alterar Status da Vaga (Funil de Vagas) com Observação
  async updateJobStatus(jobId, newStatus, observation = '') {
    const job = store.getJobById(jobId);
    if (!job) {
      throw new Error('Vaga não encontrada.');
    }

    if (!authService.canEditJobStatus(job)) {
      throw new Error('Permissão negada: Somente a Gestora de RH, a BP titular ou a recrutadora atribuída podem alterar o status desta vaga.');
    }

    const updates = { status: newStatus };
    if (['Concluída', 'Fechada', 'Cancelada'].includes(newStatus) && !job.closed_at) {
      updates.closed_at = new Date().toISOString();
    } else if (!['Concluída', 'Fechada', 'Cancelada'].includes(newStatus)) {
      updates.closed_at = null;
    }

    const currentPersona = authService.getPersona();
    const auditObs = observation || `Transição de status da vaga para "${newStatus}".`;

    let updatedJob;
    if (isSupabaseConfigured()) {
      updatedJob = await supabaseService.updateJob(jobId, updates);
      await supabaseService.addJobHistoryRecord({
        job_id: jobId,
        previous_status: job.status,
        new_status: newStatus,
        observation: auditObs,
        changed_by: currentPersona.email
      });
    } else {
      updatedJob = store.updateJob(jobId, updates, {
        observation: auditObs,
        changed_by: currentPersona.email
      });
    }

    store.syncJob(updatedJob);
    return updatedJob;
  }

  // Obter Histórico de Auditoria da Vaga
  getJobAuditHistory(jobId) {
    return store.getJobHistoryByJobId(jobId);
  }

  // Excluir Vaga
  async deleteJob(jobId) {
    const job = store.getJobById(jobId);
    if (!job) {
      throw new Error('Vaga não encontrada.');
    }

    if (!authService.canDeleteJob(job)) {
      throw new Error('Permissão negada: Somente a Gestora de RH ou a BP responsável por esta vaga podem excluí-la.');
    }

    if (isSupabaseConfigured()) {
      await supabaseService.deleteJob(jobId);
    }
    store.deleteJob(jobId);
    return true;
  }
}

export const jobService = new JobService();

