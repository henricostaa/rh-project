// =============================================================================
// ATS PLURIX 360° | Componente Funil de Vagas (Kanban Board de Vagas)
// =============================================================================

import { TAXONOMY } from '../db/schema.js';
import { store, formatSalaryRange } from '../db/store.js';
import { authService } from '../services/authService.js';
import { showToast } from './Modals.js';

let draggedJobId = null;
let draggedFromStatus = null;
let isDraggingJobCard = false;

export function renderJobsKanbanBoard(jobs, onMoveStatusClick, onAssignClick, onJobClick, onDeleteJobClick, onEditJobClick) {
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
            const canDelete = authService.canDeleteJob(job);
            const canEditJob = authService.canEditJobDetails(job);
            const jobSla = store.calculateJobSLA(job);

            return `
              <div class="kanban-card job-card ${canEditStatus ? 'draggable' : 'read-only'} ${jobSla.badgeClass}"
                   ${canEditStatus ? 'draggable="true"' : ''}
                   data-job-id="${job.id}"
                   data-status="${status}">
                <div class="card-top">
                  <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0;">
                    ${canEditStatus ? '<span class="drag-handle" title="Clique e arraste para alterar o status da vaga">⋮⋮</span>' : ''}
                    <div style="min-width: 0; flex: 1;">
                      <div class="job-card-header">
                        <span class="job-code-badge">${job.id}</span>
                        <span class="job-card-title" title="${job.title}">${job.title}</span>
                      </div>
                      <div class="job-pill" style="margin-top: 4px;">
                        ${job.business_unit} • ${job.department}${(job.location_city || job.location_state) ? ` • 📍 ${job.location_city || ''}${job.location_state ? `/${job.location_state}` : ''}` : ''}
                      </div>
                    </div>
                  </div>
                  <span class="badge ${jobSla.badgeClass}">${jobSla.label}</span>
                </div>

                <div class="card-badges-row">
                  <span class="badge badge-neutral">${jobAppsCount} candidato(s)</span>
                  <span class="badge badge-neutral" style="background: #f0f9ff; color: #0369a1; border-color: #bae6fd;">💰 ${formatSalaryRange(job.salary_min, job.salary_max)}</span>
                  <span class="badge badge-neutral" style="background: #f8fafc; color: #334155;">📍 ${job.work_model || 'Presencial'}</span>
                  <span class="badge badge-neutral" style="background: #fdf4ff; color: #86198f; border-color: #f5d0fe;">👥 ${job.positions_count || 1} pos.</span>
                  <span class="badge badge-neutral">${job.headcount_type}${job.replaced_employee ? `: ${job.replaced_employee}` : ''}</span>
                  ${job.is_pcd ? '<span class="badge badge-a">PCD</span>' : ''}
                  ${job.is_confidential ? '<span class="badge badge-confidential">Confidencial</span>' : ''}
                </div>

                ${job.observation ? `
                  <div class="card-obs-box" title="${job.observation}">
                    <span class="obs-text">"${job.observation}"</span>
                  </div>
                ` : ''}

                <div class="card-meta job-card-meta">
                  <div class="job-people-grid">
                    <span class="person-tag" title="Business Partner: ${job.bp_in_charge_email || 'N/A'}">BP: <b>${job.bp_in_charge_email ? job.bp_in_charge_email.split('@')[0] : 'N/A'}</b></span>
                    <span class="person-tag" title="Recrutador: ${job.recruiter_email || 'Pendente'}">Recrutador: <b>${job.recruiter_email ? job.recruiter_email.split('@')[0] : 'Pendente'}</b></span>
                  </div>
                  
                  <div class="card-actions job-card-actions">
                    ${canEditJob ? `
                      <button class="btn btn-secondary btn-sm btn-edit-job-kanban" data-job-id="${job.id}" title="Editar Informações da Vaga">
                        Editar
                      </button>
                    ` : ''}

                    ${canDelete ? `
                      <button class="btn btn-danger-outline btn-sm btn-delete-job-kanban" data-job-id="${job.id}" title="Excluir Vaga">
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

  // Click handler for card click (opens Job Details Modal with audit, status, recruiter assignment, etc.)
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.onclick = (e) => {
      if (isDraggingJobCard) return;
      if (onJobClick) {
        onJobClick(card.dataset.jobId);
      }
    };
  });

  // Click handler for edit job
  container.querySelectorAll('.btn-edit-job-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onEditJobClick) {
        onEditJobClick(btn.dataset.jobId);
      }
    };
  });

  // Click handler for job delete from kanban
  container.querySelectorAll('.btn-delete-job-kanban').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onDeleteJobClick) {
        onDeleteJobClick(btn.dataset.jobId);
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
