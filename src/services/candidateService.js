// =============================================================================
// ATS PLURIX 360° | Serviço de Cadastramento de Candidatos (RN-01, RN-02)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class CandidateService {
  async registerCandidateAndApplication({ full_name, email, phone, source, gender, salary_expectation, linkedin, comment, resume_url, resume_name, job_id }) {
    if (!email || !full_name || !job_id || !source) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos.');
    }

    const job = store.getJobById(job_id);
    if (!job) {
      throw new Error('Vaga selecionada não existe.');
    }

    if (!authService.canViewJob(job)) {
      throw new Error('RN-07: Você não possui acesso a esta vaga confidencial para registrar candidatos.');
    }

    const currentPersona = authService.getPersona();
    let candidate;
    let created = false;
    let application;

    const candPayload = {
      full_name,
      email,
      phone,
      source,
      gender: gender || 'Não informado',
      salary_expectation: (salary_expectation !== undefined && salary_expectation !== '' && salary_expectation !== null) ? Number(salary_expectation) : null,
      linkedin,
      comment,
      resume_url,
      resume_name
    };

    if (isSupabaseConfigured()) {
      // RN-01 & RN-02 via Supabase PostgreSQL Serverless
      const candRes = await supabaseService.createOrGetCandidate(candPayload);
      candidate = candRes.candidate;
      created = candRes.created;

      application = await supabaseService.createApplication(job_id, candidate.id);

      if (created) {
        const salFmt = candidate.salary_expectation ? ` | Pretensão: R$ ${Number(candidate.salary_expectation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
        await supabaseService.addCandidateHistoryRecord({
          candidate_id: candidate.id,
          action: 'CADASTRO_INICIAL',
          description: `Cadastro inicial realizado por ${currentPersona.email}. Canal: ${source}${salFmt}.`,
          changed_by: currentPersona.email
        });
      }
    } else {
      // RN-01: Deduplicação nativa por e-mail (reaproveita ou cria em LocalStorage)
      const candRes = store.createOrGetCandidate(candPayload);
      candidate = candRes.candidate;
      created = candRes.created;

      // RN-02: Candidatura Exclusiva por Vaga (UNIQUE job_id + candidate_id)
      application = store.createApplication(job_id, candidate.id);

      if (created) {
        const salFmt = candidate.salary_expectation ? ` | Pretensão: R$ ${Number(candidate.salary_expectation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
        store.addCandidateHistoryRecord({
          candidate_id: candidate.id,
          action: 'CADASTRO_INICIAL',
          description: `Cadastro inicial realizado por ${currentPersona.email}. Canal: ${source}${salFmt}.`,
          changed_by: currentPersona.email
        });
      }
    }

    // Garante sincronia completa com o store local do frontend
    store.syncCandidateAndApplication(candidate, application);

    return {
      candidate,
      application,
      isNewCandidate: created
    };
  }

  async deleteApplication(applicationId) {
    const app = store.getApplicationById(applicationId);
    if (!app) {
      throw new Error('Candidatura não encontrada.');
    }

    if (!authService.canDeleteApplication(app, app.job)) {
      throw new Error('Permissão negada: Você não possui permissão para excluir esta candidatura.');
    }

    if (isSupabaseConfigured()) {
      await supabaseService.deleteApplication(applicationId, app);
    }
    store.deleteApplication(applicationId);
    return true;
  }

  detectCandidateChanges(oldCand, newUpdates) {
    if (!oldCand) return { changes: [], description: 'Edição cadastral realizada.' };

    const changes = [];

    const formatCurrency = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // 1. Pretensão Salarial
    const oldSal = (oldCand.salary_expectation !== null && oldCand.salary_expectation !== undefined && oldCand.salary_expectation !== '') ? Number(oldCand.salary_expectation) : null;
    const newSal = (newUpdates.salary_expectation !== null && newUpdates.salary_expectation !== undefined && newUpdates.salary_expectation !== '') ? Number(newUpdates.salary_expectation) : null;
    if (oldSal !== newSal) {
      if (oldSal !== null && newSal !== null) {
        changes.push(`Pretensão Salarial: de ${formatCurrency(oldSal)} para ${formatCurrency(newSal)}`);
      } else if (newSal !== null) {
        changes.push(`Pretensão Salarial definida como ${formatCurrency(newSal)}`);
      } else {
        changes.push(`Pretensão Salarial removida (era ${formatCurrency(oldSal)})`);
      }
    }

    // 2. Nome Completo
    if (newUpdates.full_name && newUpdates.full_name.trim() !== (oldCand.full_name || '').trim()) {
      changes.push(`Nome: de "${oldCand.full_name || ''}" para "${newUpdates.full_name.trim()}"`);
    }

    // 3. E-mail
    if (newUpdates.email && newUpdates.email.trim().toLowerCase() !== (oldCand.email || '').trim().toLowerCase()) {
      changes.push(`E-mail: de "${oldCand.email || ''}" para "${newUpdates.email.trim().toLowerCase()}"`);
    }

    // 4. Telefone
    const oldPhone = (oldCand.phone || '').trim();
    const newPhone = (newUpdates.phone || '').trim();
    if (oldPhone !== newPhone) {
      changes.push(`Telefone: de "${oldPhone || 'Não informado'}" para "${newPhone || 'Não informado'}"`);
    }

    // 5. Canal de Origem
    if (newUpdates.source && newUpdates.source !== oldCand.source) {
      changes.push(`Canal de Origem: de "${oldCand.source || ''}" para "${newUpdates.source}"`);
    }

    // 6. Sexo / Gênero
    const oldGender = oldCand.gender || 'Não informado';
    const newGender = newUpdates.gender || 'Não informado';
    if (oldGender !== newGender) {
      changes.push(`Sexo/Gênero: de "${oldGender}" para "${newGender}"`);
    }

    // 7. LinkedIn
    const oldLk = (oldCand.linkedin || '').trim();
    const newLk = (newUpdates.linkedin || '').trim();
    if (oldLk !== newLk) {
      changes.push(`LinkedIn atualizado`);
    }

    // 8. Comentário
    const oldComment = (oldCand.comment || '').trim();
    const newComment = (newUpdates.comment || '').trim();
    if (oldComment !== newComment) {
      changes.push(`Comentário atualizado`);
    }

    // 9. Currículo
    const oldResume = oldCand.resume_name || '';
    const newResume = newUpdates.resume_name || '';
    if (oldResume !== newResume) {
      if (!newResume) {
        changes.push(`Currículo removido (era "${oldResume}")`);
      } else {
        changes.push(`Currículo alterado para "${newResume}"`);
      }
    }

    let description = '';
    if (changes.length > 0) {
      description = `Alteração cadastral: ${changes.join('; ')}.`;
    } else {
      description = `Edição cadastral confirmada por ${authService.getPersona().email}.`;
    }

    return { changes, description };
  }

  async updateCandidate(candidateId, candData) {
    if (!authService.canEditCandidate()) {
      throw new Error('Permissão negada: Você não possui permissão para editar os dados deste candidato.');
    }

    const currentPersona = authService.getPersona();
    const oldCand = store.getCandidates().find(c => c.id === candidateId || c.email === candidateId || (candData.originalEmail && c.email === candData.originalEmail));
    const { changes, description: auditObs } = this.detectCandidateChanges(oldCand, candData);

    const auditMeta = {
      action: 'ATUALIZACAO_CADASTRAL',
      description: auditObs,
      changed_fields: changes,
      changed_by: currentPersona.email
    };

    let updatedCand;
    if (isSupabaseConfigured()) {
      updatedCand = await supabaseService.updateCandidate(candidateId, candData);
      const targetUuid = (updatedCand && updatedCand.id) || (oldCand && oldCand.id) || candidateId;
      await supabaseService.addCandidateHistoryRecord({
        candidate_id: targetUuid,
        action: 'ATUALIZACAO_CADASTRAL',
        description: auditObs,
        changed_fields: changes,
        changed_by: currentPersona.email
      });
    } else {
      updatedCand = store.updateCandidate(candidateId, candData, auditMeta);
    }

    store.syncCandidateAndApplication(updatedCand, null);
    return updatedCand;
  }

  async removeResume(candidateIdOrEmail) {
    if (!authService.canEditCandidate()) {
      throw new Error('Permissão negada: Você não possui permissão para alterar este candidato.');
    }

    const cand = store.getCandidates().find(c => c.id === candidateIdOrEmail || c.email === candidateIdOrEmail);
    if (!cand) {
      throw new Error('Candidato não encontrado.');
    }

    const updates = {
      ...cand,
      resume_name: null,
      resume_url: null
    };

    return await this.updateCandidate(cand.id || cand.email, updates);
  }

  async transferCandidateToJob(applicationId, targetJobId, reason = '') {
    const app = store.getApplicationById(applicationId);
    if (!app) {
      throw new Error('Candidatura não encontrada.');
    }

    if (!authService.canMoveApplication(app, app.job)) {
      throw new Error('Permissão negada: Somente a recrutadora atribuída a esta vaga (ou BP em duplo papel) pode transferir o candidato.');
    }

    const targetJob = store.getJobById(targetJobId);
    if (!targetJob) {
      throw new Error('Vaga de destino não encontrada.');
    }

    if (!authService.canViewJob(targetJob)) {
      throw new Error('RN-07: Você não possui acesso à vaga de destino.');
    }

    const currentPersona = authService.getPersona();
    let updatedApp;
    if (isSupabaseConfigured()) {
      updatedApp = await supabaseService.transferApplicationJob(applicationId, targetJobId, reason, currentPersona.email);
      if (app.candidate && app.candidate.id) {
        await supabaseService.addCandidateHistoryRecord({
          candidate_id: app.candidate.id,
          action: 'TRANSFERENCIA_VAGA',
          description: `Transferido da vaga ${app.job ? app.job.id : 'N/A'} para ${targetJob.id} (${targetJob.title}) por ${currentPersona.email}.${reason ? ` Motivo: "${reason}".` : ''}`,
          changed_by: currentPersona.email
        });
      }
    } else {
      updatedApp = store.transferApplicationJob(applicationId, targetJobId, reason, currentPersona.email);
      if (app.candidate && app.candidate.id) {
        store.addCandidateHistoryRecord({
          candidate_id: app.candidate.id,
          action: 'TRANSFERENCIA_VAGA',
          description: `Transferido da vaga ${app.job ? app.job.id : 'N/A'} para ${targetJob.id} (${targetJob.title}) por ${currentPersona.email}.${reason ? ` Motivo: "${reason}".` : ''}`,
          changed_by: currentPersona.email
        });
      }
    }

    store.syncApplication(updatedApp);
    return updatedApp;
  }

  async deleteCandidate(candidateId, candidateEmail = null) {
    if (!authService.canDeleteCandidate()) {
      throw new Error('Permissão negada: Somente BPs e Gestora de RH podem excluir registros de candidatos.');
    }

    if (isSupabaseConfigured()) {
      await supabaseService.deleteCandidate(candidateId, candidateEmail);
    }
    store.deleteCandidate(candidateId);
    return true;
  }
}

export const candidateService = new CandidateService();


