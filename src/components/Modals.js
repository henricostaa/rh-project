// =============================================================================
// ATS PLURIX 360° | Componente de Modais de Ação e Formulários (Section 10)
// =============================================================================

import { TAXONOMY, PERSONAS } from '../db/schema.js';
import { store } from '../db/store.js';
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

  const recruiters = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP');
  recSelect.innerHTML = '<option value="">Sem recrutadora atribuída (Pendente)</option>' +
    recruiters.map(r => `<option value="${r.email}">${r.name} (${r.email})</option>`).join('');

  document.getElementById('form-job').reset();
  modal.classList.add('open');
}

function setupJobModal(onSuccessRefresh) {
  const form = document.getElementById('form-job');
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const jobData = {
        title: document.getElementById('job-title').value,
        business_unit: document.getElementById('job-business-unit').value,
        department: document.getElementById('job-department').value,
        hiring_manager: document.getElementById('job-hiring-manager').value,
        headcount_type: document.getElementById('job-headcount-type').value,
        selection_type: document.getElementById('job-selection-type').value,
        stage_sla_days: document.getElementById('job-sla-days').value,
        recruiter_email: document.getElementById('job-recruiter').value || null,
        observation: document.getElementById('job-observation').value || '',
        is_pcd: document.getElementById('job-is-pcd').checked,
        is_confidential: document.getElementById('job-is-confidential').checked
      };

      const newJob = jobService.createJob(jobData);
      showToast(`Vaga ${newJob.id} ("${newJob.title}") criada com sucesso!`, 'success');
      document.getElementById('modal-job').classList.remove('open');
      onSuccessRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

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

  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const payload = {
        job_id: document.getElementById('cand-job-id').value,
        email: document.getElementById('cand-email').value,
        full_name: document.getElementById('cand-name').value,
        phone: document.getElementById('cand-phone').value,
        source: document.getElementById('cand-source').value
      };

      const result = candidateService.registerCandidateAndApplication(payload);
      const msg = result.isNewCandidate
        ? `Candidato ${result.candidate.full_name} cadastrado e vinculado à vaga!`
        : `Cadastro de ${result.candidate.full_name} reutilizado (RN-01) e vinculado à vaga!`;

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

  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const applicationId = document.getElementById('move-application-id').value;
      const newStage = document.getElementById('move-new-stage').value;
      const newStatus = document.getElementById('move-status').value;
      const feedback = document.getElementById('move-feedback').value;

      pipelineService.moveCandidateStage(applicationId, {
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

  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('assign-job-id').value;
      const recruiterEmail = document.getElementById('assign-recruiter-select').value;

      jobService.assignRecruiter(jobId, recruiterEmail);
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

  form.onsubmit = (e) => {
    e.preventDefault();
    try {
      const jobId = document.getElementById('move-job-id').value;
      const newStatus = document.getElementById('move-job-new-status').value;
      const observation = document.getElementById('move-job-observation') ? document.getElementById('move-job-observation').value : '';

      jobService.updateJobStatus(jobId, newStatus, observation);
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

  const infoContainer = document.getElementById('job-details-info');
  const canEditStatus = authService.canEditJobStatus(job);
  const canAssign = authService.canAssignRecruiter(job);

  infoContainer.innerHTML = `
    <div class="job-details-item span-2" style="grid-column: span 2; display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
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

    <div class="job-details-item">
      <span class="job-details-label">Negócio / Empresa</span>
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
                        ${canMove ? `
                          <button class="btn btn-primary btn-sm btn-job-modal-move" data-app-id="${app.id}" title="Movimentar Etapa">
                            Etapa &rarr;
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm btn-job-modal-audit" data-app-id="${app.id}" title="Ver Histórico de Auditoria">
                          Histórico
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Attach event listeners for move stage and audit buttons
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

  modal.classList.add('open');
}

function setupJobDetailsModal(onSuccessRefresh) {
  const form = document.getElementById('form-job-details');
  if (!form) return;

  form.onsubmit = (e) => {
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
        jobService.updateJobStatus(jobId, newStatus, observation);
        statusUpdated = true;
      }

      // Update recruiter if changed and allowed
      const currentRecruiter = job.recruiter_email || '';
      if (newRecruiter !== currentRecruiter && authService.canAssignRecruiter(job)) {
        jobService.assignRecruiter(jobId, newRecruiter);
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

