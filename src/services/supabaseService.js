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

    const payload = {
      id: jobCode,
      title: jobData.title,
      business_unit: jobData.business_unit,
      department: jobData.department,
      hiring_manager: jobData.hiring_manager || null,
      headcount_type: jobData.headcount_type || 'Substituição',
      selection_type: jobData.selection_type,
      work_model: jobData.work_model || 'Presencial',
      positions_count: (jobData.positions_count && Number(jobData.positions_count) > 0) ? Number(jobData.positions_count) : 1,
      salary_min: (jobData.salary_min !== undefined && jobData.salary_min !== '' && jobData.salary_min !== null) ? Number(jobData.salary_min) : null,
      salary_max: (jobData.salary_max !== undefined && jobData.salary_max !== '' && jobData.salary_max !== null) ? Number(jobData.salary_max) : null,
      is_pcd: !!jobData.is_pcd,
      status: jobData.status || 'Alinhamento',
      stage_sla_days: Number(jobData.stage_sla_days) || 4,
      stage_slas: jobData.stage_slas || null,
      opened_by_role: jobData.opened_by_role,
      bp_in_charge_email: jobData.bp_in_charge_email,
      recruiter_email: jobData.recruiter_email || null,
      is_confidential: !!jobData.is_confidential,
      observation: jobData.observation || null,
      description: jobData.description || null
    };

    let currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const { data, error } = await supabase
        .from('jobs')
        .insert([currentPayload])
        .select()
        .single();

      if (!error) return data;

      const match = error.message && error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
        console.warn(`[Supabase Fallback] Coluna '${match[1]}' não encontrada na tabela 'jobs'. Omitindo e tentando novamente...`);
        delete currentPayload[match[1]];
      } else {
        console.error('Erro ao criar vaga no Supabase:', error);
        throw error;
      }
    }
  }

  async updateJob(id, updates) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    let currentUpdates = { ...updates };
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      try {
        const { data, error } = await supabase
          .from('jobs')
          .update(currentUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error) {
          if (!data) {
            console.warn(`[Supabase Service] Vaga '${id}' não encontrada no Supabase. Tentando cadastrar vaga no Supabase...`);
            const { store } = await import('../db/store.js');
            const jobFromStore = store.getJobById(id);
            if (jobFromStore) {
              return await this.createJob({ ...jobFromStore, ...currentUpdates });
            }
          }
          return data;
        }

        const match = error.message && error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && currentUpdates.hasOwnProperty(match[1])) {
          console.warn(`[Supabase Fallback] Coluna '${match[1]}' não encontrada na tabela 'jobs'. Omitindo atualização...`);
          delete currentUpdates[match[1]];
        } else {
          console.error(`Erro ao atualizar vaga ${id}:`, error);
          throw error;
        }
      } catch (err) {
        if (err.message && (err.message.includes('Failed to fetch') || err.name === 'TypeError')) {
          console.warn('[Supabase Fallback] Erro de conexão/fetch ao atualizar vaga no Supabase:', err);
          return null;
        }
        throw err;
      }
    }
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

    const payload = {
      full_name: candData.full_name,
      email: candData.email.trim().toLowerCase(),
      phone: candData.phone || null,
      source: candData.source,
      gender: candData.gender || 'Não informado',
      linkedin: candData.linkedin || null,
      comment: candData.comment || null,
      resume_url: candData.resume_url || null,
      resume_name: candData.resume_name || null
    };

    let currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const { data, error } = await supabase
        .from('candidates')
        .insert([currentPayload])
        .select()
        .single();

      if (!error) return { candidate: data, created: true };

      const match = error.message && error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
        console.warn(`[Supabase Fallback] Coluna '${match[1]}' não encontrada na tabela 'candidates'. Omitindo e tentando novamente...`);
        delete currentPayload[match[1]];
      } else {
        console.error('Erro ao criar candidato no Supabase:', error);
        throw error;
      }
    }
  }

  async updateCandidate(candidateId, updates) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    let targetId = candidateId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);

    if (!isUuid) {
      const emailToSearch = updates.originalEmail || updates.email;
      if (emailToSearch) {
        const existing = await this.findCandidateByEmail(emailToSearch);
        if (existing) targetId = existing.id;
      }
    }

    const payload = {
      full_name: updates.full_name,
      email: updates.email ? updates.email.trim().toLowerCase() : undefined,
      phone: updates.phone !== undefined ? (updates.phone || null) : undefined,
      source: updates.source,
      gender: updates.gender !== undefined ? (updates.gender || 'Não informado') : undefined,
      linkedin: updates.linkedin !== undefined ? (updates.linkedin || null) : undefined,
      comment: updates.comment !== undefined ? (updates.comment || null) : undefined,
      resume_url: updates.resume_url !== undefined ? updates.resume_url : undefined,
      resume_name: updates.resume_name !== undefined ? updates.resume_name : undefined
    };

    // Remover propriedades undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    let currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const { data, error } = await supabase
        .from('candidates')
        .update(currentPayload)
        .eq('id', targetId)
        .select()
        .single();

      if (!error) return data;

      const match = error.message && error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && currentPayload.hasOwnProperty(match[1])) {
        console.warn(`[Supabase Fallback] Coluna '${match[1]}' não encontrada na tabela 'candidates'. Omitindo e tentando novamente...`);
        delete currentPayload[match[1]];
      } else {
        console.error(`Erro ao atualizar candidato ${targetId} no Supabase:`, error);
        throw error;
      }
    }
    return null;
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
    } else if (data) {
      try {
        const { store } = await import('../db/store.js');
        store.syncStageHistoryRecord(data);
      } catch (e) {
        console.warn('Erro ao sincronizar stage_history no store local:', e);
      }
    }
    return data;
  }

  async transferApplicationJob(applicationId, targetJobId, reason, movedBy) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');

    const { data: currentApp, error: fetchErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchErr || !currentApp) {
      throw new Error('Candidatura não encontrada.');
    }

    const oldJobId = currentApp.job_id;
    const oldStage = currentApp.current_stage;
    const now = new Date();

    const { data: updatedApp, error: updateErr } = await supabase
      .from('applications')
      .update({
        job_id: targetJobId,
        current_stage: 'Aguardando Conexão / LinkedIn',
        status: 'EM_ANDAMENTO',
        stage_entered_at: now.toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) {
      console.error('Erro ao transferir candidatura de vaga:', updateErr);
      throw updateErr;
    }

    await this.addStageHistoryRecord({
      application_id: applicationId,
      previous_stage: `Vaga ${oldJobId} (${oldStage})`,
      new_stage: `Transferido p/ Vaga ${targetJobId} - Aguardando Conexão / LinkedIn`,
      status_at_move: 'EM_ANDAMENTO',
      feedback: reason ? `Transferência de Vaga: ${reason}` : `Candidato transferido da vaga ${oldJobId} para ${targetJobId}.`,
      moved_by: movedBy,
      duration_days: 0,
      moved_at: now.toISOString()
    });

    return updatedApp;
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
    } else if (data) {
      try {
        const { store } = await import('../db/store.js');
        store.syncJobHistoryRecord(data);
      } catch (e) {
        console.warn('Erro ao sincronizar job_history no store local:', e);
      }
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

  // ---------------------------------------------------------------------------
  // Admissions API no Supabase
  // ---------------------------------------------------------------------------
  async getAdmissions() {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('admissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Tabela admissions ainda não configurada no Supabase, usando armazenamento local:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Erro ao consultar admissions no Supabase:', err);
      return [];
    }
  }

  async createAdmission(admissionData) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('admissions')
        .insert([{
          candidate_id: admissionData.candidate_id,
          job_id: admissionData.job_id,
          application_id: admissionData.application_id || null,
          current_stage: admissionData.current_stage || 'Carta Oferta (Assinatura Gestor e Candidato)',
          status: admissionData.status || 'EM_ANDAMENTO',
          start_date: admissionData.start_date || null,
          salary: admissionData.salary || null,
          responsible_email: admissionData.responsible_email || null,
          checklist: admissionData.checklist || {},
          notes: admissionData.notes || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Erro ao criar admissão no Supabase:', err);
      throw err;
    }
  }

  async moveAdmissionStage(admissionId, { newStage, newStatus, feedback, movedBy }) {
    if (!isSupabaseConfigured()) return null;
    try {
      const now = new Date().toISOString();
      const updates = {
        current_stage: newStage,
        stage_entered_at: now
      };
      if (newStatus) updates.status = newStatus;
      if (newStage === 'Admissão Concluída') {
        updates.status = 'CONCLUIDO';
        updates.completed_at = now;
      }

      const { data, error } = await supabase
        .from('admissions')
        .update(updates)
        .eq('id', admissionId)
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('admission_stage_history').insert([{
        admission_id: admissionId,
        previous_stage: 'Transição',
        new_stage: newStage,
        status_at_move: updates.status || 'EM_ANDAMENTO',
        feedback: feedback || '',
        moved_by: movedBy
      }]);

      return data;
    } catch (err) {
      console.warn('Erro ao mover etapa de admissão no Supabase:', err);
      throw err;
    }
  }

  async updateAdmissionChecklist(admissionId, key, value) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: current } = await supabase.from('admissions').select('checklist').eq('id', admissionId).single();
      const currentChecklist = (current && current.checklist) || {};
      currentChecklist[key] = value;

      const { data, error } = await supabase
        .from('admissions')
        .update({ checklist: currentChecklist })
        .eq('id', admissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Erro ao atualizar checklist no Supabase:', err);
      throw err;
    }
  }

  async updateAdmission(admissionId, updates) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('admissions')
        .update(updates)
        .eq('id', admissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Erro ao atualizar admissão no Supabase:', err);
      throw err;
    }
  }

  async deleteAdmission(admissionId) {
    if (!isSupabaseConfigured()) return true;
    try {
      await supabase.from('admission_stage_history').delete().eq('admission_id', admissionId);
      const { error } = await supabase.from('admissions').delete().eq('id', admissionId);
      if (error) throw error;
    } catch (err) {
      console.warn('Erro ao deletar admissão no Supabase:', err);
      throw err;
    }
    return true;
  }

  async getAllAdmissionStageHistory() {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('admission_stage_history')
        .select('*')
        .order('moved_at', { ascending: false });

      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();


