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

  // Atualizar Detalhes/Informações Cadastrais da Vaga
  async updateJobDetails(jobId, jobData) {
    const job = store.getJobById(jobId);
    if (!job) {
      throw new Error('Vaga não encontrada.');
    }

    if (!authService.canEditJobDetails(job)) {
      throw new Error('Permissão negada: Somente a Gestora de RH, BP responsável ou recrutadora atribuída podem editar os dados desta vaga.');
    }

    const currentPersona = authService.getPersona();
    const updates = {
      title: jobData.title,
      business_unit: jobData.business_unit,
      department: jobData.department,
      hiring_manager: jobData.hiring_manager || null,
      headcount_type: jobData.headcount_type || 'Substituição',
      replaced_employee: jobData.replaced_employee || null,
      location_associada: jobData.location_associada || jobData.business_unit || null,
      location_city: jobData.location_city || null,
      location_state: jobData.location_state || null,
      selection_type: jobData.selection_type,
      work_model: jobData.work_model || 'Presencial',
      positions_count: (jobData.positions_count && Number(jobData.positions_count) > 0) ? Number(jobData.positions_count) : 1,
      salary_min: (jobData.salary_min !== undefined && jobData.salary_min !== '' && jobData.salary_min !== null) ? Number(jobData.salary_min) : null,
      salary_max: (jobData.salary_max !== undefined && jobData.salary_max !== '' && jobData.salary_max !== null) ? Number(jobData.salary_max) : null,
      stage_sla_days: Number(jobData.stage_sla_days) || 4,
      stage_slas: jobData.stage_slas || null,
      recruiter_email: jobData.recruiter_email || null,
      observation: jobData.observation || '',
      description: jobData.description || '',
      is_pcd: !!jobData.is_pcd,
      is_confidential: !!jobData.is_confidential
    };

    if (jobData.status && jobData.status !== job.status) {
      updates.status = jobData.status;
    }

    const { changes, observation: auditObs } = this.detectJobChanges(job, updates, jobData.observation || '');

    let updatedJob;
    if (isSupabaseConfigured()) {
      updatedJob = await supabaseService.updateJob(jobId, updates);
      await supabaseService.addJobHistoryRecord({
        job_id: jobId,
        previous_status: job.status,
        new_status: updates.status || job.status,
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

  detectJobChanges(oldJob, newUpdates, originalObservation = '') {
    const changes = [];

    const formatCurrency = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // 1. Salário Mínimo
    const oldMin = (oldJob.salary_min !== null && oldJob.salary_min !== undefined && oldJob.salary_min !== '') ? Number(oldJob.salary_min) : null;
    const newMin = (newUpdates.salary_min !== null && newUpdates.salary_min !== undefined && newUpdates.salary_min !== '') ? Number(newUpdates.salary_min) : null;
    if (oldMin !== newMin) {
      if (oldMin !== null && newMin !== null) {
        changes.push(`Salário Mínimo: de ${formatCurrency(oldMin)} para ${formatCurrency(newMin)}`);
      } else if (newMin !== null) {
        changes.push(`Salário Mínimo definido como ${formatCurrency(newMin)}`);
      } else {
        changes.push(`Salário Mínimo removido (era ${formatCurrency(oldMin)})`);
      }
    }

    // 2. Salário Máximo
    const oldMax = (oldJob.salary_max !== null && oldJob.salary_max !== undefined && oldJob.salary_max !== '') ? Number(oldJob.salary_max) : null;
    const newMax = (newUpdates.salary_max !== null && newUpdates.salary_max !== undefined && newUpdates.salary_max !== '') ? Number(newUpdates.salary_max) : null;
    if (oldMax !== newMax) {
      if (oldMax !== null && newMax !== null) {
        changes.push(`Salário Máximo: de ${formatCurrency(oldMax)} para ${formatCurrency(newMax)}`);
      } else if (newMax !== null) {
        changes.push(`Salário Máximo definido como ${formatCurrency(newMax)}`);
      } else {
        changes.push(`Salário Máximo removido (era ${formatCurrency(oldMax)})`);
      }
    }

    // 3. Cargo / Título
    if (newUpdates.title && newUpdates.title !== oldJob.title) {
      changes.push(`Cargo/Título: de "${oldJob.title || ''}" para "${newUpdates.title}"`);
    }

    // 4. Empresa / Unidade de Negócio
    if (newUpdates.business_unit && newUpdates.business_unit !== oldJob.business_unit) {
      changes.push(`Empresa: de "${oldJob.business_unit || ''}" para "${newUpdates.business_unit}"`);
    }

    // 5. Departamento / Diretoria
    if (newUpdates.department && newUpdates.department !== oldJob.department) {
      changes.push(`Diretoria: de "${oldJob.department || ''}" para "${newUpdates.department}"`);
    }

    // 6. Gestor da Vaga
    const oldManager = oldJob.hiring_manager || '';
    const newManager = newUpdates.hiring_manager || '';
    if (oldManager !== newManager) {
      changes.push(`Gestor: de "${oldManager || 'Não informado'}" para "${newManager || 'Não informado'}"`);
    }

    // 7. Tipo de Vaga (Substituição / Posição Nova)
    if (newUpdates.headcount_type && newUpdates.headcount_type !== oldJob.headcount_type) {
      changes.push(`Tipo de Vaga: de "${oldJob.headcount_type || ''}" para "${newUpdates.headcount_type}"`);
    }

    // 7.1 Funcionário Substituído
    const oldReplaced = oldJob.replaced_employee || '';
    const newReplaced = newUpdates.replaced_employee || '';
    if (newReplaced !== oldReplaced) {
      if (oldReplaced && newReplaced) {
        changes.push(`Funcionário Substituído: de "${oldReplaced}" para "${newReplaced}"`);
      } else if (newReplaced) {
        changes.push(`Funcionário Substituído definido como "${newReplaced}"`);
      } else {
        changes.push(`Funcionário Substituído removido (era "${oldReplaced}")`);
      }
    }

    // 7.2 Alocação: Associada, Cidade, Estado
    const oldAssoc = oldJob.location_associada || '';
    const newAssoc = newUpdates.location_associada || '';
    if (newAssoc && newAssoc !== oldAssoc) {
      changes.push(`Associada Alocada: de "${oldAssoc || 'Não informada'}" para "${newAssoc}"`);
    }

    const oldCity = oldJob.location_city || '';
    const newCity = newUpdates.location_city || '';
    if (newCity !== oldCity) {
      changes.push(`Cidade: de "${oldCity || 'Não informada'}" para "${newCity || 'Não informada'}"`);
    }

    const oldState = oldJob.location_state || '';
    const newState = newUpdates.location_state || '';
    if (newState !== oldState) {
      changes.push(`Estado (UF): de "${oldState || 'Não informado'}" para "${newState || 'Não informado'}"`);
    }

    // 8. Tipo de Seleção
    if (newUpdates.selection_type && newUpdates.selection_type !== oldJob.selection_type) {
      changes.push(`Tipo de Seleção: de "${oldJob.selection_type || ''}" para "${newUpdates.selection_type}"`);
    }

    // 9. Modelo de Trabalho
    const oldModel = oldJob.work_model || 'Presencial';
    const newModel = newUpdates.work_model || 'Presencial';
    if (oldModel !== newModel) {
      changes.push(`Modelo de Trabalho: de "${oldModel}" para "${newModel}"`);
    }

    // 10. Quantidade de Posições
    const oldPositions = Number(oldJob.positions_count) || 1;
    const newPositions = Number(newUpdates.positions_count) || 1;
    if (oldPositions !== newPositions) {
      changes.push(`Quantidade de Posições: de ${oldPositions} para ${newPositions}`);
    }

    // 11. Recrutadora
    const oldRecruiter = oldJob.recruiter_email || '';
    const newRecruiter = newUpdates.recruiter_email || '';
    if (oldRecruiter !== newRecruiter) {
      changes.push(`Recrutadora: de "${oldRecruiter || 'Pendente'}" para "${newRecruiter || 'Pendente'}"`);
    }

    // 12. PCD
    const oldPcd = !!oldJob.is_pcd;
    const newPcd = !!newUpdates.is_pcd;
    if (oldPcd !== newPcd) {
      changes.push(`Vaga PCD: de ${oldPcd ? 'Sim' : 'Não'} para ${newPcd ? 'Sim' : 'Não'}`);
    }

    // 13. Confidencial
    const oldConf = !!oldJob.is_confidential;
    const newConf = !!newUpdates.is_confidential;
    if (oldConf !== newConf) {
      changes.push(`Confidencial: de ${oldConf ? 'Sim' : 'Não'} para ${newConf ? 'Sim' : 'Não'}`);
    }

    // 14. Status
    if (newUpdates.status && newUpdates.status !== oldJob.status) {
      changes.push(`Status: de "${oldJob.status}" para "${newUpdates.status}"`);
    }

    // 15. SLA Geral
    const oldSla = Number(oldJob.stage_sla_days) || 4;
    const newSla = Number(newUpdates.stage_sla_days) || 4;
    if (oldSla !== newSla) {
      changes.push(`SLA: de ${oldSla}d para ${newSla}d`);
    }

    // 16. Descrição
    if (newUpdates.description !== undefined && newUpdates.description !== oldJob.description) {
      changes.push('Descrição da vaga atualizada');
    }

    let resultObs = '';
    if (changes.length > 0) {
      resultObs = `Alteração cadastral: ${changes.join('; ')}.`;
      if (originalObservation && originalObservation.trim()) {
        resultObs += ` Observação: "${originalObservation.trim()}".`;
      }
    } else if (originalObservation && originalObservation.trim()) {
      resultObs = `Observação cadastral adicionada: "${originalObservation.trim()}".`;
    } else {
      resultObs = `Edição cadastral confirmada por ${authService.getPersona().email}.`;
    }

    return { changes, observation: resultObs };
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

