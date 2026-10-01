// =============================================================================
// ATS PLURIX 360° | Serviço de Persistência Supabase (PostgreSQL)
// =============================================================================

import { supabase, isSupabaseConfigured } from '../db/supabaseClient.js';

export class SupabaseService {
  // ---------------------------------------------------------------------------
  // Jobs API
  // ---------------------------------------------------------------------------
  async getJobs() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vagas do Supabase:', error);
      throw error;
    }
    return data || [];
  }

  async getJobById(id) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Erro ao buscar vaga ${id}:`, error);
      throw error;
    }
    return data || null;
  }

  async createJob(jobData) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    // Gerar próximo ID no formato VAG-XXX se id não for fornecido
    let jobCode = jobData.id;
    if (!jobCode) {
      const existingJobs = await this.getJobs();
      const existingNums = existingJobs
        .map(j => parseInt(j.id.replace('VAG-', ''), 10))
        .filter(n => !isNaN(n));
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 100;
      jobCode = `VAG-${maxNum + 1}`;
    }

    const newJob = {
      id: jobCode,
      title: jobData.title,
      business_unit: jobData.business_unit,
      department: jobData.department,
      hiring_manager: jobData.hiring_manager || null,
      headcount_type: jobData.headcount_type || 'Substituição',
      selection_type: jobData.selection_type,
      is_pcd: !!jobData.is_pcd,
      status: jobData.status || 'Alinhamento',
      stage_sla_days: Number(jobData.stage_sla_days) || 4,
      opened_by_role: jobData.opened_by_role,
      bp_in_charge_email: jobData.bp_in_charge_email,
      recruiter_email: jobData.recruiter_email || null,
      is_confidential: !!jobData.is_confidential
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert([newJob])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar vaga no Supabase:', error);
      throw error;
    }
    return data;
  }

  async updateJob(id, updates) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar vaga ${id}:`, error);
      throw error;
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // Candidates API (RN-01: Deduplicação por Email)
  // ---------------------------------------------------------------------------
  async getCandidates() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar candidatos:', error);
      throw error;
    }
    return data || [];
  }

  async findCandidateByEmail(email) {
    if (!isSupabaseConfigured() || !email) return null;
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar candidato por e-mail:', error);
      throw error;
    }
    return data;
  }

  async createOrGetCandidate(candData) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const existing = await this.findCandidateByEmail(candData.email);
    if (existing) {
      return { candidate: existing, created: false };
    }

    const { data, error } = await supabase
      .from('candidates')
      .insert([{
        full_name: candData.full_name,
        email: candData.email.trim().toLowerCase(),
        phone: candData.phone || null,
        source: candData.source
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar candidato:', error);
      throw error;
    }
    return { candidate: data, created: true };
  }

  // ---------------------------------------------------------------------------
  // Applications API (RN-02)
  // ---------------------------------------------------------------------------
  async getApplications() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*),
        candidate:candidates(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar candidaturas:', error);
      throw error;
    }
    return data || [];
  }

  async createApplication(jobId, candidateId) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    const newAppPayload = {
      job_id: jobId,
      candidate_id: candidateId,
      current_stage: 'Aguardando Conexão / LinkedIn',
      status: 'EM_ANDAMENTO'
    };

    const { data: newApp, error: appError } = await supabase
      .from('applications')
      .insert([newAppPayload])
      .select()
      .single();

    if (appError) {
      if (appError.code === '23505') {
        throw new Error('RN-02: Candidato já possui candidatura registrada nesta vaga.');
      }
      console.error('Erro ao criar candidatura:', appError);
      throw appError;
    }

    // Histórico inicial
    await this.addStageHistoryRecord({
      application_id: newApp.id,
      previous_stage: 'Cadastro Inicial',
      new_stage: newApp.current_stage,
      status_at_move: 'EM_ANDAMENTO',
      feedback: 'Candidatura registrada no sistema ATS Plurix 360°.',
      moved_by: 'Sistema ATS',
      duration_days: 0
    });

    return newApp;
  }

  // ---------------------------------------------------------------------------
  // Pipeline & Stage History (RN-03, CA-04, CA-05)
  // ---------------------------------------------------------------------------
  async moveApplicationStage(applicationId, { newStage, newStatus, feedback, movedBy }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    // Buscar candidatura atual
    const { data: currentApp, error: fetchErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchErr || !currentApp) {
      throw new Error('Candidatura não encontrada.');
    }

    const previousStage = currentApp.current_stage;
    const now = new Date();
    const stageEnteredDate = new Date(currentApp.stage_entered_at);
    const durationMs = now.getTime() - stageEnteredDate.getTime();
    const durationDays = Math.max(0, Math.floor(durationMs / 86400000));

    // Atualizar aplicação
    const { data: updatedApp, error: updateErr } = await supabase
      .from('applications')
      .update({
        current_stage: newStage,
        status: newStatus || currentApp.status,
        stage_entered_at: now.toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) {
      console.error('Erro ao mover etapa da candidatura:', updateErr);
      throw updateErr;
    }

    // Inserir registro de auditoria no histórico
    await this.addStageHistoryRecord({
      application_id: applicationId,
      previous_stage: previousStage,
      new_stage: newStage,
      status_at_move: newStatus || currentApp.status,
      feedback: feedback || '',
      moved_by: movedBy,
      duration_days: durationDays,
      moved_at: now.toISOString()
    });

    return updatedApp;
  }

  async addStageHistoryRecord(record) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('stage_history')
      .insert([{
        application_id: record.application_id,
        previous_stage: record.previous_stage,
        new_stage: record.new_stage,
        status_at_move: record.status_at_move,
        feedback: record.feedback || '',
        moved_by: record.moved_by,
        duration_days: record.duration_days || 0,
        moved_at: record.moved_at || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir histórico de etapa:', error);
    }
    return data;
  }

  async getStageHistoryByApplication(applicationId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('stage_history')
      .select('*')
      .eq('application_id', applicationId)
      .order('moved_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
    return data || [];
  }

  async getAllStageHistory() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('stage_history')
      .select('*')
      .order('moved_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico de etapas:', error);
      return [];
    }
    return data || [];
  }

  async addJobHistoryRecord(record) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('job_history')
      .insert([{
        job_id: record.job_id,
        previous_status: record.previous_status || null,
        new_status: record.new_status,
        observation: record.observation || '',
        changed_by: record.changed_by,
        changed_at: record.changed_at || new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir histórico de vaga:', error);
    }
    return data;
  }

  async getJobHistoryByJobId(jobId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('job_history')
      .select('*')
      .eq('job_id', jobId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico de vaga:', error);
      return [];
    }
    return data || [];
  }

  async getAllJobHistory() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('job_history')
      .select('*')
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico global de vagas:', error);
      return [];
    }
    return data || [];
  }

  // ---------------------------------------------------------------------------
  // Deletion APIs
  // ---------------------------------------------------------------------------
  async deleteApplication(applicationId, appObject = null) {
    if (!isSupabaseConfigured()) return true;

    try {
      let realAppUuid = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);

      if (isUuid) {
        realAppUuid = applicationId;
      } else if (appObject && appObject.job_id && appObject.candidate) {
        // Tentar encontrar a candidatura no Supabase através do job_id e e-mail do candidato
        const cand = await this.findCandidateByEmail(appObject.candidate.email);
        if (cand) {
          const { data: foundApp } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', appObject.job_id)
            .eq('candidate_id', cand.id)
            .maybeSingle();

          if (foundApp) {
            realAppUuid = foundApp.id;
          }
        }
      }

      if (realAppUuid) {
        // Remover histórico de etapas relacionado
        await supabase.from('stage_history').delete().eq('application_id', realAppUuid);

        // Remover aplicação
        const { error } = await supabase.from('applications').delete().eq('id', realAppUuid);
        if (error) {
          console.error(`Erro ao excluir candidatura ${realAppUuid} no Supabase:`, error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Erro ao excluir candidatura no Supabase:', err);
      throw err;
    }
    return true;
  }

  async deleteCandidate(candidateId, candidateEmail = null) {
    if (!isSupabaseConfigured()) return true;

    try {
      let realCandidateUuid = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);

      if (isUuid) {
        realCandidateUuid = candidateId;
      } else if (candidateEmail) {
        const cand = await this.findCandidateByEmail(candidateEmail);
        if (cand) {
          realCandidateUuid = cand.id;
        }
      }

      if (realCandidateUuid) {
        // Buscar candidaturas do candidato para apagar seus históricos
        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', realCandidateUuid);

        if (apps && apps.length > 0) {
          const appIds = apps
            .map(a => a.id)
            .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
          
          if (appIds.length > 0) {
            await supabase.from('stage_history').delete().in('application_id', appIds);
          }

          await supabase.from('applications').delete().eq('candidate_id', realCandidateUuid);
        }

        const { error } = await supabase.from('candidates').delete().eq('id', realCandidateUuid);
        if (error) {
          console.error(`Erro ao excluir candidato ${realCandidateUuid} no Supabase:`, error);
          throw error;
        }
      } else if (candidateEmail) {
        // Se id local não for UUID, tentar apagar pelo e-mail
        const normalizedEmail = candidateEmail.trim().toLowerCase();
        const { data: cands } = await supabase.from('candidates').select('id').eq('email', normalizedEmail);
        if (cands && cands.length > 0) {
          for (const c of cands) {
            await this.deleteCandidate(c.id, normalizedEmail);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao excluir candidato no Supabase:', err);
      throw err;
    }
    return true;
  }

  async deleteJob(jobId) {
    if (!isSupabaseConfigured()) return true;

    try {
      // Limpar histórico de vagas e candidaturas vinculadas
      await supabase.from('job_history').delete().eq('job_id', jobId);
      const { data: apps } = await supabase.from('applications').select('id').eq('job_id', jobId);
      if (apps && apps.length > 0) {
        const appIds = apps
          .map(a => a.id)
          .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
        
        if (appIds.length > 0) {
          await supabase.from('stage_history').delete().in('application_id', appIds);
        }

        await supabase.from('applications').delete().eq('job_id', jobId);
      }

      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) {
        console.error(`Erro ao excluir vaga ${jobId} no Supabase:`, error);
        throw error;
      }
    } catch (err) {
      console.error('Erro ao excluir vaga no Supabase:', err);
      throw err;
    }
    return true;
  }
}

export const supabaseService = new SupabaseService();

