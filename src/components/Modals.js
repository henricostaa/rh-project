// =============================================================================
// ATS PLURIX 360° | Componente de Modais de Ação e Formulários (Section 10)
// =============================================================================

import { TAXONOMY, PERSONAS, PROCESS_STAGES, DEFAULT_STAGE_SLAS, calculateTotalJobSLA, ADMISSION_STAGES } from '../db/schema.js';
import { store, formatSalaryRange } from '../db/store.js';
import { authService } from '../services/authService.js';
import { jobService } from '../services/jobService.js';
import { candidateService } from '../services/candidateService.js';
import { pipelineService } from '../services/pipelineService.js';
import { admissionService } from '../services/admissionService.js';
import { getAdmissionChecklistProgress } from './AdmissionKanbanBoard.js';
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

export function downloadResume(resumeUrl, fileName = 'curriculo.pdf') {
  if (!resumeUrl || resumeUrl === '#' || resumeUrl.startsWith('files/')) {
    showToast('Este registro de currículo não possui um arquivo de PDF/DOC válido gravado. Edite o candidato e anexe o arquivo novamente.', 'warning');
    return;
  }

  try {
    if (resumeUrl.startsWith('data:')) {
      const parts = resumeUrl.split(',');
      if (parts.length < 2) {
        showToast('Formato de arquivo inválido ou incompleto. Reanexe o arquivo.', 'error');
        return;
      }
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const binaryStr = atob(parts[1]);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'curriculo.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://') || resumeUrl.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = resumeUrl;
      a.download = fileName || 'curriculo.pdf';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showToast('O arquivo do currículo não pode ser processado. Edite o candidato e reanexe o arquivo.', 'warning');
    }
  } catch (err) {
    console.error('Erro ao baixar currículo:', err);
    showToast('Erro ao processar o arquivo do currículo. Tente reanexar o arquivo.', 'error');
  }
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

  // Setup Form 10: Mover Candidato de Vaga
  setupTransferCandidateJobModal(onSuccessRefresh);

  // Setup Form 11: Nova Admissão
  setupNewAdmissionModal(onSuccessRefresh);

  // Setup Form 12: Detalhes e Checklist de Admissão
  setupAdmissionDetailsModal(onSuccessRefresh);

  // Setup Form 13: Mover Etapa de Admissão
  setupMoveAdmissionStageModal(onSuccessRefresh);

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
// Componente Reutilizável de SLA por Etapa (Fluxo Oficial R&S)
// -----------------------------------------------------------------------------
export function renderSlaStageInputs(containerId, initialSlas = null, totalDisplayId = null, pillsContainerId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = PROCESS_STAGES.map(stage => {
    let currentVal = stage.defaultDays;
    if (initialSlas && typeof initialSlas === 'object') {
      if (initialSlas[stage.name] !== undefined) currentVal = Number(initialSlas[stage.name]);
      else if (initialSlas[stage.key] !== undefined) currentVal = Number(initialSlas[stage.key]);
      else if (initialSlas[stage.shortName] !== undefined) currentVal = Number(initialSlas[stage.shortName]);
    }
    const isModified = currentVal !== stage.defaultDays;

    return `
      <div class="sla-stage-card ${isModified ? 'is-modified' : ''}" data-stage-key="${stage.key}">
        <div class="sla-stage-card-header">
          <span class="sla-stage-step-badge">Etapa ${stage.step}</span>
          <div class="sla-stage-card-title">
            ${stage.name}
            ${stage.note ? `<br><span class="sla-stage-note">(${stage.note})</span>` : ''}
          </div>
        </div>
        <div class="sla-stage-card-footer">
          <span class="sla-stage-base-label">Padrão: <b>${stage.defaultDays}d</b></span>
          <div class="sla-stage-input-group">
            <input 
              type="number" 
              class="sla-stage-input" 
              data-stage-name="${stage.name}" 
              data-stage-key="${stage.key}" 
              data-default-days="${stage.defaultDays}" 
              value="${currentVal}" 
              min="1" 
              max="90" 
              required
              title="Digite o número de dias limite para esta etapa"
            />
            <span class="sla-stage-unit">dias</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Atualizar resumo inicial
  refreshSlaSummary(containerId, totalDisplayId, pillsContainerId);

  // Vincular eventos de digitação manual
  container.querySelectorAll('.sla-stage-input').forEach(input => {
    input.oninput = () => {
      const card = input.closest('.sla-stage-card');
      const defDays = Number(input.dataset.defaultDays);
      const val = Number(input.value);
      if (card) {
        if (val !== defDays) card.classList.add('is-modified');
        else card.classList.remove('is-modified');
      }
      refreshSlaSummary(containerId, totalDisplayId, pillsContainerId);
    };
  });
}

export function refreshSlaSummary(containerId, totalDisplayId, pillsContainerId) {
  const container = document.getElementById(containerId);
  const totalDisplay = totalDisplayId ? document.getElementById(totalDisplayId) : null;
  const pillsContainer = pillsContainerId ? document.getElementById(pillsContainerId) : null;
  if (!container) return;

  const inputs = container.querySelectorAll('.sla-stage-input');
  let totalDays = 0;
  const pillsData = [];

  inputs.forEach((inp, idx) => {
    const days = Math.max(1, parseInt(inp.value, 10) || Number(inp.dataset.defaultDays) || 1);
    totalDays += days;
    pillsData.push({ step: idx + 1, days });
  });

  if (totalDisplay) {
    totalDisplay.textContent = `${totalDays} dias`;
  }

  if (pillsContainer) {
    pillsContainer.innerHTML = pillsData.map((p, idx) => `
      <span class="sla-flow-pill" title="Etapa ${p.step}: ${p.days} dia(s)">E${p.step}: <b>${p.days}d</b></span>
      ${idx < pillsData.length - 1 ? '<span class="sla-flow-arrow">→</span>' : ''}
    `).join('');
  }
}

export function collectStageSlas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return { ...DEFAULT_STAGE_SLAS };

  const slas = {};
  container.querySelectorAll('.sla-stage-input').forEach(inp => {
    const stageName = inp.dataset.stageName;
    const days = Math.max(1, parseInt(inp.value, 10) || Number(inp.dataset.defaultDays) || 1);
    slas[stageName] = days;
  });
  return slas;
}

export function resetStageSlas(containerId, totalDisplayId, pillsContainerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.sla-stage-input').forEach(inp => {
    const def = inp.dataset.defaultDays || '1';
    inp.value = def;
    const card = inp.closest('.sla-stage-card');
    if (card) card.classList.remove('is-modified');
  });

  refreshSlaSummary(containerId, totalDisplayId, pillsContainerId);
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

  // Renderizar os 8 estágios do fluxo oficial com SLAs base configuráveis
  renderSlaStageInputs('new-job-sla-stages-grid', null, 'new-job-total-sla-display', 'new-job-sla-pills');

  const resetBtn = document.getElementById('btn-reset-new-job-slas');
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetStageSlas('new-job-sla-stages-grid', 'new-job-total-sla-display', 'new-job-sla-pills');
      showToast('Prazos padrões do fluxo de R&S restaurados!', 'info');
    };
  }

  modal.classList.add('open');
}

function setupJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-job');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const stageSlas = collectStageSlas('new-job-sla-stages-grid');
      const fallbackSlaDays = stageSlas['Triagem + Captação'] || 7;

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
        stage_sla_days: fallbackSlaDays,
        stage_slas: stageSlas,
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
let newCandResumeDataUrl = null;
let editCandResumeFile = null;
let editCandResumeDataUrl = null;

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
  modal.classList.add('open');
}

function setupCandidateModal(onSuccessRefresh) {
  const form = document.getElementById('form-candidate');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        job_id: document.getElementById('cand-job-id').value,
        email: document.getElementById('cand-email').value,
        full_name: document.getElementById('cand-name').value,
        phone: document.getElementById('cand-phone').value,
        source: document.getElementById('cand-source').value,
        gender: document.getElementById('cand-gender') ? document.getElementById('cand-gender').value : 'Não informado',
        linkedin: document.getElementById('cand-linkedin') ? document.getElementById('cand-linkedin').value : '',
        comment: document.getElementById('cand-comment') ? document.getElementById('cand-comment').value : '',
        resume_name: null,
        resume_url: null
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
      <span class="job-details-label">Limite SLA (Geral / Triagem)</span>
      <span class="job-details-value">${job.stage_sla_days || 7} dias</span>
    </div>

    <div class="job-details-item span-2" style="grid-column: span 2; background: #f8fafc; border: 1px solid #adbbff; padding: 12px 16px; border-radius: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span class="job-details-label" style="font-weight: 700; color: var(--navy); font-size: 0.85rem;">Régua de SLAs da Vaga (Fluxo Oficial R&amp;S)</span>
        <span class="badge badge-a" style="font-family: var(--font-code);">SLA Total: ${calculateTotalJobSLA(job)} dias</span>
      </div>
      <div class="sla-flow-pills" style="gap: 6px; margin-top: 4px;">
        ${PROCESS_STAGES.map((ps, idx) => {
          const days = (job.stage_slas && job.stage_slas[ps.name]) || ps.defaultDays;
          return `
            <span class="sla-flow-pill" title="${ps.name}: ${days} dia(s)">
              E${ps.step}: <b>${days}d</b>
            </span>
            ${idx < PROCESS_STAGES.length - 1 ? '<span class="sla-flow-arrow">→</span>' : ''}
          `;
        }).join('')}
      </div>
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
  if (document.getElementById('edit-cand-gender')) {
    document.getElementById('edit-cand-gender').value = candidate.gender || 'Feminino';
  }

  if (document.getElementById('edit-cand-linkedin')) {
    document.getElementById('edit-cand-linkedin').value = candidate.linkedin || '';
  }
  if (document.getElementById('edit-cand-comment')) {
    document.getElementById('edit-cand-comment').value = candidate.comment || '';
  }

  modal.classList.add('open');
}

function setupEditCandidateModal(onSuccessRefresh) {
  const form = document.getElementById('form-edit-candidate');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const candidateId = document.getElementById('edit-cand-id').value;
      const originalEmail = document.getElementById('edit-cand-original-email').value;
      const existingCand = store.getCandidates().find(c => c.id === candidateId || c.email === originalEmail);

      const payload = {
        originalEmail,
        full_name: document.getElementById('edit-cand-name').value,
        email: document.getElementById('edit-cand-email').value,
        phone: document.getElementById('edit-cand-phone').value,
        source: document.getElementById('edit-cand-source').value,
        gender: document.getElementById('edit-cand-gender') ? document.getElementById('edit-cand-gender').value : (existingCand ? existingCand.gender : 'Não informado'),
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

  // Renderizar os 8 estágios do fluxo com SLAs pré-carregados da vaga
  renderSlaStageInputs('edit-job-sla-stages-grid', job.stage_slas || null, 'edit-job-total-sla-display', 'edit-job-sla-pills');

  const resetBtn = document.getElementById('btn-reset-edit-job-slas');
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetStageSlas('edit-job-sla-stages-grid', 'edit-job-total-sla-display', 'edit-job-sla-pills');
      showToast('Prazos padrões do fluxo de R&S restaurados!', 'info');
    };
  }

  modal.classList.add('open');
}

function setupEditJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-edit-job');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('edit-job-id').value;
      const stageSlas = collectStageSlas('edit-job-sla-stages-grid');
      const fallbackSlaDays = stageSlas['Triagem + Captação'] || 7;

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
        stage_sla_days: fallbackSlaDays,
        stage_slas: stageSlas,
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

// -----------------------------------------------------------------------------
// Modal 11: Mover Candidato para Outra Vaga
// -----------------------------------------------------------------------------
export function openTransferCandidateJobModal(applicationId) {
  const modal = document.getElementById('modal-transfer-candidate');
  const app = store.getApplicationById(applicationId);
  if (!modal || !app) return;

  document.getElementById('transfer-application-id').value = applicationId;

  const preview = document.getElementById('transfer-candidate-preview');
  if (preview) {
    preview.innerHTML = `
      <div><strong>Candidato:</strong> ${app.candidate ? app.candidate.full_name : 'N/A'} (${app.candidate ? app.candidate.email : ''})</div>
      <div><strong>Vaga Atual:</strong> ${app.job ? app.job.id + ' - ' + app.job.title : 'N/A'} | <strong>Etapa Atual:</strong> <span class="badge badge-neutral">${app.current_stage}</span></div>
    `;
  }

  const targetJobSelect = document.getElementById('transfer-target-job-id');
  const visibleJobs = jobService.getVisibleJobs().filter(j => !app.job || j.id !== app.job.id);

  if (visibleJobs.length === 0) {
    showToast('Não há outras vagas disponíveis para realizar a transferência.', 'warning');
    return;
  }

  targetJobSelect.innerHTML = visibleJobs.map(j => `
    <option value="${j.id}">${j.id} - ${j.title} (${j.department}) ${j.is_confidential ? '🔒' : ''}</option>
  `).join('');

  const reasonEl = document.getElementById('transfer-reason');
  if (reasonEl) reasonEl.value = '';

  modal.classList.add('open');
}

function setupTransferCandidateJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-transfer-candidate');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const applicationId = document.getElementById('transfer-application-id').value;
      const targetJobId = document.getElementById('transfer-target-job-id').value;
      const reason = document.getElementById('transfer-reason') ? document.getElementById('transfer-reason').value : '';

      await candidateService.transferCandidateToJob(applicationId, targetJobId, reason);

      showToast(`Candidato transferido para a vaga ${targetJobId} com sucesso!`, 'success');
      document.getElementById('modal-transfer-candidate').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// -----------------------------------------------------------------------------
// Modal 12: Histórico do Candidato no Banco de Talentos
// -----------------------------------------------------------------------------
export function openCandidateHistoryModal(candidateIdOrEmail) {
  const modal = document.getElementById('modal-candidate-history');
  if (!modal) return;

  const cand = store.getCandidates().find(c => c.id === candidateIdOrEmail || c.email === candidateIdOrEmail);
  if (!cand) {
    showToast('Candidato não encontrado no Banco de Talentos.', 'error');
    return;
  }

  const titleEl = document.getElementById('cand-history-modal-title');
  if (titleEl) titleEl.textContent = `Histórico: ${cand.full_name}`;

  const profileSummary = document.getElementById('cand-history-profile-summary');
  if (profileSummary) {
    profileSummary.innerHTML = `
      <div style="font-size: 0.85rem; line-height: 1.6;">
        <div style="font-size: 1.05rem; font-weight: 700; color: var(--navy); margin-bottom: 4px;">${cand.full_name}</div>
        <div><b>E-mail:</b> ${cand.email} | <b>Telefone:</b> ${cand.phone || '--'}</div>
        <div><b>Sexo / Gênero:</b> <span class="badge badge-neutral">${cand.gender || 'Não informado'}</span> | <b>Canal de Origem:</b> ${cand.source || 'N/A'}</div>
        ${cand.linkedin ? `<div><b>LinkedIn:</b> <a href="${cand.linkedin}" target="_blank" style="color: var(--primary-color, #00147d); text-decoration: underline;">${cand.linkedin}</a></div>` : ''}
        ${(cand.resume_url || cand.resume_name) ? `
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <b>Currículo:</b> 
            <button type="button" id="btn-cand-modal-download-resume" style="background:none; border:none; padding:0; color: var(--primary-color, #00147d); text-decoration: underline; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              📎 ${cand.resume_name || 'Visualizar / Baixar'}
            </button>
            <button type="button" id="btn-cand-modal-remove-resume" style="background:none; border:none; padding:0; color: var(--danger, #ec221f); font-size: 0.78rem; font-weight: 600; cursor: pointer; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
              🗑️ Remover Currículo
            </button>
          </div>
        ` : ''}
      </div>
    `;

    const downloadBtn = profileSummary.querySelector('#btn-cand-modal-download-resume');
    if (downloadBtn) {
      downloadBtn.onclick = () => downloadResume(cand.resume_url, cand.resume_name);
    }

    const removeResumeBtn = profileSummary.querySelector('#btn-cand-modal-remove-resume');
    if (removeResumeBtn) {
      removeResumeBtn.onclick = async () => {
        openConfirmDeleteModal({
          title: 'Remover Currículo',
          message: `Tem certeza que deseja remover o currículo de <strong>${cand.full_name}</strong>?`,
          details: 'O arquivo de currículo será desvinculado deste candidato.',
          onConfirm: async () => {
            await candidateService.removeResume(cand.id || cand.email);
            showToast('Currículo removido com sucesso!', 'success');
            modal.classList.remove('open');
            openCandidateHistoryModal(cand.id || cand.email);
          }
        });
      };
    }
  }

  // Applications list
  const allApps = store.getApplications();
  const candApps = allApps.filter(a => a.candidate_id === cand.id || (a.candidate && a.candidate.email === cand.email));

  const jobsListContainer = document.getElementById('cand-history-jobs-list');
  if (jobsListContainer) {
    if (candApps.length === 0) {
      jobsListContainer.innerHTML = `
        <div style="font-size: 0.82rem; color: var(--muted); padding: 10px 12px; background: #f8fafc; border: 1px solid var(--brd); border-radius: var(--rs);">
          Sem candidaturas ativas no momento. Registrado no Banco de Talentos desde ${cand.created_at ? new Date(cand.created_at).toLocaleDateString('pt-BR') : '--'}.
        </div>
      `;
    } else {
      jobsListContainer.innerHTML = candApps.map(a => `
        <div style="font-size: 0.82rem; padding: 10px 12px; background: #ffffff; border: 1px solid var(--brd); border-radius: var(--rs); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="color: var(--navy);">${a.job ? a.job.id + ' - ' + a.job.title : 'Vaga'}</strong>
            <div style="color: var(--muted); font-size: 0.76rem;">${a.job ? a.job.business_unit + ' • ' + a.job.department : ''}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge badge-neutral">${a.current_stage}</span>
            <span class="badge badge-a">${a.status}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Audit timeline
  const history = pipelineService.getCandidateHistory(cand.id || cand.email);
  const timelineContainer = document.getElementById('cand-history-timeline');

  if (timelineContainer) {
    if (history.length === 0) {
      timelineContainer.innerHTML = `
        <div style="text-align: center; color: var(--muted); padding: 16px; font-size: 0.82rem;">
          Nenhuma movimentação registrada no histórico.
        </div>
      `;
    } else {
      timelineContainer.innerHTML = history.map(h => {
        const movedDate = new Date(h.moved_at).toLocaleString('pt-BR');
        return `
          <div class="timeline-item" style="padding-bottom: 12px;">
            <div class="timeline-dot"></div>
            <div class="timeline-card" style="padding: 10px 14px; background: #f8fafc; border: 1px solid var(--brd2);">
              <div class="timeline-meta" style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--muted); margin-bottom: 4px;">
                <span>Realizado por: <b>${h.moved_by}</b></span>
                <span>${movedDate}</span>
              </div>
              <div class="timeline-stages" style="font-size: 0.82rem; font-weight: 600; color: var(--navy);">
                ${h.previous_stage} &rarr; <b>${h.new_stage}</b>
              </div>
              <div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px;">
                Permanência: <b>${h.duration_days} dia(s)</b> | Status: <b>${h.status_at_move}</b>
              </div>
              ${h.feedback ? `
                <div class="timeline-feedback" style="margin-top: 6px; font-size: 0.78rem; font-style: italic; color: #475569; background: #ffffff; padding: 6px 10px; border-radius: 4px; border-left: 3px solid var(--primary);">
                  "${h.feedback}"
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  modal.classList.add('open');
}

// =============================================================================
// Módulo de Admissão: Modais e Formulários (Section 11)
// =============================================================================

export function openNewAdmissionModal(defaultCandidateId = null, defaultJobId = null) {
  const modal = document.getElementById('modal-admission-new');
  if (!modal) return;

  const candSelect = document.getElementById('admission-new-candidate');
  const jobSelect = document.getElementById('admission-new-job');
  const respSelect = document.getElementById('admission-new-responsible');
  const startDateInput = document.getElementById('admission-new-start-date');
  const salaryInput = document.getElementById('admission-new-salary');
  const notesInput = document.getElementById('admission-new-notes');

  // Populate candidates
  const candidates = store.getCandidates();
  candSelect.innerHTML = '<option value="">Selecione o Candidato...</option>' +
    candidates.map(c => `<option value="${c.id}">${c.full_name} (${c.email})</option>`).join('');

  if (defaultCandidateId) {
    candSelect.value = defaultCandidateId;
  }

  // Populate visible jobs
  const jobs = jobService.getVisibleJobs().filter(j => j.status !== 'Fechada' && j.status !== 'Cancelada');
  jobSelect.innerHTML = '<option value="">Selecione a Vaga...</option>' +
    jobs.map(j => `<option value="${j.id}">${j.id} - ${j.title} (${j.business_unit})</option>`).join('');

  if (defaultJobId) {
    jobSelect.value = defaultJobId;
    const selectedJob = jobs.find(j => j.id === defaultJobId);
    if (selectedJob && selectedJob.salary_max) {
      salaryInput.value = selectedJob.salary_max;
    }
  }

  jobSelect.onchange = () => {
    const j = jobs.find(job => job.id === jobSelect.value);
    if (j && j.salary_max && !salaryInput.value) {
      salaryInput.value = j.salary_max;
    }
    if (j && j.recruiter_email && respSelect) {
      respSelect.value = j.recruiter_email;
    }
  };

  // Populate responsible recruiters/BPs
  const recruiters = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP' || p.role === 'GESTORA_RH');
  const currentPersona = authService.getPersona();
  respSelect.innerHTML = recruiters.map(r => `<option value="${r.email}">${r.name}</option>`).join('');
  respSelect.value = currentPersona ? currentPersona.email : recruiters[0].email;

  // Default target date: 15 days from now
  const defaultDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  startDateInput.value = defaultDate;
  if (!defaultJobId) salaryInput.value = '';
  notesInput.value = '';

  modal.classList.add('open');
}

function setupNewAdmissionModal(onSuccessRefresh) {
  const form = document.getElementById('form-admission-new');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const candidateId = document.getElementById('admission-new-candidate').value;
    const jobId = document.getElementById('admission-new-job').value;
    const startDate = document.getElementById('admission-new-start-date').value;
    const salary = document.getElementById('admission-new-salary').value;
    const responsible = document.getElementById('admission-new-responsible').value;
    const notes = document.getElementById('admission-new-notes').value;

    if (!candidateId || !jobId) {
      showToast('Selecione o candidato e a vaga para iniciar a admissão.', 'warning');
      return;
    }

    try {
      await admissionService.createAdmission({
        candidate_id: candidateId,
        job_id: jobId,
        start_date: startDate,
        salary: salary ? Number(salary) : null,
        responsible_email: responsible,
        notes: notes.trim()
      });

      const modal = document.getElementById('modal-admission-new');
      if (modal) modal.classList.remove('open');

      showToast('Processo de admissão iniciado com sucesso no Funil de Admissão!', 'success');
      if (onSuccessRefresh) onSuccessRefresh();
    } catch (err) {
      console.error('Erro ao iniciar admissão:', err);
      showToast(err.message || 'Erro ao iniciar admissão.', 'error');
    }
  };
}

export function openAdmissionDetailsModal(admissionId) {
  const modal = document.getElementById('modal-admission-details');
  if (!modal) return;

  const adm = store.getAdmissionById(admissionId);
  if (!adm) {
    showToast('Processo de admissão não encontrado.', 'error');
    return;
  }

  const cand = adm.candidate;
  const job = adm.job;
  const sla = store.calculateAdmissionSLA(adm);
  const checklist = adm.checklist || {};
  const progress = getAdmissionChecklistProgress(checklist);

  document.getElementById('admission-details-id').value = adm.id;

  // Header and Hero
  document.getElementById('admission-details-candidate-name').textContent = cand ? cand.full_name : 'Candidato';
  document.getElementById('admission-details-job-title').textContent = job 
    ? `${job.id} - ${job.title} • ${job.business_unit} (${job.department})`
    : 'Vaga não vinculada';

  const stageBadge = document.getElementById('admission-details-stage-badge');
  stageBadge.textContent = adm.current_stage;
  stageBadge.className = 'badge ' + (adm.current_stage === 'Admissão Concluída' ? 'badge-a' : 'badge-neutral');

  const slaBadge = document.getElementById('admission-details-sla-badge');
  slaBadge.textContent = sla.label;
  slaBadge.className = `badge ${sla.badgeClass}`;

  let formattedDate = 'A definir';
  if (adm.start_date) {
    const [y, m, d] = adm.start_date.split('-');
    formattedDate = `${d}/${m}/${y}`;
  }
  document.getElementById('admission-details-start-date').textContent = formattedDate;

  document.getElementById('admission-details-salary').textContent = adm.salary 
    ? `R$ ${Number(adm.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
    : 'A combinar';

  // Progress
  document.getElementById('admission-details-progress-text').textContent = `${progress.completed}/${progress.total} (${progress.percentage}%)`;
  const progressBar = document.getElementById('admission-details-progress-bar');
  progressBar.style.width = `${progress.percentage}%`;
  progressBar.style.background = progress.percentage === 100 
    ? '#10b981' 
    : 'linear-gradient(90deg, #00147d, #50baec)';

  // 1. Carta Oferta
  document.getElementById('chk-oferta-gestor').checked = !!checklist.oferta_gestor_assinado;
  document.getElementById('chk-oferta-candidato').checked = !!checklist.oferta_candidato_assinado;
  const step1Done = checklist.oferta_gestor_assinado && checklist.oferta_candidato_assinado;
  const step1Badge = document.getElementById('step1-status-badge');
  step1Badge.textContent = step1Done ? 'Concluído' : (checklist.oferta_gestor_assinado || checklist.oferta_candidato_assinado ? 'Em andamento' : 'Pendente');
  step1Badge.className = 'badge ' + (step1Done ? 'badge-a' : 'badge-neutral');

  // 2. Link Admissão
  document.getElementById('chk-link-enviado').checked = !!checklist.link_admissao_enviado;
  document.getElementById('sel-link-status').value = checklist.link_admissao_status || 'Pendente';
  const step2Done = checklist.link_admissao_status === 'Aprovado' || checklist.link_admissao_status === 'Documentos Enviados';
  const step2Badge = document.getElementById('step2-status-badge');
  step2Badge.textContent = step2Done ? 'Concluído' : (checklist.link_admissao_enviado ? 'Enviado' : 'Pendente');
  step2Badge.className = 'badge ' + (step2Done ? 'badge-a' : 'badge-neutral');

  // 3. Exame Admissão
  document.getElementById('input-exame-protocolo').value = checklist.exame_protocolo || '';
  document.getElementById('input-exame-clinica').value = checklist.exame_clinica || '';
  document.getElementById('input-exame-data').value = checklist.exame_data || '';
  document.getElementById('sel-exame-aso').value = checklist.exame_aso_status || 'Pendente';
  const step3Done = checklist.exame_aso_status === 'Apto';
  const step3Badge = document.getElementById('step3-status-badge');
  step3Badge.textContent = step3Done ? 'Apto (Concluído)' : (checklist.exame_aso_status || 'Pendente');
  step3Badge.className = 'badge ' + (step3Done ? 'badge-a' : (checklist.exame_aso_status === 'Inapto' ? 'badge-c' : 'badge-neutral'));

  // 4. Carta de Banco (Opcional)
  document.getElementById('chk-banco-dispensada').checked = !!checklist.carta_banco_dispensada;
  document.getElementById('chk-banco-emitida').checked = !!checklist.carta_banco_emitida;
  document.getElementById('input-banco-nome').value = checklist.carta_banco_nome || '';
  const step4Done = checklist.carta_banco_dispensada || checklist.carta_banco_emitida;
  const step4Badge = document.getElementById('step4-status-badge');
  step4Badge.textContent = checklist.carta_banco_dispensada ? 'Dispensada' : (checklist.carta_banco_emitida ? 'Emitida' : 'Pendente');
  step4Badge.className = 'badge ' + (step4Done ? 'badge-a' : 'badge-neutral');

  // 5. Chamado DP
  document.getElementById('input-dp-numero').value = checklist.chamado_dp_numero || '';
  document.getElementById('input-dp-responsavel').value = checklist.chamado_dp_responsavel || '';
  document.getElementById('sel-dp-status').value = checklist.chamado_dp_status || 'Pendente';
  const step5Done = checklist.chamado_dp_status === 'Concluído';
  const step5Badge = document.getElementById('step5-status-badge');
  step5Badge.textContent = checklist.chamado_dp_status || 'Pendente';
  step5Badge.className = 'badge ' + (step5Done ? 'badge-a' : 'badge-neutral');

  // 6. E-mail de Confirmação
  document.getElementById('chk-email-confirmacao').checked = !!checklist.email_confirmacao_enviado;
  const step6Done = !!checklist.email_confirmacao_enviado;
  const step6Badge = document.getElementById('step6-status-badge');
  step6Badge.textContent = step6Done ? 'Enviado' : 'Pendente';
  step6Badge.className = 'badge ' + (step6Done ? 'badge-a' : 'badge-neutral');

  // 7. Formulário GLPI
  document.getElementById('input-glpi-ticket').value = checklist.glpi_ticket_numero || '';
  document.getElementById('sel-glpi-status').value = checklist.glpi_status || 'Pendente';
  document.getElementById('chk-glpi-notebook').checked = checklist.glpi_solicitado_notebook !== false;
  document.getElementById('chk-glpi-email').checked = checklist.glpi_solicitado_email !== false;
  document.getElementById('chk-glpi-vpn').checked = !!checklist.glpi_solicitado_vpn;
  document.getElementById('chk-glpi-cracha').checked = checklist.glpi_solicitado_cracha !== false;
  const step7Done = checklist.glpi_status === 'Concluído';
  const step7Badge = document.getElementById('step7-status-badge');
  step7Badge.textContent = checklist.glpi_status || 'Pendente';
  step7Badge.className = 'badge ' + (step7Done ? 'badge-a' : 'badge-neutral');

  // 8. Planilha Admissão
  document.getElementById('chk-planilha-inserida').checked = !!checklist.planilha_inserida;
  document.getElementById('input-matricula-gerada').value = checklist.matricula_gerada || '';
  const step8Done = !!checklist.planilha_inserida || !!checklist.matricula_gerada;
  const step8Badge = document.getElementById('step8-status-badge');
  step8Badge.textContent = step8Done ? 'Lançado' : 'Pendente';
  step8Badge.className = 'badge ' + (step8Done ? 'badge-a' : 'badge-neutral');

  // Observações
  document.getElementById('admission-details-notes').value = adm.notes || '';

  // Timeline
  const history = store.getAdmissionHistory(adm.id);
  const timelineEl = document.getElementById('admission-details-timeline');
  if (timelineEl) {
    if (history.length === 0) {
      timelineEl.innerHTML = '<div style="color: var(--muted); font-size: 0.8rem; text-align: center; padding: 12px;">Sem histórico de movimentações registrado.</div>';
    } else {
      timelineEl.innerHTML = history.map(h => {
        const dateStr = new Date(h.moved_at).toLocaleString('pt-BR');
        return `
          <div class="timeline-item" style="padding-bottom: 10px;">
            <div class="timeline-dot"></div>
            <div class="timeline-card" style="padding: 8px 12px; background: #f8fafc; border: 1px solid var(--brd2);">
              <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--muted); margin-bottom: 2px;">
                <span>Por: <b>${h.moved_by}</b></span>
                <span>${dateStr}</span>
              </div>
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--navy);">
                ${h.previous_stage} &rarr; <b>${h.new_stage}</b>
              </div>
              ${h.feedback ? `
                <div style="margin-top: 4px; font-size: 0.76rem; font-style: italic; color: #475569; background: #ffffff; padding: 4px 8px; border-radius: 4px; border-left: 3px solid var(--primary);">
                  "${h.feedback}"
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  modal.classList.add('open');
}

function setupAdmissionDetailsModal(onSuccessRefresh) {
  const btnSave = document.getElementById('btn-admission-save-checklist');
  const btnAdvance = document.getElementById('btn-admission-details-advance');

  if (btnSave) {
    btnSave.onclick = async () => {
      const admId = document.getElementById('admission-details-id').value;
      if (!admId) return;

      const checklistUpdates = {
        oferta_gestor_assinado: document.getElementById('chk-oferta-gestor').checked,
        oferta_candidato_assinado: document.getElementById('chk-oferta-candidato').checked,

        link_admissao_enviado: document.getElementById('chk-link-enviado').checked,
        link_admissao_status: document.getElementById('sel-link-status').value,

        exame_protocolo: document.getElementById('input-exame-protocolo').value.trim(),
        exame_clinica: document.getElementById('input-exame-clinica').value.trim(),
        exame_data: document.getElementById('input-exame-data').value,
        exame_aso_status: document.getElementById('sel-exame-aso').value,

        carta_banco_dispensada: document.getElementById('chk-banco-dispensada').checked,
        carta_banco_emitida: document.getElementById('chk-banco-emitida').checked,
        carta_banco_nome: document.getElementById('input-banco-nome').value.trim(),

        chamado_dp_numero: document.getElementById('input-dp-numero').value.trim(),
        chamado_dp_responsavel: document.getElementById('input-dp-responsavel').value.trim(),
        chamado_dp_status: document.getElementById('sel-dp-status').value,

        email_confirmacao_enviado: document.getElementById('chk-email-confirmacao').checked,

        glpi_ticket_numero: document.getElementById('input-glpi-ticket').value.trim(),
        glpi_status: document.getElementById('sel-glpi-status').value,
        glpi_solicitado_notebook: document.getElementById('chk-glpi-notebook').checked,
        glpi_solicitado_email: document.getElementById('chk-glpi-email').checked,
        glpi_solicitado_vpn: document.getElementById('chk-glpi-vpn').checked,
        glpi_solicitado_cracha: document.getElementById('chk-glpi-cracha').checked,

        planilha_inserida: document.getElementById('chk-planilha-inserida').checked,
        matricula_gerada: document.getElementById('input-matricula-gerada').value.trim()
      };

      const notes = document.getElementById('admission-details-notes').value.trim();

      await admissionService.updateAdmissionDetails(admId, {
        checklist: checklistUpdates,
        notes
      });

      showToast('Checklist de admissão salvo com sucesso!', 'success');
      openAdmissionDetailsModal(admId);
      if (onSuccessRefresh) onSuccessRefresh();
    };
  }

  if (btnAdvance) {
    btnAdvance.onclick = () => {
      const admId = document.getElementById('admission-details-id').value;
      if (!admId) return;

      const adm = store.getAdmissionById(admId);
      if (!adm) return;

      const currentStageObj = ADMISSION_STAGES.find(s => s.name === adm.current_stage);
      const currentStep = currentStageObj ? currentStageObj.step : 1;
      const nextStageObj = ADMISSION_STAGES.find(s => s.step === currentStep + 1);

      if (!nextStageObj) {
        showToast('Este processo já se encontra na etapa final de Admissão Concluída.', 'info');
        return;
      }

      const modal = document.getElementById('modal-admission-details');
      if (modal) modal.classList.remove('open');

      openMoveAdmissionStageModal(admId, nextStageObj.name);
    };
  }
}

export function openMoveAdmissionStageModal(admissionId, targetStage = null) {
  const modal = document.getElementById('modal-admission-move');
  if (!modal) return;

  const adm = store.getAdmissionById(admissionId);
  if (!adm) {
    showToast('Processo de admissão não encontrado.', 'error');
    return;
  }

  const cand = adm.candidate;
  const job = adm.job;

  document.getElementById('admission-move-id').value = adm.id;

  const preview = document.getElementById('admission-move-preview');
  preview.innerHTML = `
    <div style="font-weight: 700; color: var(--navy);">${cand ? cand.full_name : 'Candidato'}</div>
    <div style="font-size: 0.8rem; color: var(--muted); margin-top: 2px;">
      Vaga: <b>${job ? job.id + ' - ' + job.title : '--'}</b> (${job ? job.business_unit : ''})
    </div>
    <div style="font-size: 0.8rem; margin-top: 4px;">
      Etapa Atual: <span class="badge badge-neutral">${adm.current_stage}</span>
    </div>
  `;

  const stageSelect = document.getElementById('admission-move-target-stage');
  stageSelect.innerHTML = ADMISSION_STAGES.map(s => {
    const isCurrent = s.name === adm.current_stage;
    return `<option value="${s.name}" ${isCurrent ? 'disabled' : ''}>${s.step}. ${s.name}${isCurrent ? ' (Atual)' : ''}</option>`;
  }).join('');

  if (targetStage && targetStage !== adm.current_stage) {
    stageSelect.value = targetStage;
  } else {
    const currentObj = ADMISSION_STAGES.find(s => s.name === adm.current_stage);
    const nextObj = ADMISSION_STAGES.find(s => s.step === (currentObj ? currentObj.step + 1 : 2));
    if (nextObj) stageSelect.value = nextObj.name;
  }

  document.getElementById('admission-move-feedback').value = '';

  modal.classList.add('open');
}

function setupMoveAdmissionStageModal(onSuccessRefresh) {
  const form = document.getElementById('form-admission-move');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const admId = document.getElementById('admission-move-id').value;
    const targetStage = document.getElementById('admission-move-target-stage').value;
    const feedback = document.getElementById('admission-move-feedback').value.trim();

    if (!admId || !targetStage) return;

    if (!feedback) {
      showToast('O parecer / observação é obrigatório para registrar a movimentação no histórico de auditoria.', 'warning');
      return;
    }

    try {
      await admissionService.moveAdmissionStage(admId, {
        newStage: targetStage,
        feedback
      });

      const modal = document.getElementById('modal-admission-move');
      if (modal) modal.classList.remove('open');

      showToast(`Processo movimentado com sucesso para "${targetStage}"!`, 'success');
      if (onSuccessRefresh) onSuccessRefresh();
    } catch (err) {
      console.error('Erro ao mover admissão:', err);
      showToast(err.message || 'Erro ao movimentar etapa.', 'error');
    }
  };
}



