// =============================================================================
// ATS PLURIX 360° | Serviço de Pipeline, Transição de Etapa e Auditoria (RN-03, RN-08, CA-04, CA-05)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class PipelineService {
  getVisibleApplications() {
    const allApps = store.getApplications();
    // Filter out applications for jobs that the current persona cannot view (RN-07)
    return allApps.filter(app => app.job && authService.canViewJob(app.job));
  }

  // CA-04 & CA-05: Movimentar candidatura atualiza current_stage, insere em stage_history e zera SLA
  async moveCandidateStage(applicationId, { newStage, newStatus, feedback }) {
    const app = store.getApplicationById(applicationId);
    if (!app) {
      throw new Error('Candidatura não encontrada.');
    }

    if (!authService.canMoveApplication(app, app.job)) {
      throw new Error('Permissão negada: Somente a recrutadora atribuída a esta vaga (ou BP em duplo papel) pode movimentar candidatos.');
    }

    if (!feedback || feedback.trim().length === 0) {
      throw new Error('O parecer técnico / observação é obrigatório para registrar a movimentação no histórico de auditoria.');
    }

    const currentPersona = authService.getPersona();

    let updatedApp;
    if (isSupabaseConfigured()) {
      updatedApp = await supabaseService.moveApplicationStage(applicationId, {
        newStage,
        newStatus: newStatus || app.status,
        feedback: feedback.trim(),
        movedBy: currentPersona.email
      });
    } else {
      updatedApp = store.moveApplicationStage(applicationId, {
        newStage,
        newStatus: newStatus || app.status,
        feedback: feedback.trim(),
        movedBy: currentPersona.email
      });
    }

    store.syncApplication(updatedApp);
    return updatedApp;
  }

  getAuditHistory(applicationId) {
    const app = store.getApplicationById(applicationId);
    if (!app) return [];
    if (!authService.canViewJob(app.job)) return [];

    return store.getStageHistoryByApplication(applicationId);
  }

  getCandidateHistory(candidateIdOrEmail) {
    return store.getCandidateHistory(candidateIdOrEmail);
  }
}

export const pipelineService = new PipelineService();

