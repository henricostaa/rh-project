// =============================================================================
// ATS PLURIX 360° | Serviço de Gestão de Vagas (RN-04, RN-05, RN-06, RN-07)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';

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
  createJob(jobData) {
    if (!authService.canCreateJob()) {
      throw new Error('RN-04: Recrutadores e utilizadores não autorizados não possuem permissão para abrir vagas.');
    }

    const currentPersona = authService.getPersona();
    const openedByRole = currentPersona.role === 'GESTORA_RH' ? 'GESTORA_RH' : 'BP';

    const newJob = store.createJob({
      ...jobData,
      opened_by_role: openedByRole,
      bp_in_charge_email: currentPersona.role === 'BP' ? currentPersona.email : (jobData.bp_in_charge_email || currentPersona.email),
      created_by: currentPersona.email
    });

    return newJob;
  }

  // RN-05 & RN-06: Atribuição de Recrutadora / Autoatribuição de BP
  assignRecruiter(jobId, recruiterEmail) {
    const job = store.getJobById(jobId);
    if (!job) {
      throw new Error('Vaga não encontrada.');
    }

    if (!authService.canAssignRecruiter(job)) {
      throw new Error('RN-05: Somente a Gestora de RH ou a BP titular da vaga podem alterar a recrutadora atribuída.');
    }

    const currentPersona = authService.getPersona();
    const updatedJob = store.updateJob(jobId, {
      recruiter_email: recruiterEmail || null
    }, {
      observation: recruiterEmail ? `Recrutadora atribuída: ${recruiterEmail}` : 'Atribuição de recrutadora removida.',
      changed_by: currentPersona.email
    });

    return updatedJob;
  }

  // Alterar Status da Vaga (Funil de Vagas) com Observação
  updateJobStatus(jobId, newStatus, observation = '') {
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
    const updatedJob = store.updateJob(jobId, updates, {
      observation: observation || `Transição de status da vaga para "${newStatus}".`,
      changed_by: currentPersona.email
    });

    return updatedJob;
  }

  // Obter Histórico de Auditoria da Vaga
  getJobAuditHistory(jobId) {
    return store.getJobHistoryByJobId(jobId);
  }
}

export const jobService = new JobService();
