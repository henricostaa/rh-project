// =============================================================================
// ATS PLURIX 360° | Componente de Modais de Ação e Formulários (Section 10)
// =============================================================================

import { TAXONOMY, PERSONAS } from '../db/schema.js';
import { store, formatSalaryRange } from '../db/store.js';
import { authService } from '../services/authService.js';
import { jobService } from '../services/jobService.js';
import { candidateService } from '../services/candidateService.js';
import { pipelineService } from '../services/pipelineService.js';
import { openAuditDrawer } from './AuditDrawer.js';

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'warning' ? '⚠️' : '✖'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

export function initModals(onSuccessRefresh) {
  // Global modal close handler
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.onclick = () => {
      const parentModal = btn.closest('.modal');
      if (parentModal) {
        parentModal.classList.remove('open');
      } else {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
      }
    };
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    };
  });

  // Setup Form 1: Nova Vaga
  setupJobModal(onSuccessRefresh);

  // Setup Form 2: Novo Candidato
  setupCandidateModal(onSuccessRefresh);

  // Setup Form 3: Movimentar Etapa
  setupMoveStageModal(onSuccessRefresh);

  // Setup Form 4: Atribuir Recrutadora
  setupAssignRecruiterModal(onSuccessRefresh);

  // Setup Form 5: Alterar Status da Vaga (Funil de Vagas)
  setupMoveJobStatusModal(onSuccessRefresh);

  // Setup Form 6: Detalhes e Ações da Vaga
  setupJobDetailsModal(onSuccessRefresh);

  // Setup Form 7: Vincular do Banco de Talentos a Vaga
  setupAttachJobModal(onSuccessRefresh);

  // Setup Form 8: Editar Candidato
  setupEditCandidateModal(onSuccessRefresh);

  // Setup Form 9: Editar Vaga
  setupEditJobModal(onSuccessRefresh);

  // Rich Text Editor initializers
  initRichTextEditors();
}

function initRichTextEditors() {
  document.querySelectorAll('.rich-text-container').forEach(container => {
    const content = container.querySelector('.rich-text-content');
    if (!content) return;

    container.querySelectorAll('.rich-text-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const cmd = btn.dataset.command;
        if (cmd === 'createLink') {
          const url = prompt('Insira o link da URL:');
          if (url) document.execCommand(cmd, false, url);
        } else if (cmd) {
          document.execCommand(cmd, false, null);
        }
        content.focus();
      };
    });

    container.querySelectorAll('.rich-text-select').forEach(sel => {
      sel.onchange = () => {
        const cmd = sel.dataset.command;
        const val = sel.value;
        if (cmd && val) {
          document.execCommand(cmd, false, val);
        }
        content.focus();
      };
    });
  });
}

// -----------------------------------------------------------------------------
// Modal 1: Nova Vaga
// -----------------------------------------------------------------------------
export function openNewJobModal() {
  const modal = document.getElementById('modal-job');
  const buSelect = document.getElementById('job-business-unit');
  const deptSelect = document.getElementById('job-department');
  const levelSelect = document.getElementById('job-title-level');
  const hcSelect = document.getElementById('job-headcount-type');
  const selSelect = document.getElementById('job-selection-type');
  const recSelect = document.getElementById('job-recruiter');

  if (!modal) return;

  // Populate dropdown options
  buSelect.innerHTML = TAXONOMY.businessUnits.map(b => `<option value="${b}">${b}</option>`).join('');
  deptSelect.innerHTML = TAXONOMY.departments.map(d => `<option value="${d}">${d}</option>`).join('');
  levelSelect.innerHTML = TAXONOMY.titles.map(t => `<option value="${t}">${t}</option>`).join('');
  hcSelect.innerHTML = TAXONOMY.headcountTypes.map(h => `<option value="${h}">${h}</option>`).join('');
  selSelect.innerHTML = TAXONOMY.selectionTypes.map(s => `<option value="${s}">${s}</option>`).join('');

  const wmSelect = document.getElementById('job-work-model');
  if (wmSelect) {
    wmSelect.innerHTML = TAXONOMY.workModels.map(wm => `<option value="${wm}">${wm}</option>`).join('');
  }

  const recruiters = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP');
  recSelect.innerHTML = '<option value="">Sem recrutadora atribuída (Pendente)</option>' +
    recruiters.map(r => `<option value="${r.email}">${r.name} (${r.email})</option>`).join('');

  document.getElementById('form-job').reset();
  if (document.getElementById('job-description')) document.getElementById('job-description').innerHTML = '';
  modal.classList.add('open');
}

function setupJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-job');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobData = {
        title: document.getElementById('job-title').value,
        business_unit: document.getElementById('job-business-unit').value,
        department: document.getElementById('job-department').value,
        hiring_manager: document.getElementById('job-hiring-manager').value,
        headcount_type: document.getElementById('job-headcount-type').value,
        selection_type: document.getElementById('job-selection-type').value,
        work_model: document.getElementById('job-work-model') ? document.getElementById('job-work-model').value : 'Presencial',
        positions_count: document.getElementById('job-positions-count') ? Number(document.getElementById('job-positions-count').value) : 1,
        salary_min: document.getElementById('job-salary-min') ? document.getElementById('job-salary-min').value : null,
        salary_max: document.getElementById('job-salary-max') ? document.getElementById('job-salary-max').value : null,
        stage_sla_days: document.getElementById('job-sla-days').value,
        recruiter_email: document.getElementById('job-recruiter').value || null,
        observation: document.getElementById('job-observation').value || '',
        description: document.getElementById('job-description') ? document.getElementById('job-description').innerHTML : '',
        is_pcd: document.getElementById('job-is-pcd').checked,
        is_confidential: document.getElementById('job-is-confidential').checked
      };

      const newJob = await jobService.createJob(jobData);
      showToast(`Vaga ${newJob.id} ("${newJob.title}") criada com sucesso!`, 'success');
      document.getElementById('modal-job').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

let newCandResumeFile = null;
let editCandResumeFile = null;

// -----------------------------------------------------------------------------
// Modal 2: Novo Candidato
// -----------------------------------------------------------------------------
export function openNewCandidateModal() {
  const modal = document.getElementById('modal-candidate');
  const jobSelect = document.getElementById('cand-job-id');

  if (!modal) return;

  const visibleJobs = jobService.getVisibleJobs();
  if (visibleJobs.length === 0) {
    showToast('Não há vagas disponíveis para registrar candidatura.', 'warning');
    return;
  }

  jobSelect.innerHTML = visibleJobs.map(j => `
    <option value="${j.id}">${j.id} - ${j.title} (${j.department}) ${j.is_confidential ? '🔒' : ''}</option>
  `).join('');

  document.getElementById('form-candidate').reset();
  if (document.getElementById('cand-resume-name')) document.getElementById('cand-resume-name').textContent = '';
  if (document.getElementById('btn-remove-cand-resume')) document.getElementById('btn-remove-cand-resume').style.display = 'none';
  newCandResumeFile = null;

  modal.classList.add('open');
}

function setupCandidateModal(onSuccessRefresh) {
  const form = document.getElementById('form-candidate');
  if (!form) return;

  const triggerBtn = document.getElementById('btn-trigger-cand-resume');
  const fileInput = document.getElementById('cand-resume-file');
  const nameSpan = document.getElementById('cand-resume-name');
  const removeBtn = document.getElementById('btn-remove-cand-resume');

  if (triggerBtn && fileInput) {
    triggerBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        newCandResumeFile = fileInput.files[0];
        if (nameSpan) nameSpan.textContent = `📎 ${newCandResumeFile.name}`;
        if (removeBtn) removeBtn.style.display = 'inline-block';
      }
    };
  }

  if (removeBtn && fileInput) {
    removeBtn.onclick = () => {
      fileInput.value = '';
      newCandResumeFile = null;
      if (nameSpan) nameSpan.textContent = '';
      removeBtn.style.display = 'none';
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        job_id: document.getElementById('cand-job-id').value,
        email: document.getElementById('cand-email').value,
        full_name: document.getElementById('cand-name').value,
        phone: document.getElementById('cand-phone').value,
        source: document.getElementById('cand-source').value,
        linkedin: document.getElementById('cand-linkedin') ? document.getElementById('cand-linkedin').value : '',
        comment: document.getElementById('cand-comment') ? document.getElementById('cand-comment').value : '',
        resume_name: newCandResumeFile ? newCandResumeFile.name : null,
        resume_url: newCandResumeFile ? `files/${newCandResumeFile.name}` : null
      };

      const result = await candidateService.registerCandidateAndApplication(payload);
      const msg = result.isNewCandidate
        ? `Candidato ${result.candidate.full_name} cadastrado e vinculado à vaga!`
        : `Cadastro de ${result.candidate.full_name} vinculado à vaga com sucesso!`;

      showToast(msg, 'success');
      document.getElementById('modal-candidate').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 3: Movimentar Etapa
// -----------------------------------------------------------------------------
export function openMoveStageModal(applicationId, targetStage = null) {
  const modal = document.getElementById('modal-move-stage');
  const app = store.getApplicationById(applicationId);
  if (!modal || !app) return;

  document.getElementById('move-application-id').value = applicationId;

  const preview = document.getElementById('move-candidate-preview');
  preview.innerHTML = `
    <div><strong>Candidato:</strong> ${app.candidate ? app.candidate.full_name : 'N/A'} (${app.candidate ? app.candidate.email : ''})</div>
    <div><strong>Vaga:</strong> ${app.job ? app.job.id + ' - ' + app.job.title : 'N/A'} | <strong>Etapa Atual:</strong> <span class="badge badge-neutral">${app.current_stage}</span></div>
  `;

  const selectedStage = targetStage || app.current_stage;

  const stageSelect = document.getElementById('move-new-stage');
  stageSelect.innerHTML = TAXONOMY.funnelStages.map(s => `
    <option value="${s}" ${s === selectedStage ? 'selected' : ''}>${s}</option>
  `).join('');

  const statusSelect = document.getElementById('move-status');
  statusSelect.innerHTML = TAXONOMY.applicationStatuses.map(st => `
    <option value="${st}" ${st === app.status ? 'selected' : ''}>${st}</option>
  `).join('');

  document.getElementById('move-feedback').value = '';
  document.getElementById('move-author-label').textContent = authService.getPersona().email;

  modal.classList.add('open');
}

function setupMoveStageModal(onSuccessRefresh) {
  const form = document.getElementById('form-move-stage');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const applicationId = document.getElementById('move-application-id').value;
      const newStage = document.getElementById('move-new-stage').value;
      const newStatus = document.getElementById('move-status').value;
      const feedback = document.getElementById('move-feedback').value;

      await pipelineService.moveCandidateStage(applicationId, {
        newStage,
        newStatus,
        feedback
      });

      showToast(`Etapa avançada para "${newStage}". SLA zerado para a nova fase (CA-05).`, 'success');
      document.getElementById('modal-move-stage').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 4: Atribuir Recrutadora
// -----------------------------------------------------------------------------
export function openAssignRecruiterModal(jobId) {
  const modal = document.getElementById('modal-assign-recruiter');
  const job = store.getJobById(jobId);
  if (!modal || !job) return;

  document.getElementById('assign-job-id').value = jobId;
  document.getElementById('assign-job-title-display').textContent = `Vaga ${job.id}: ${job.title} (${job.department})`;

  const select = document.getElementById('assign-recruiter-select');
  const persona = authService.getPersona();

  // Populate options
  let html = '<option value="">Nenhuma (Remover Recrutadora)</option>';
  PERSONAS.filter(p => p.role === 'RECRUTADOR').forEach(r => {
    html += `<option value="${r.email}" ${r.email === job.recruiter_email ? 'selected' : ''}>${r.name} (${r.email})</option>`;
  });

  // RN-06: Duplo papel da BP - Permitir autoatribuição
  if (persona.role === 'BP') {
    html += `<option value="${persona.email}" ${persona.email === job.recruiter_email ? 'selected' : ''}>★ ${persona.name} (Autoatribuição BP - Duplo Papel)</option>`;
  }

  select.innerHTML = html;
  modal.classList.add('open');
}

function setupAssignRecruiterModal(onSuccessRefresh) {
  const form = document.getElementById('form-assign-recruiter');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('assign-job-id').value;
      const recruiterEmail = document.getElementById('assign-recruiter-select').value;

      await jobService.assignRecruiter(jobId, recruiterEmail);
      showToast('Atribuição de recrutadora salva com sucesso!', 'success');
      document.getElementById('modal-assign-recruiter').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 5: Alterar Status da Vaga (Funil de Vagas)
// -----------------------------------------------------------------------------
export function openMoveJobStatusModal(jobId, targetStatus = null) {
  const modal = document.getElementById('modal-move-job-status');
  const job = store.getJobById(jobId);
  if (!modal || !job) return;

  document.getElementById('move-job-id').value = jobId;
  const obsEl = document.getElementById('move-job-observation');
  if (obsEl) obsEl.value = '';

  const preview = document.getElementById('move-job-preview');
  preview.innerHTML = `
    <div><strong>Vaga:</strong> ${job.id} - ${job.title} (${job.department})</div>
    <div><strong>Status Atual:</strong> <span class="badge badge-neutral">${job.status}</span></div>
  `;

  const selectedStatus = targetStatus || job.status;
  const statusSelect = document.getElementById('move-job-new-status');
  statusSelect.innerHTML = TAXONOMY.jobStatuses.map(st => `
    <option value="${st}" ${st === selectedStatus ? 'selected' : ''}>${st}</option>
  `).join('');

  modal.classList.add('open');
}

function setupMoveJobStatusModal(onSuccessRefresh) {
  const form = document.getElementById('form-move-job-status');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('move-job-id').value;
      const newStatus = document.getElementById('move-job-new-status').value;
      const observation = document.getElementById('move-job-observation') ? document.getElementById('move-job-observation').value : '';

      await jobService.updateJobStatus(jobId, newStatus, observation);
      showToast(`Status da vaga ${jobId} alterado para "${newStatus}" com sucesso!`, 'success');
      document.getElementById('modal-move-job-status').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 6: Detalhes da Vaga + Ações Rápidas (Atribuir Recrutadora, Status & Auditoria)
// -----------------------------------------------------------------------------
export function openJobDetailsModal(jobId) {
  const modal = document.getElementById('modal-job-details');
  const job = store.getJobById(jobId);
  if (!modal || !job) return;

  const allApps = store.getApplications();
  const jobAppsCount = allApps.filter(a => a.job_id === job.id).length;

  document.getElementById('details-job-id').value = jobId;
  document.getElementById('job-details-title').textContent = `${job.id} • ${job.title}`;
  document.getElementById('job-details-subtitle').textContent = `${job.business_unit} • ${job.department}`;

  const obsInput = document.getElementById('details-status-observation');
  if (obsInput) obsInput.value = '';

  const headerActionsContainer = document.getElementById('job-details-header-actions');
  if (headerActionsContainer) {
    headerActionsContainer.innerHTML = authService.canEditJobDetails(job) ? `
      <button type="button" id="btn-open-edit-job-from-details" class="btn btn-outline-light btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editar Vaga
      </button>
    ` : '';
  }

  const infoContainer = document.getElementById('job-details-info');
  const canEditStatus = authService.canEditJobStatus(job);
  const canAssign = authService.canAssignRecruiter(job);

  infoContainer.innerHTML = `
    <div class="job-details-badges-row" style="grid-column: span 2; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 8px !important; flex-wrap: wrap !important; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--brd2);">
      <span class="badge badge-a">Status: ${job.status}</span>
      <span class="badge badge-neutral">${jobAppsCount} candidatura(s)</span>
      <span class="badge badge-neutral">${job.headcount_type}</span>
      <span class="badge badge-neutral">${job.selection_type}</span>
      ${job.is_pcd ? '<span class="badge badge-a">♿ PCD</span>' : ''}
      ${job.is_confidential ? '<span class="badge badge-confidential">🔒 Confidencial</span>' : ''}
    </div>

    ${job.observation ? `
      <div class="job-details-item span-2" style="grid-column: span 2; background: #fffbe6; border: 1px solid #ffe58f; padding: 10px 12px; border-radius: var(--rs);">
        <span class="job-details-label" style="color: #d46b08; font-weight: 700; display: flex; align-items: center; gap: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Observação da Vaga (Cadastro)
        </span>
        <span class="job-details-value" style="color: #595959; font-style: italic;">"${job.observation}"</span>
      </div>
    ` : ''}

    ${job.description ? `
      <div class="job-details-item span-2" style="grid-column: span 2; background: #f8fafc; border: 1px solid var(--brd); padding: 12px; border-radius: var(--rs);">
        <span class="job-details-label" style="color: var(--navy); font-weight: 700; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
          📝 Descrição da Vaga
        </span>
        <div class="job-details-value" style="color: var(--text); font-size: 0.85rem; line-height: 1.5;">${job.description}</div>
      </div>
    ` : ''}

    ${job.comment ? `
      <div class="job-details-item span-2" style="grid-column: span 2; background: #f0f7ff; border: 1px solid #bae6fd; padding: 10px 12px; border-radius: var(--rs);">
        <span class="job-details-label" style="color: #0369a1; font-weight: 700; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
          💬 Comentário Registrado
        </span>
        <div class="job-details-value" style="color: #0c4a6e; font-size: 0.82rem;">"${job.comment}"</div>
      </div>
    ` : ''}

    <div class="job-details-item">
      <span class="job-details-label">Negócio / Empresa / Bandeira</span>
      <span class="job-details-value">${job.business_unit}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Diretoria</span>
      <span class="job-details-value">${job.department}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Gestor Solicitante</span>
      <span class="job-details-value">${job.hiring_manager || 'Não informado'}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Modelo de Trabalho</span>
      <span class="job-details-value" style="font-weight: 600; color: var(--navy);">${job.work_model || 'Presencial'}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Qtd. de Posições</span>
      <span class="job-details-value" style="font-weight: 600; color: var(--navy);">${job.positions_count || 1} vaga(s)</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Faixa Salarial</span>
      <span class="job-details-value" style="font-weight: 600; color: var(--navy);">${formatSalaryRange(job.salary_min, job.salary_max)}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Limite SLA por Etapa</span>
      <span class="job-details-value">${job.stage_sla_days} dias</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">BP Responsável</span>
      <span class="job-details-value">${job.bp_in_charge_email || 'N/A'}</span>
    </div>

    <div class="job-details-item">
      <span class="job-details-label">Recrutadora Atribuída</span>
      <span class="job-details-value">${job.recruiter_email || 'Pendente'}</span>
    </div>
  `;

  const btnEditFromDetails = modal.querySelector('#btn-open-edit-job-from-details');
  if (btnEditFromDetails) {
    btnEditFromDetails.onclick = () => {
      modal.classList.remove('open');
      openEditJobModal(job.id);
    };
  }

  // Render candidates participating in this job
  const candidatesContainer = document.getElementById('job-details-candidates');
  if (candidatesContainer) {
    const jobApps = pipelineService.getVisibleApplications().filter(a => a.job_id === job.id);
    
    if (jobApps.length === 0) {
      candidatesContainer.innerHTML = `
        <div style="padding: 16px; background: #f8fafc; border: 1px solid var(--brd); border-radius: var(--rs);">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--navy); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Candidatos Participantes (0)
          </h4>
          <div style="font-size: 0.82rem; color: var(--muted); text-align: center; padding: 12px 0;">
            Nenhum candidato inscrito nesta vaga até o momento.
          </div>
        </div>
      `;
    } else {
      candidatesContainer.innerHTML = `
        <div style="padding: 16px; background: #ffffff; border: 1px solid var(--brd); border-radius: var(--rs); box-shadow: var(--shadow-sm);">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--navy); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Candidatos Participantes (${jobApps.length})
            </span>
          </h4>
          <div class="tbl-wrap" style="max-height: 240px; overflow-y: auto; border: 1px solid var(--brd2); border-radius: var(--rs);">
            <table class="data-table" style="width: 100%; font-size: 0.8rem;">
              <thead>
                <tr style="background: #f8fafc; position: sticky; top: 0; z-index: 1;">
                  <th>Candidato</th>
                  <th>Canal</th>
                  <th>Etapa Atual</th>
                  <th>SLA</th>
                  <th>Status</th>
                  <th class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${jobApps.map(app => {
                  const cand = app.candidate;
                  const sla = store.calculateSLA(app, job);
                  const canMove = authService.canMoveApplication(app, job);
                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 600; color: var(--navy);">${cand ? cand.full_name : 'N/A'}</div>
                        <div style="font-size: 0.74rem; color: var(--muted);">${cand ? cand.email : ''}</div>
                      </td>
                      <td>${cand ? cand.source : '-'}</td>
                      <td>
                        <span class="badge badge-neutral" style="font-size: 0.7rem;">${app.current_stage}</span>
                      </td>
                      <td>
                        <span class="badge ${sla.badgeClass}" style="font-size: 0.7rem;">${sla.label}</span>
                      </td>
                      <td>
                        <span class="badge badge-a" style="font-size: 0.7rem;">${app.status}</span>
                      </td>
                      <td class="text-right" style="white-space: nowrap;">
                        <button class="btn btn-secondary btn-sm btn-job-modal-edit-cand" data-cand-id="${cand ? cand.id : ''}" data-cand-email="${cand ? cand.email : ''}" title="Editar informações do candidato">
                          Editar
                        </button>
                        ${canMove ? `
                          <button class="btn btn-primary btn-sm btn-job-modal-move" data-app-id="${app.id}" title="Movimentar Etapa">
                            Etapa &rarr;
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm btn-job-modal-audit" data-app-id="${app.id}" title="Ver Histórico de Auditoria">
                          Histórico
                        </button>
                        ${authService.canDeleteApplication(app, job) ? `
                          <button class="btn btn-danger-outline btn-sm btn-job-modal-delete-app" data-app-id="${app.id}" title="Excluir esta candidatura">
                            Excluir
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Attach event listeners for move stage, edit candidate, audit, and delete buttons
      candidatesContainer.querySelectorAll('.btn-job-modal-edit-cand').forEach(btn => {
        btn.onclick = () => {
          modal.classList.remove('open');
          openEditCandidateModal(btn.dataset.candId || btn.dataset.candEmail);
        };
      });

      candidatesContainer.querySelectorAll('.btn-job-modal-move').forEach(btn => {
        btn.onclick = () => {
          modal.classList.remove('open');
          openMoveStageModal(btn.dataset.appId);
        };
      });

      candidatesContainer.querySelectorAll('.btn-job-modal-audit').forEach(btn => {
        btn.onclick = () => {
          openAuditDrawer(btn.dataset.appId);
        };
      });

      candidatesContainer.querySelectorAll('.btn-job-modal-delete-app').forEach(btn => {
        btn.onclick = () => {
          const appId = btn.dataset.appId;
          const targetApp = store.getApplicationById(appId);
          if (!targetApp) return;

          const cand = targetApp.candidate;
          const candName = cand ? cand.full_name : 'Candidato';
          const candEmail = cand ? cand.email : '';
          openConfirmDeleteModal({
            title: 'Excluir Candidato',
            message: `Tem certeza que deseja excluir <strong>${candName}</strong> (${candEmail}) da vaga <strong>${job.id} - ${job.title}</strong>?`,
            details: 'Esta ação irá remover o candidato da tabela de candidatos no Supabase, bem como suas candidaturas e histórico.',
            onConfirm: async () => {
              if (cand && cand.id) {
                await candidateService.deleteCandidate(cand.id, candEmail);
              } else {
                await candidateService.deleteApplication(appId);
              }
              showToast(`Candidato ${candName} excluído do Supabase com sucesso!`, 'success');
              modal.classList.remove('open');
              onSuccessRefresh();
            }
          });
        };
      });
    }
  }

  // Render Job Audit History Timeline
  const auditContainer = document.getElementById('job-details-audit');
  if (auditContainer) {
    const history = jobService.getJobAuditHistory(jobId);
    auditContainer.innerHTML = `
      <div style="padding: 16px; background: #ffffff; border: 1px solid var(--brd); border-radius: var(--rs); box-shadow: var(--shadow-sm);">
        <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--navy); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
            Auditoria da Vaga: Rastreamento &amp; Movimentação (${history.length})
          </span>
        </h4>
        ${history.length === 0 ? `
          <div style="font-size: 0.82rem; color: var(--muted); text-align: center; padding: 12px 0;">
            Nenhuma movimentação registrada na auditoria da vaga.
          </div>
        ` : `
          <div class="timeline" style="max-height: 240px; overflow-y: auto; padding-right: 6px;">
            ${history.map(h => {
              const movedDate = new Date(h.changed_at).toLocaleString('pt-BR');
              return `
                <div class="timeline-item" style="padding-bottom: 12px;">
                  <div class="timeline-dot" style="background: var(--navy);"></div>
                  <div class="timeline-card" style="padding: 10px 14px; background: #f8fafc; border: 1px solid var(--brd2);">
                    <div class="timeline-meta" style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--muted); margin-bottom: 4px;">
                      <span>Usuário: <b>${h.changed_by}</b></span>
                      <span>${movedDate}</span>
                    </div>
                    <div class="timeline-stages" style="font-size: 0.82rem; font-weight: 600; color: var(--navy);">
                      ${h.previous_status ? `${h.previous_status} &rarr; ` : ''}<b>${h.new_status}</b>
                    </div>
                    ${h.observation ? `
                      <div class="timeline-feedback" style="margin-top: 6px; font-size: 0.78rem; font-style: italic; color: #475569; background: #ffffff; padding: 6px 10px; border-radius: 4px; border-left: 3px solid var(--primary);">
                        "${h.observation}"
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  const saveBtn = document.getElementById('btn-save-job-details');

  // Status dropdown options
  const statusSelect = document.getElementById('details-status-select');
  statusSelect.innerHTML = TAXONOMY.jobStatuses.map(st => `
    <option value="${st}" ${st === job.status ? 'selected' : ''}>${st}</option>
  `).join('');

  statusSelect.disabled = !canEditStatus;
  if (!canEditStatus) {
    statusSelect.title = 'Sem permissão para alterar status desta vaga (Somente BP titular, recrutadora ou Gestora RH)';
  } else {
    statusSelect.title = '';
  }

  // Recruiter dropdown options
  const recruiterSelect = document.getElementById('details-recruiter-select');
  const persona = authService.getPersona();

  let recHtml = '<option value="">Nenhuma (Remover Recrutadora)</option>';
  PERSONAS.filter(p => p.role === 'RECRUTADOR').forEach(r => {
    recHtml += `<option value="${r.email}" ${r.email === (job.recruiter_email || '') ? 'selected' : ''}>${r.name} (${r.email})</option>`;
  });
  if (persona.role === 'BP') {
    recHtml += `<option value="${persona.email}" ${persona.email === (job.recruiter_email || '') ? 'selected' : ''}>★ ${persona.name} (Autoatribuição BP - Duplo Papel)</option>`;
  }

  recruiterSelect.innerHTML = recHtml;
  recruiterSelect.disabled = !canAssign;
  if (!canAssign) {
    recruiterSelect.title = 'Sem permissão para atribuir recrutadora nesta vaga (Somente BP titular ou Gestora RH)';
  } else {
    recruiterSelect.title = '';
  }

  if (!canEditStatus && !canAssign) {
    saveBtn.disabled = true;
    saveBtn.title = 'Sem permissões de alteração para esta vaga';
  } else {
    saveBtn.disabled = false;
    saveBtn.title = '';
  }

  // Modal Footer
  const modalFooter = modal.querySelector('.modal-footer');
  if (modalFooter) {
    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-close-modal>Fechar</button>
    `;

    // Re-bind close event
    modalFooter.querySelectorAll('[data-close-modal]').forEach(b => {
      b.onclick = () => modal.classList.remove('open');
    });
  }

  modal.classList.add('open');
}

function setupJobDetailsModal(onSuccessRefresh) {
  const form = document.getElementById('form-job-details');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('details-job-id').value;
      const job = store.getJobById(jobId);
      if (!job) return;

      const newStatus = document.getElementById('details-status-select').value;
      const newRecruiter = document.getElementById('details-recruiter-select').value;
      const observation = document.getElementById('details-status-observation') ? document.getElementById('details-status-observation').value : '';

      let statusUpdated = false;
      let recruiterUpdated = false;

      // Update status if changed and allowed
      if (newStatus !== job.status && authService.canEditJobStatus(job)) {
        await jobService.updateJobStatus(jobId, newStatus, observation);
        statusUpdated = true;
      }

      // Update recruiter if changed and allowed
      const currentRecruiter = job.recruiter_email || '';
      if (newRecruiter !== currentRecruiter && authService.canAssignRecruiter(job)) {
        await jobService.assignRecruiter(jobId, newRecruiter);
        recruiterUpdated = true;
      }

      // If only observation was provided without status change, record it in audit log
      if (!statusUpdated && !recruiterUpdated && observation.trim()) {
        const persona = authService.getPersona();
        store.updateJob(jobId, {}, {
          observation: observation,
          changed_by: persona.email
        });
        showToast(`Observação de auditoria adicionada à vaga ${jobId}!`, 'success');
      } else if (statusUpdated || recruiterUpdated) {
        showToast(`Alterações da vaga ${jobId} salvas com sucesso!`, 'success');
      } else {
        showToast('Nenhuma alteração foi realizada.', 'warning');
      }

      document.getElementById('modal-job-details').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 7: Confirmation Dialog Helper
// -----------------------------------------------------------------------------
let pendingConfirmAction = null;

export function openConfirmDeleteModal({ title, message, details, onConfirm }) {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;

  const titleEl = document.getElementById('confirm-delete-title');
  const msgEl = document.getElementById('confirm-delete-message');
  const detailsEl = document.getElementById('confirm-delete-details');
  const footerEl = modal.querySelector('.modal-footer');

  // Restore standard confirmation action footer HTML for general deletions (Jobs, etc.)
  if (footerEl) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button>
      <button type="button" id="btn-confirm-delete-action" class="btn btn-danger">
        Sim, Excluir Definitivamente
      </button>
    `;

    footerEl.querySelectorAll('[data-close-modal]').forEach(b => {
      b.onclick = () => modal.classList.remove('open');
    });
  }

  const actionBtn = document.getElementById('btn-confirm-delete-action');

  if (titleEl) {
    titleEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      ${title || 'Confirmar Exclusão'}
    `;
  }

  if (msgEl) msgEl.innerHTML = message || 'Tem certeza que deseja excluir este item?';

  if (detailsEl) {
    if (details) {
      detailsEl.innerHTML = details;
      detailsEl.style.display = 'block';
    } else {
      detailsEl.style.display = 'none';
    }
  }

  pendingConfirmAction = onConfirm;

  if (actionBtn) {
    actionBtn.onclick = async () => {
      if (pendingConfirmAction) {
        try {
          actionBtn.disabled = true;
          actionBtn.textContent = 'Excluindo...';
          await pendingConfirmAction();
        } catch (err) {
          showToast(err.message || 'Erro ao realizar exclusão.', 'error');
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Sim, Excluir Definitivamente';
          modal.classList.remove('open');
          pendingConfirmAction = null;
        }
      }
    };
  }

  modal.classList.add('open');
}

// -----------------------------------------------------------------------------
// Modal 8: Vincular Candidato do Banco de Talentos a uma Vaga
// -----------------------------------------------------------------------------
export function openAttachToJobModal(candidateId, candidateEmail = null) {
  const modal = document.getElementById('modal-attach-job');
  const jobSelect = document.getElementById('attach-target-job-id');
  const preview = document.getElementById('attach-cand-preview');
  if (!modal) return;

  let cand = store.getCandidates().find(c => c.id === candidateId || c.email === candidateEmail);
  if (!cand && candidateEmail) {
    cand = store.findCandidateByEmail(candidateEmail);
  }

  if (!cand) {
    showToast('Candidato não encontrado no Banco de Talentos.', 'error');
    return;
  }

  document.getElementById('attach-cand-id').value = cand.id;
  document.getElementById('attach-cand-email').value = cand.email;

  if (preview) {
    preview.innerHTML = `
      <div><strong>Candidato:</strong> ${cand.full_name}</div>
      <div><strong>E-mail:</strong> ${cand.email} | <strong>Origem:</strong> ${cand.source || 'Banco de Talentos'}</div>
    `;
  }

  const visibleJobs = jobService.getVisibleJobs();
  if (visibleJobs.length === 0) {
    showToast('Não há vagas disponíveis para registrar candidatura.', 'warning');
    return;
  }

  jobSelect.innerHTML = visibleJobs.map(j => `
    <option value="${j.id}">${j.id} - ${j.title} (${j.department}) ${j.is_confidential ? '🔒' : ''}</option>
  `).join('');

  modal.classList.add('open');
}

function setupAttachJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-attach-job');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const candId = document.getElementById('attach-cand-id').value;
      const email = document.getElementById('attach-cand-email').value;
      const jobId = document.getElementById('attach-target-job-id').value;

      const cand = store.getCandidates().find(c => c.id === candId || c.email === email);
      if (!cand) throw new Error('Candidato não encontrado no Banco de Talentos.');

      await candidateService.registerCandidateAndApplication({
        full_name: cand.full_name,
        email: cand.email,
        phone: cand.phone || '',
        source: cand.source || 'Banco de Talentos',
        job_id: jobId
      });

      showToast(`Candidato ${cand.full_name} inscrito na vaga ${jobId} com sucesso!`, 'success');
      document.getElementById('modal-attach-job').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// Dialog com dupla escolha de exclusão (Remover da Vaga vs Excluir do Banco de Talentos)
export function openDeleteChoiceModal({ candName, candEmail, jobTitle, onRemoveFromJob, onDeletePermanently }) {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;

  const titleEl = document.getElementById('confirm-delete-title');
  const msgEl = document.getElementById('confirm-delete-message');
  const detailsEl = document.getElementById('confirm-delete-details');
  const footerEl = modal.querySelector('.modal-footer');

  if (titleEl) {
    titleEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      Opções de Exclusão: ${candName}
    `;
  }

  if (msgEl) {
    msgEl.innerHTML = `
      Escolha o tipo de exclusão desejado para <strong>${candName}</strong> (${candEmail || ''}):
    `;
  }

  if (detailsEl) {
    detailsEl.style.display = 'block';
    detailsEl.innerHTML = `
      • <strong>Remover Apenas da Vaga:</strong> Desvincula o candidato de <em>${jobTitle || 'esta vaga'}</em>, mantendo seu registro no <strong>Banco de Talentos</strong>.<br>
      • <strong>Excluir Definitivamente:</strong> Remove o candidato completamente do sistema e do Supabase (Banco de Talentos + todas as candidaturas).
    `;
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" data-close-modal style="flex-shrink: 0;">Cancelar</button>
      <button type="button" id="btn-choice-remove-job" class="btn btn-secondary" style="border-color: var(--navy); color: var(--navy); white-space: nowrap; flex-shrink: 0;">
        Remover Apenas da Vaga
      </button>
      <button type="button" id="btn-choice-delete-perm" class="btn btn-danger" style="white-space: nowrap; flex-shrink: 0;">
        Excluir do Banco de Talentos
      </button>
    `;

    footerEl.querySelectorAll('[data-close-modal]').forEach(b => {
      b.onclick = () => modal.classList.remove('open');
    });

    const removeBtn = footerEl.querySelector('#btn-choice-remove-job');
    if (removeBtn) {
      removeBtn.onclick = async () => {
        try {
          removeBtn.disabled = true;
          await onRemoveFromJob();
        } catch (err) {
          showToast(err.message || 'Erro ao remover da vaga.', 'error');
        } finally {
          modal.classList.remove('open');
        }
      };
    }

    const deleteBtn = footerEl.querySelector('#btn-choice-delete-perm');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        try {
          deleteBtn.disabled = true;
          await onDeletePermanently();
        } catch (err) {
          showToast(err.message || 'Erro ao excluir candidato.', 'error');
        } finally {
          modal.classList.remove('open');
        }
      };
    }
  }

  modal.classList.add('open');
}

// -----------------------------------------------------------------------------
// Modal 9: Editar Candidato
// -----------------------------------------------------------------------------
export function openEditCandidateModal(candidateIdOrEmail) {
  const modal = document.getElementById('modal-edit-candidate');
  if (!modal) return;

  const candidate = store.getCandidates().find(c => c.id === candidateIdOrEmail || c.email === candidateIdOrEmail);
  if (!candidate) {
    showToast('Candidato não encontrado.', 'error');
    return;
  }

  document.getElementById('edit-cand-id').value = candidate.id || '';
  document.getElementById('edit-cand-original-email').value = candidate.email || '';
  document.getElementById('edit-cand-name').value = candidate.full_name || '';
  document.getElementById('edit-cand-email').value = candidate.email || '';
  document.getElementById('edit-cand-phone').value = candidate.phone || '';
  document.getElementById('edit-cand-source').value = candidate.source || 'LinkedIn';

  if (document.getElementById('edit-cand-linkedin')) {
    document.getElementById('edit-cand-linkedin').value = candidate.linkedin || '';
  }
  if (document.getElementById('edit-cand-comment')) {
    document.getElementById('edit-cand-comment').value = candidate.comment || '';
  }

  const nameSpan = document.getElementById('edit-cand-resume-name');
  const removeBtn = document.getElementById('btn-remove-edit-cand-resume');
  if (candidate.resume_name) {
    if (nameSpan) nameSpan.textContent = `📎 ${candidate.resume_name}`;
    if (removeBtn) removeBtn.style.display = 'inline-block';
  } else {
    if (nameSpan) nameSpan.textContent = '';
    if (removeBtn) removeBtn.style.display = 'none';
  }
  editCandResumeFile = null;

  modal.classList.add('open');
}

function setupEditCandidateModal(onSuccessRefresh) {
  const form = document.getElementById('form-edit-candidate');
  if (!form) return;

  const triggerBtn = document.getElementById('btn-trigger-edit-cand-resume');
  const fileInput = document.getElementById('edit-cand-resume-file');
  const nameSpan = document.getElementById('edit-cand-resume-name');
  const removeBtn = document.getElementById('btn-remove-edit-cand-resume');

  if (triggerBtn && fileInput) {
    triggerBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        editCandResumeFile = fileInput.files[0];
        if (nameSpan) nameSpan.textContent = `📎 ${editCandResumeFile.name}`;
        if (removeBtn) removeBtn.style.display = 'inline-block';
      }
    };
  }

  if (removeBtn && fileInput) {
    removeBtn.onclick = () => {
      fileInput.value = '';
      editCandResumeFile = null;
      if (nameSpan) nameSpan.textContent = '';
      removeBtn.style.display = 'none';
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const candidateId = document.getElementById('edit-cand-id').value;
      const originalEmail = document.getElementById('edit-cand-original-email').value;
      const existingCand = store.getCandidates().find(c => c.id === candidateId || c.email === originalEmail);

      let resumeName = existingCand ? existingCand.resume_name : null;
      let resumeUrl = existingCand ? existingCand.resume_url : null;

      if (editCandResumeFile) {
        resumeName = editCandResumeFile.name;
        resumeUrl = `files/${editCandResumeFile.name}`;
      } else if (nameSpan && !nameSpan.textContent) {
        resumeName = null;
        resumeUrl = null;
      }

      const payload = {
        originalEmail,
        full_name: document.getElementById('edit-cand-name').value,
        email: document.getElementById('edit-cand-email').value,
        phone: document.getElementById('edit-cand-phone').value,
        source: document.getElementById('edit-cand-source').value,
        linkedin: document.getElementById('edit-cand-linkedin') ? document.getElementById('edit-cand-linkedin').value : '',
        comment: document.getElementById('edit-cand-comment') ? document.getElementById('edit-cand-comment').value : '',
        resume_name: resumeName,
        resume_url: resumeUrl
      };

      await candidateService.updateCandidate(candidateId, payload);
      showToast(`Informações de "${payload.full_name}" atualizadas com sucesso!`, 'success');
      document.getElementById('modal-edit-candidate').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 10: Editar Vaga
// -----------------------------------------------------------------------------
export function openEditJobModal(jobId) {
  const modal = document.getElementById('modal-edit-job');
  const job = store.getJobById(jobId);
  if (!modal || !job) return;

  if (!authService.canEditJobDetails(job)) {
    showToast('Permissão negada: Somente a Gestora de RH, BP responsável ou recrutadora atribuída podem editar os dados desta vaga.', 'warning');
    return;
  }

  document.getElementById('edit-job-id').value = job.id;
  document.getElementById('edit-job-title').value = job.title || '';
  document.getElementById('edit-job-hiring-manager').value = job.hiring_manager || '';
  document.getElementById('edit-job-sla-days').value = job.stage_sla_days || 4;
  if (document.getElementById('edit-job-salary-min')) document.getElementById('edit-job-salary-min').value = job.salary_min !== null && job.salary_min !== undefined ? job.salary_min : '';
  if (document.getElementById('edit-job-salary-max')) document.getElementById('edit-job-salary-max').value = job.salary_max !== null && job.salary_max !== undefined ? job.salary_max : '';
  if (document.getElementById('edit-job-observation')) document.getElementById('edit-job-observation').value = job.observation || '';
  if (document.getElementById('edit-job-description')) document.getElementById('edit-job-description').innerHTML = job.description || '';

  document.getElementById('edit-job-is-pcd').checked = !!job.is_pcd;
  document.getElementById('edit-job-is-confidential').checked = !!job.is_confidential;

  const buSelect = document.getElementById('edit-job-business-unit');
  buSelect.innerHTML = TAXONOMY.businessUnits.map(b => `<option value="${b}" ${b === job.business_unit ? 'selected' : ''}>${b}</option>`).join('');

  const deptSelect = document.getElementById('edit-job-department');
  deptSelect.innerHTML = TAXONOMY.departments.map(d => `<option value="${d}" ${d === job.department ? 'selected' : ''}>${d}</option>`).join('');

  const hcSelect = document.getElementById('edit-job-headcount-type');
  hcSelect.innerHTML = TAXONOMY.headcountTypes.map(h => `<option value="${h}" ${h === job.headcount_type ? 'selected' : ''}>${h}</option>`).join('');

  const selSelect = document.getElementById('edit-job-selection-type');
  selSelect.innerHTML = TAXONOMY.selectionTypes.map(s => `<option value="${s}" ${s === job.selection_type ? 'selected' : ''}>${s}</option>`).join('');

  const wmSelect = document.getElementById('edit-job-work-model');
  if (wmSelect) {
    wmSelect.innerHTML = TAXONOMY.workModels.map(wm => `<option value="${wm}" ${wm === (job.work_model || 'Presencial') ? 'selected' : ''}>${wm}</option>`).join('');
  }

  if (document.getElementById('edit-job-positions-count')) {
    document.getElementById('edit-job-positions-count').value = job.positions_count || 1;
  }

  const statusSelect = document.getElementById('edit-job-status');
  statusSelect.innerHTML = TAXONOMY.jobStatuses.map(st => `<option value="${st}" ${st === job.status ? 'selected' : ''}>${st}</option>`).join('');

  const recSelect = document.getElementById('edit-job-recruiter');
  const recruiters = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP');
  recSelect.innerHTML = '<option value="">Sem recrutadora atribuída (Pendente)</option>' +
    recruiters.map(r => `<option value="${r.email}" ${r.email === job.recruiter_email ? 'selected' : ''}>${r.name} (${r.email})</option>`).join('');

  modal.classList.add('open');
}

function setupEditJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-edit-job');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('edit-job-id').value;
      const jobData = {
        title: document.getElementById('edit-job-title').value,
        business_unit: document.getElementById('edit-job-business-unit').value,
        department: document.getElementById('edit-job-department').value,
        hiring_manager: document.getElementById('edit-job-hiring-manager').value,
        headcount_type: document.getElementById('edit-job-headcount-type').value,
        selection_type: document.getElementById('edit-job-selection-type').value,
        work_model: document.getElementById('edit-job-work-model') ? document.getElementById('edit-job-work-model').value : 'Presencial',
        positions_count: document.getElementById('edit-job-positions-count') ? Number(document.getElementById('edit-job-positions-count').value) : 1,
        salary_min: document.getElementById('edit-job-salary-min') ? document.getElementById('edit-job-salary-min').value : null,
        salary_max: document.getElementById('edit-job-salary-max') ? document.getElementById('edit-job-salary-max').value : null,
        stage_sla_days: document.getElementById('edit-job-sla-days').value,
        recruiter_email: document.getElementById('edit-job-recruiter').value || null,
        status: document.getElementById('edit-job-status').value,
        observation: document.getElementById('edit-job-observation').value || '',
        description: document.getElementById('edit-job-description') ? document.getElementById('edit-job-description').innerHTML : '',
        is_pcd: document.getElementById('edit-job-is-pcd').checked,
        is_confidential: document.getElementById('edit-job-is-confidential').checked
      };

      await jobService.updateJobDetails(jobId, jobData);
      showToast(`Vaga ${jobId} ("${jobData.title}") atualizada com sucesso!`, 'success');
      document.getElementById('modal-edit-job').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}


