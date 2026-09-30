// =============================================================================
// ATS PLURIX 360° | Serviço de Cadastramento de Candidatos (RN-01, RN-02)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';

class CandidateService {
  registerCandidateAndApplication({ full_name, email, phone, source, job_id }) {
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

    // RN-01: Deduplicação nativa por e-mail (reaproveita ou cria)
    const { candidate, created } = store.createOrGetCandidate({
      full_name,
      email,
      phone,
      source
    });

    // RN-02: Candidatura Exclusiva por Vaga (UNIQUE job_id + candidate_id)
    const application = store.createApplication(job_id, candidate.id);

    return {
      candidate,
      application,
      isNewCandidate: created
    };
  }
}

export const candidateService = new CandidateService();
