// =============================================================================
// ATS PLURIX 360° | Componente Funil do Candidato (Kanban Board 9 Etapas)
// =============================================================================

import { TAXONOMY } from '../db/schema.js';
import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { showToast } from './Modals.js';

let draggedAppId = null;
let draggedFromStage = null;
let isDraggingCard = false;

export function renderKanbanBoard(applications, onMoveClick, onHistoryClick, onDeleteClick) {
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
              <div class="kanban-card ${canMove ? 'draggable' : 'read-only'}"
                   ${canMove ? 'draggable="true"' : ''}
                   data-app-id="${app.id}"
                   data-stage="${stage}">
                <div class="card-top">
                  <div style="display: flex; align-items: flex-start; gap: 6px;">
                    ${canMove ? '<span class="drag-handle" title="Clique e arraste para mover">⋮⋮</span>' : ''}
                    <div>
                      <div class="candidate-name">${cand ? cand.full_name : 'Candidato Removido'}</div>
                      <div class="job-pill" style="margin-top: 4px;">
                        ${job ? `${job.id} - ${job.title}` : 'Sem vaga'}
                      </div>
                    </div>
                  </div>
                  <span class="badge ${sla.badgeClass}">${sla.label}</span>
                </div>

                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                  <span class="badge badge-neutral">${app.status}</span>
                  ${job && job.is_confidential ? '<span class="badge badge-confidential">🔒 Confidencial</span>' : ''}
                  ${cand && cand.source ? `<span class="badge badge-neutral">📍 ${cand.source}</span>` : ''}
                </div>

                <div class="card-meta">
                  <span>Recrutador: <b>${job && job.recruiter_email ? job.recruiter_email.split('@')[0] : 'Pendente'}</b></span>
                  <div class="card-actions" style="gap: 4px;">
                    ${canDelete ? `
                      <button class="btn btn-danger-outline btn-sm btn-delete-app-card" data-app-id="${app.id}" title="Excluir Candidatura">
                        🗑️
                      </button>
                    ` : ''}
                    ${canMove ? `
                      <button class="btn btn-primary btn-sm btn-move" data-app-id="${app.id}">
                        Avançar &rarr;
                      </button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" disabled title="Sem permissão para movimentar (Apenas recrutadora atribuída)">
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

  // Bind click handlers
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.onclick = (e) => {
      if (isDraggingCard) return;
      onHistoryClick(card.dataset.appId);
    };
  });

  container.querySelectorAll('.btn-move').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      onMoveClick(btn.dataset.appId);
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
