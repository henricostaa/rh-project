// =============================================================================
// ATS PLURIX 360° | Serviço de Cadastramento de Candidatos (RN-01, RN-02)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class CandidateService {
  async registerCandidateAndApplication({ full_name, email, phone, source, job_id }) {
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
        source
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
        source
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

