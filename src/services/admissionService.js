// =============================================================================
// ATS PLURIX 360° | Serviço do Funil de Admissão & Onboarding
// =============================================================================

import { store } from '../db/store.js';
import { authService } from './authService.js';
import { supabaseService } from './supabaseService.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

class AdmissionService {
  getVisibleAdmissions() {
    const allAdmissions = store.getAdmissions();
    return allAdmissions.filter(adm => {
      if (!adm.job) return true;
      return authService.canViewJob(adm.job);
    });
  }

  getAdmissionById(id) {
    return store.getAdmissionById(id);
  }

  async createAdmission(admissionData) {
    const { candidate_id, job_id, application_id, start_date, salary, responsible_email, notes, checklist } = admissionData;

    if (!candidate_id || !job_id) {
      throw new Error('Candidato e Vaga são obrigatórios para iniciar o processo de admissão.');
    }

    const job = store.getJobById(job_id);
    if (!job) {
      throw new Error('Vaga selecionada não existe.');
    }

    if (!authService.canViewJob(job)) {
      throw new Error('Você não possui permissão para acessar esta vaga.');
    }

    const currentPersona = authService.getPersona();

    let createdAdmission;
    if (isSupabaseConfigured() && typeof supabaseService.createAdmission === 'function') {
      try {
        createdAdmission = await supabaseService.createAdmission({
          candidate_id,
          job_id,
          application_id: application_id || null,
          start_date: start_date || null,
          salary: salary || null,
          responsible_email: responsible_email || currentPersona.email,
          notes: notes || '',
          checklist: checklist || {},
          created_by: currentPersona.name || currentPersona.email
        });
      } catch (err) {
        console.warn('Erro ao persistir admissão no Supabase, usando persistência local:', err);
        createdAdmission = store.createAdmission({
          candidate_id,
          job_id,
          application_id: application_id || null,
          start_date: start_date || null,
          salary: salary || null,
          responsible_email: responsible_email || currentPersona.email,
          notes: notes || '',
          checklist: checklist || {},
          created_by: currentPersona.name || currentPersona.email
        });
      }
    } else {
      createdAdmission = store.createAdmission({
        candidate_id,
        job_id,
        application_id: application_id || null,
        start_date: start_date || null,
        salary: salary || null,
        responsible_email: responsible_email || currentPersona.email,
        notes: notes || '',
        checklist: checklist || {},
        created_by: currentPersona.name || currentPersona.email
      });
    }

    return createdAdmission;
  }

  async moveAdmissionStage(admissionId, { newStage, newStatus, feedback }) {
    const admission = store.getAdmissionById(admissionId);
    if (!admission) {
      throw new Error('Processo de admissão não encontrado.');
    }

    const currentPersona = authService.getPersona();
    const movedBy = currentPersona.name || currentPersona.email || 'Sistema ATS';

    let updatedAdmission;
    if (isSupabaseConfigured() && typeof supabaseService.moveAdmissionStage === 'function') {
      try {
        updatedAdmission = await supabaseService.moveAdmissionStage(admissionId, {
          newStage,
          newStatus,
          feedback: feedback ? feedback.trim() : `Movimentação para etapa: ${newStage}`,
          movedBy
        });
      } catch (err) {
        console.warn('Erro ao mover etapa de admissão no Supabase, usando local:', err);
        updatedAdmission = store.moveAdmissionStage(admissionId, {
          newStage,
          newStatus,
          feedback: feedback ? feedback.trim() : `Movimentação para etapa: ${newStage}`,
          movedBy
        });
      }
    } else {
      updatedAdmission = store.moveAdmissionStage(admissionId, {
        newStage,
        newStatus,
        feedback: feedback ? feedback.trim() : `Movimentação para etapa: ${newStage}`,
        movedBy
      });
    }

    return updatedAdmission;
  }

  async updateAdmissionChecklist(admissionId, key, value) {
    let updatedAdmission;
    if (isSupabaseConfigured() && typeof supabaseService.updateAdmissionChecklist === 'function') {
      try {
        updatedAdmission = await supabaseService.updateAdmissionChecklist(admissionId, key, value);
      } catch (err) {
        updatedAdmission = store.updateAdmissionChecklist(admissionId, key, value);
      }
    } else {
      updatedAdmission = store.updateAdmissionChecklist(admissionId, key, value);
    }
    return updatedAdmission;
  }

  async updateAdmissionDetails(admissionId, updates) {
    let updated;
    if (isSupabaseConfigured() && typeof supabaseService.updateAdmission === 'function') {
      try {
        updated = await supabaseService.updateAdmission(admissionId, updates);
      } catch (err) {
        updated = store.updateAdmission(admissionId, updates);
      }
    } else {
      updated = store.updateAdmission(admissionId, updates);
    }
    return updated;
  }

  async deleteAdmission(admissionId) {
    if (!authService.canDeleteCandidate()) {
      throw new Error('Permissão negada: Somente gestores/RH podem excluir processos de admissão.');
    }

    if (isSupabaseConfigured() && typeof supabaseService.deleteAdmission === 'function') {
      try {
        await supabaseService.deleteAdmission(admissionId);
      } catch (err) {
        console.warn('Erro ao deletar admissão no Supabase:', err);
      }
    }
    store.deleteAdmission(admissionId);
    return true;
  }

  getAdmissionHistory(admissionId) {
    return store.getAdmissionHistory(admissionId);
  }
}

export const admissionService = new AdmissionService();
