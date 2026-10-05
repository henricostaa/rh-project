import { TAXONOMY } from '../db/schema.js';
import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { showToast, downloadResume, openTransferCandidateJobModal, openNewAdmissionModal, openAdmissionDetailsModal } from './Modals.js';

let draggedAppId = null;
let draggedFromStage = null;
let isDraggingCard = false;

export function renderKanbanBoard(applications, onMoveClick, onHistoryClick, onDeleteClick, onEditCandidateClick) {
  const container = document.getElementById('kanban-board');
  if (!container) return;

  const stages = TAXONOMY.funnelStages;

  container.innerHTML = stages.map(stage => {
    const stageApps = applications.filter(a => a.current_stage === stage);

    return `
      <div class="kanban-column" data-stage="${stage}">
        <div class="column-header">
          <span class="column-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${stage}
          </span>
          <span class="column-count">${stageApps.length}</span>
        </div>

        <div class="column-cards" data-stage="${stage}">
          ${stageApps.length === 0 ? `
            <div style="text-align: center; color: var(--muted); font-size: 0.78rem; padding: 20px 0;">
              Nenhum candidato nesta etapa
            </div>
          ` : stageApps.map(app => {
            const job = app.job;
            const cand = app.candidate;
            const sla = store.calculateSLA(app, job);
            const canMove = authService.canMoveApplication(app, job);
            const canDelete = authService.canDeleteApplication(app, job);

            return `
              <div class="kanban-card ${canMove ? 'draggable' : 'read-only'} ${sla.badgeClass}"
                   ${canMove ? 'draggable="true"' : ''}
                   data-app-id="${app.id}"
                   data-stage="${stage}">
                <div class="card-top">
                  <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0;">
                    ${canMove ? '<span class="drag-handle" title="Clique e arraste para mover">⋮⋮</span>' : ''}
                    <div style="min-width: 0; flex: 1;">
                      <div class="candidate-name" title="${cand ? cand.full_name : 'Candidato Removido'}">
                        ${cand ? cand.full_name : 'Candidato Removido'}
                      </div>
                      <div class="company-tag" style="margin-top: 3px;">
                        <span class="badge badge-company" title="Empresa / Bandeira">
                          ${job && job.business_unit ? job.business_unit : 'Empresa N/A'}
                        </span>
                      </div>
                      <div class="job-pill" style="margin-top: 4px;">
                        <span class="job-code">${job ? job.id : 'N/A'}</span>
                        <span class="job-title-text" title="${job ? job.title : 'Sem vaga'}">${job ? job.title : 'Sem vaga'}</span>
                      </div>
                    </div>
                  </div>
                  <span class="badge ${sla.badgeClass}">${sla.label}</span>
                </div>

                <div class="card-badges-row">
                  <span class="badge badge-neutral">${app.status}</span>
                  ${cand && cand.gender ? `<span class="badge badge-neutral">${cand.gender}</span>` : ''}
                  ${job && job.is_confidential ? '<span class="badge badge-confidential">Confidencial</span>' : ''}
                  ${cand && cand.source ? `<span class="badge badge-neutral">${cand.source}</span>` : ''}
                  ${cand && (cand.resume_url || cand.resume_name) ? `
                    <span class="badge badge-neutral btn-download-resume-kanban" data-cand-id="${cand.id}" style="cursor: pointer; color: var(--navy); display: inline-flex; align-items: center; gap: 3px;" title="Visualizar/Baixar Currículo">
                      📎 ${cand.resume_name || 'Currículo'}
                    </span>
                  ` : ''}
                </div>

                <div class="card-meta">
                  <div class="recruiter-info" title="Recrutador responsável: ${job && job.recruiter_email ? job.recruiter_email : 'Pendente'}">
                    <span class="avatar-circle">${job && job.recruiter_email ? job.recruiter_email.charAt(0).toUpperCase() : 'P'}</span>
                    <span class="recruiter-text">Recrutador: <b>${job && job.recruiter_email ? job.recruiter_email.split('@')[0] : 'Pendente'}</b></span>
                  </div>
                  <div class="card-actions">
                    <button class="btn btn-secondary btn-sm btn-edit-cand-kanban" data-cand-id="${cand ? cand.id : ''}" data-cand-email="${cand ? cand.email : ''}" title="Editar Informações do Candidato">
                      Editar
                    </button>
                    ${(stage === 'Oferta' || stage === 'Contratado' || app.status === 'Aprovado R&S') ? `
                      <button class="btn btn-primary btn-sm btn-start-admission-card" data-cand-id="${cand ? cand.id : ''}" data-job-id="${job ? job.id : ''}" title="Iniciar ou Ver Processo de Admissão">
                        📋 Admissão
                      </button>
                    ` : ''}
                    ${canMove ? `
                      <button class="btn btn-secondary btn-sm btn-transfer-kanban" data-app-id="${app.id}" title="Mover Candidato para Outra Vaga">
                        Mover
                      </button>
                    ` : ''}
                    ${canDelete ? `
                      <button class="btn btn-danger-outline btn-sm btn-delete-app-card" data-app-id="${app.id}" title="Excluir Candidatura">
                        Excluir
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Bind click handlers
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.onclick = (e) => {
      if (isDraggingCard) return;
      onHistoryClick(card.dataset.appId);
    };
  });

  container.querySelectorAll('.btn-start-admission-card').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const candId = btn.dataset.candId;
      const jobId = btn.dataset.jobId;
      const existing = store.getAdmissions().find(a => a.candidate_id === candId && a.job_id === jobId);
      if (existing) {
        openAdmissionDetailsModal(existing.id);
      } else {
        openNewAdmissionModal(candId, jobId);
      }
    };
  });

  container.querySelectorAll('.btn-download-resume-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const cand = store.getCandidates().find(c => c.id === btn.dataset.candId);
      if (cand) downloadResume(cand.resume_url, cand.resume_name);
    };
  });

  container.querySelectorAll('.btn-edit-cand-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onEditCandidateClick) {
        onEditCandidateClick(btn.dataset.candId || btn.dataset.candEmail);
      }
    };
  });

  container.querySelectorAll('.btn-transfer-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openTransferCandidateJobModal(btn.dataset.appId);
    };
  });

  container.querySelectorAll('.btn-delete-app-card').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onDeleteClick) {
        onDeleteClick(btn.dataset.appId);
      }
    };
  });

  // Bind Drag and Drop handlers
  const cards = container.querySelectorAll('.kanban-card[draggable="true"]');
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      isDraggingCard = true;
      draggedAppId = card.dataset.appId;
      draggedFromStage = card.dataset.stage;
      e.dataTransfer.setData('text/plain', card.dataset.appId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedAppId = null;
      draggedFromStage = null;
      container.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
      setTimeout(() => {
        isDraggingCard = false;
      }, 100);
    });
  });

  const columns = container.querySelectorAll('.kanban-column');
  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedAppId) return;
      e.dataTransfer.dropEffect = 'move';
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', (e) => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
      }
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');

      const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
      const targetStage = column.dataset.stage;

      if (!appId || !targetStage) return;
      if (draggedFromStage === targetStage) return;

      const app = store.getApplicationById(appId);
      if (!app) return;

      if (!authService.canMoveApplication(app, app.job)) {
        showToast('Permissão negada: Somente a recrutadora atribuída a esta vaga pode movimentar candidatos.', 'warning');
        return;
      }

      onMoveClick(appId, targetStage);
    });
  });
}
