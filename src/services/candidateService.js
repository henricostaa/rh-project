// =============================================================================
// ATS PLURIX 360° | Serviço de Cadastramento de Candidatos (RN-01, RN-02)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class CandidateService {
  async registerCandidateAndApplication({ full_name, email, phone, source, gender, linkedin, comment, resume_url, resume_name, job_id }) {
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

    let candidate;
    let created = false;
    let application;

    if (isSupabaseConfigured()) {
      // RN-01 & RN-02 via Supabase PostgreSQL Serverless
      const candRes = await supabaseService.createOrGetCandidate({
        full_name,
        email,
        phone,
        source,
        gender: gender || 'Não informado',
        linkedin,
        comment,
        resume_url,
        resume_name
      });
      candidate = candRes.candidate;
      created = candRes.created;

      application = await supabaseService.createApplication(job_id, candidate.id);
    } else {
      // RN-01: Deduplicação nativa por e-mail (reaproveita ou cria em LocalStorage)
      const candRes = store.createOrGetCandidate({
        full_name,
        email,
        phone,
        source,
        gender: gender || 'Não informado',
        linkedin,
        comment,
        resume_url,
        resume_name
      });
      candidate = candRes.candidate;
      created = candRes.created;

      // RN-02: Candidatura Exclusiva por Vaga (UNIQUE job_id + candidate_id)
      application = store.createApplication(job_id, candidate.id);
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

  async updateCandidate(candidateId, candData) {
    if (!authService.canEditCandidate()) {
      throw new Error('Permissão negada: Você não possui permissão para editar os dados deste candidato.');
    }

    let updatedCand;
    if (isSupabaseConfigured()) {
      updatedCand = await supabaseService.updateCandidate(candidateId, candData);
    } else {
      updatedCand = store.updateCandidate(candidateId, candData);
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
    } else {
      updatedApp = store.transferApplicationJob(applicationId, targetJobId, reason, currentPersona.email);
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


