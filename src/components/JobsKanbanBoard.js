// =============================================================================
// ATS PLURIX 360° | Componente Funil de Vagas (Kanban Board de Vagas)
// =============================================================================

import { TAXONOMY } from '../db/schema.js';
import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { showToast } from './Modals.js';

let draggedJobId = null;
let draggedFromStatus = null;
let isDraggingJobCard = false;

export function renderJobsKanbanBoard(jobs, onMoveStatusClick, onAssignClick, onJobClick) {
  const container = document.getElementById('jobs-kanban-board');
  if (!container) return;

  const statuses = TAXONOMY.jobStatuses;
  const allApps = store.getApplications();

  container.innerHTML = statuses.map(status => {
    const statusJobs = jobs.filter(j => j.status === status);

    return `
      <div class="kanban-column" data-status="${status}">
        <div class="column-header">
          <span class="column-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            ${status}
          </span>
          <span class="column-count">${statusJobs.length}</span>
        </div>

        <div class="column-cards" data-status="${status}">
          ${statusJobs.length === 0 ? `
            <div style="text-align: center; color: var(--muted); font-size: 0.78rem; padding: 20px 0;">
              Nenhuma vaga nesta etapa
            </div>
          ` : statusJobs.map(job => {
            const jobAppsCount = allApps.filter(a => a.job_id === job.id).length;
            const canEditStatus = authService.canEditJobStatus(job);
            const canAssign = authService.canAssignRecruiter(job);

            return `
              <div class="kanban-card ${canEditStatus ? 'draggable' : 'read-only'}"
                   ${canEditStatus ? 'draggable="true"' : ''}
                   data-job-id="${job.id}"
                   data-status="${status}">
                <div class="card-top">
                  <div style="display: flex; align-items: flex-start; gap: 6px;">
                    ${canEditStatus ? '<span class="drag-handle" title="Clique e arraste para alterar o status da vaga">⋮⋮</span>' : ''}
                    <div>
                      <div class="candidate-name" style="font-family: var(--font-heading); flex-wrap: wrap;">
                        <span style="color: var(--navy); font-weight: 700;">${job.id}</span> • ${job.title}
                      </div>
                      <div class="job-pill" style="margin-top: 4px;">
                        ${job.business_unit} • ${job.department}
                      </div>
                    </div>
                  </div>
                </div>

                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                  <span class="badge badge-neutral">${jobAppsCount} candidato(s)</span>
                  <span class="badge badge-neutral">${job.headcount_type}</span>
                  ${job.is_pcd ? '<span class="badge badge-a">♿ PCD</span>' : ''}
                  ${job.is_confidential ? '<span class="badge badge-confidential">🔒 Confidencial</span>' : ''}
                </div>

                ${job.observation ? `
                  <div style="font-size: 0.72rem; color: #595959; font-style: italic; margin-top: 4px; background: #fffbe6; padding: 4px 8px; border-radius: 4px; border: 1px solid #ffe58f; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${job.observation}">
                    📝 "${job.observation}"
                  </div>
                ` : ''}

                <div class="card-meta" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.74rem;">
                    <span>BP: <b>${job.bp_in_charge_email ? job.bp_in_charge_email.split('@')[0] : 'N/A'}</b></span>
                    <span>Recrutador: <b>${job.recruiter_email ? job.recruiter_email.split('@')[0] : 'Pendente'}</b></span>
                  </div>
                  
                  <div class="card-actions" style="width: 100%; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                    <button class="btn btn-secondary btn-sm btn-job-audit-kanban" data-job-id="${job.id}" title="Ver Detalhes e Auditoria da Vaga">
                      Auditoria
                    </button>

                    ${canAssign ? `
                      <button class="btn btn-secondary btn-sm btn-assign-recruiter-kanban" data-job-id="${job.id}" title="Atribuir Recrutadora">
                        Atribuir
                      </button>
                    ` : ''}

                    ${canEditStatus ? `
                      <button class="btn btn-primary btn-sm btn-move-job-status" data-job-id="${job.id}">
                        Status &rarr;
                      </button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" disabled title="Sem permissão para alterar status desta vaga">
                        Leitura
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Click handler for card click (opens Job Details Modal)
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.onclick = (e) => {
      if (isDraggingJobCard) return;
      if (onJobClick) {
        onJobClick(card.dataset.jobId);
      }
    };
  });

  // Click handler for card status change
  container.querySelectorAll('.btn-move-job-status').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      onMoveStatusClick(btn.dataset.jobId);
    };
  });

  // Click handler for recruiter assignment from kanban
  container.querySelectorAll('.btn-assign-recruiter-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      onAssignClick(btn.dataset.jobId);
    };
  });

  // Click handler for job audit modal from kanban
  container.querySelectorAll('.btn-job-audit-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onJobClick) {
        onJobClick(btn.dataset.jobId);
      }
    };
  });

  // Bind Drag and Drop handlers
  const cards = container.querySelectorAll('.kanban-card[draggable="true"]');
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      isDraggingJobCard = true;
      draggedJobId = card.dataset.jobId;
      draggedFromStatus = card.dataset.status;
      e.dataTransfer.setData('text/plain', card.dataset.jobId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedJobId = null;
      draggedFromStatus = null;
      container.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
      setTimeout(() => {
        isDraggingJobCard = false;
      }, 100);
    });
  });

  const columns = container.querySelectorAll('.kanban-column');
  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedJobId) return;
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

      const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
      const targetStatus = column.dataset.status;

      if (!jobId || !targetStatus) return;
      if (draggedFromStatus === targetStatus) return;

      const job = store.getJobById(jobId);
      if (!job) return;

      if (!authService.canEditJobStatus(job)) {
        showToast('Permissão negada: Somente a Gestora de RH, BP titular ou a recrutadora atribuída podem alterar o status desta vaga.', 'warning');
        return;
      }

      onMoveStatusClick(jobId, targetStatus);
    });
  });
}
