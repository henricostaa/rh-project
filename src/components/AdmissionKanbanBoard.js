// =============================================================================
// ATS PLURIX 360° | Componente Funil de Admissão & Onboarding (Kanban Board)
// =============================================================================

import { ADMISSION_STAGES } from '../db/schema.js';
import { store, formatSalaryRange } from '../db/store.js';
import { authService } from '../services/authService.js';
import { showToast } from './Modals.js';

let draggedAdmissionId = null;
let draggedFromStage = null;
let isDraggingCard = false;

// Calcula o progresso do checklist (0 a 8)
export function getAdmissionChecklistProgress(checklist = {}) {
  let completed = 0;
  const total = 8;

  // 1. Carta Oferta
  if (checklist.oferta_gestor_assinado && checklist.oferta_candidato_assinado) completed++;
  else if (checklist.oferta_gestor_assinado || checklist.oferta_candidato_assinado) completed += 0.5;

  // 2. Link de Admissão
  if (checklist.link_admissao_status === 'Aprovado' || checklist.link_admissao_status === 'Documentos Enviados') completed++;
  else if (checklist.link_admissao_enviado) completed += 0.5;

  // 3. Exame Admissão
  if (checklist.exame_aso_status === 'Apto') completed++;
  else if (checklist.exame_aso_status === 'Agendado' || checklist.exame_protocolo) completed += 0.5;

  // 4. Carta de Banco (Opcional - conta se dispensada ou se emitida)
  if (checklist.carta_banco_dispensada || checklist.carta_banco_emitida) completed++;

  // 5. Chamado de Admissão (DP)
  if (checklist.chamado_dp_status === 'Concluído') completed++;
  else if (checklist.chamado_dp_numero) completed += 0.5;

  // 6. E-mail de Confirmação
  if (checklist.email_confirmacao_enviado) completed++;

  // 7. Acessos GLPI
  if (checklist.glpi_status === 'Concluído') completed++;
  else if (checklist.glpi_ticket_numero) completed += 0.5;

  // 8. Planilha Admissão
  if (checklist.planilha_inserida || checklist.matricula_gerada) completed++;

  const rounded = Math.min(8, Math.round(completed * 10) / 10);
  const percentage = Math.min(100, Math.round((rounded / total) * 100));

  return { completed: rounded, total, percentage };
}

export function renderAdmissionKanbanBoard(
  admissions,
  onMoveClick,
  onDetailsClick,
  onDeleteClick,
  onAdvanceClick
) {
  const container = document.getElementById('admission-kanban-board');
  if (!container) return;

  const counterBadge = document.getElementById('admission-counter-badge');
  if (counterBadge) {
    const activeCount = admissions.filter(a => a.status === 'EM_ANDAMENTO').length;
    counterBadge.textContent = `${activeCount} em andamento (${admissions.length} total)`;
  }

  container.innerHTML = ADMISSION_STAGES.map(stageObj => {
    const stageName = stageObj.name;
    const stageAdmissions = admissions.filter(a => a.current_stage === stageName);

    return `
      <div class="kanban-column admission-column" data-stage="${stageName}">
        <div class="column-header">
          <div style="min-width: 0; flex: 1;">
            <span class="column-title" title="${stageObj.description}">
              ${stageObj.step}. ${stageObj.shortName}
              ${stageObj.isOptional ? '<span class="badge badge-neutral" style="font-size: 0.65rem; padding: 1px 6px;">Opcional</span>' : ''}
            </span>
          </div>
          <span class="column-count">${stageAdmissions.length}</span>
        </div>

        <div class="column-cards" data-stage="${stageName}">
          ${stageAdmissions.length === 0 ? `
            <div style="text-align: center; color: var(--muted); font-size: 0.78rem; padding: 24px 0;">
              Nenhum processo nesta etapa
            </div>
          ` : stageAdmissions.map(adm => {
            const job = adm.job;
            const cand = adm.candidate;
            const sla = store.calculateAdmissionSLA(adm);
            const progress = getAdmissionChecklistProgress(adm.checklist);
            const canMove = true;
            const canDelete = authService.canDeleteCandidate();

            // Formatação de data prevista
            let formattedStartDate = 'A definir';
            if (adm.start_date) {
              const [y, m, d] = adm.start_date.split('-');
              formattedStartDate = `${d}/${m}/${y}`;
            }

            return `
              <div class="kanban-card admission-card ${canMove ? 'draggable' : 'read-only'} ${sla.badgeClass}"
                   ${canMove ? 'draggable="true"' : ''}
                   data-admission-id="${adm.id}"
                   data-stage="${stageName}">
                
                <div class="card-top">
                  <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0;">
                    ${canMove ? '<span class="drag-handle" title="Arraste para mover de etapa">⋮⋮</span>' : ''}
                    <div style="min-width: 0; flex: 1;">
                      <div class="candidate-name" title="${cand ? cand.full_name : 'Candidato'}">
                        ${cand ? cand.full_name : 'Candidato Removido'}
                      </div>
                      <div class="company-tag" style="margin-top: 3px;">
                        <span class="badge badge-company" title="Empresa / Unidade">
                          ${job && job.business_unit ? job.business_unit : 'Plurix'}
                        </span>
                      </div>
                      <div class="job-pill" style="margin-top: 4px;">
                        <span class="job-code">${job ? job.id : 'N/A'}</span>
                        <span class="job-title-text" title="${job ? job.title : 'Sem vaga'}">${job ? job.title : 'Sem vaga'}</span>
                      </div>
                    </div>
                  </div>
                  <span class="badge ${sla.badgeClass}" title="Status do SLA nesta etapa">${sla.label}</span>
                </div>

                <!-- Barra de Progresso do Checklist de Admissão -->
                <div class="admission-progress-box" style="margin: 6px 0 2px 0;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--muted); margin-bottom: 4px; font-weight: 600;">
                    <span>Checklist Admissional</span>
                    <span style="color: var(--navy); font-weight: 700;">${progress.completed}/${progress.total} (${progress.percentage}%)</span>
                  </div>
                  <div class="progress-bar-track" style="height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                    <div class="progress-bar-fill" style="width: ${progress.percentage}%; height: 100%; background: ${progress.percentage === 100 ? '#10b981' : 'linear-gradient(90deg, #00147d, #50baec)'}; border-radius: 999px; transition: width 0.3s ease;"></div>
                  </div>
                </div>

                <div class="card-badges-row">
                  <span class="badge badge-neutral" title="Data Prevista de Início">
                    📅 Início: <b>${formattedStartDate}</b>
                  </span>
                  ${adm.salary ? `
                    <span class="badge badge-neutral" style="background: #f0fdf4; color: #15803d; border-color: #bbf7d0;" title="Salário Acordado">
                      💰 R$ ${Number(adm.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  ` : ''}
                  ${adm.checklist && adm.checklist.glpi_ticket_numero ? `
                    <span class="badge badge-neutral" style="background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;" title="Ticket GLPI de TI">
                      💻 ${adm.checklist.glpi_ticket_numero}
                    </span>
                  ` : ''}
                  ${adm.checklist && adm.checklist.exame_aso_status === 'Apto' ? `
                    <span class="badge badge-a" title="Exame ASO Concluído">
                      🩺 ASO Apto
                    </span>
                  ` : ''}
                  ${adm.checklist && adm.checklist.matricula_gerada ? `
                    <span class="badge badge-neutral" style="background: #faf5ff; color: #7e22ce; border-color: #e9d5ff;" title="Matrícula de Colaborador">
                      🏷️ Matrícula: ${adm.checklist.matricula_gerada}
                    </span>
                  ` : ''}
                </div>

                ${adm.notes ? `
                  <div class="card-obs-box" title="${adm.notes}">
                    <span class="obs-text">"${adm.notes}"</span>
                  </div>
                ` : ''}

                <div class="card-meta">
                  <div class="recruiter-info" title="Responsável: ${adm.responsible_email || 'RH'}">
                    <span class="avatar-circle">${adm.responsible_email ? adm.responsible_email.charAt(0).toUpperCase() : 'R'}</span>
                    <span class="recruiter-text">Resp: <b>${adm.responsible_email ? adm.responsible_email.split('@')[0] : 'RH'}</b></span>
                  </div>
                  <div class="card-actions">
                    <button class="btn btn-secondary btn-sm btn-admission-details" data-admission-id="${adm.id}" title="Abrir Checklist e Detalhes da Admissão">
                      Checklist
                    </button>
                    ${stageObj.step < 9 ? `
                      <button class="btn btn-primary btn-sm btn-admission-advance" data-admission-id="${adm.id}" data-current-step="${stageObj.step}" title="Avançar para a próxima etapa">
                        Avançar &rarr;
                      </button>
                    ` : ''}
                    ${canDelete ? `
                      <button class="btn btn-danger-outline btn-sm btn-delete-admission-card" data-admission-id="${adm.id}" title="Excluir Processo de Admissão">
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

  // Click card handlers
  container.querySelectorAll('.admission-card').forEach(card => {
    card.onclick = (e) => {
      if (isDraggingCard) return;
      if (onDetailsClick) onDetailsClick(card.dataset.admissionId);
    };
  });

  container.querySelectorAll('.btn-admission-details').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onDetailsClick) onDetailsClick(btn.dataset.admissionId);
    };
  });

  container.querySelectorAll('.btn-admission-advance').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const admId = btn.dataset.admissionId;
      const currentStep = parseInt(btn.dataset.currentStep, 10);
      const nextStageObj = ADMISSION_STAGES.find(s => s.step === currentStep + 1);
      if (nextStageObj && onAdvanceClick) {
        onAdvanceClick(admId, nextStageObj.name);
      }
    };
  });

  container.querySelectorAll('.btn-delete-admission-card').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onDeleteClick) onDeleteClick(btn.dataset.admissionId);
    };
  });

  // Bind Drag and Drop handlers
  const cards = container.querySelectorAll('.admission-card[draggable="true"]');
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      isDraggingCard = true;
      draggedAdmissionId = card.dataset.admissionId;
      draggedFromStage = card.dataset.stage;
      e.dataTransfer.setData('text/plain', card.dataset.admissionId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedAdmissionId = null;
      draggedFromStage = null;
      container.querySelectorAll('.admission-column').forEach(col => col.classList.remove('drag-over'));
      setTimeout(() => {
        isDraggingCard = false;
      }, 100);
    });
  });

  const columns = container.querySelectorAll('.admission-column');
  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedAdmissionId) return;
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

      const admId = e.dataTransfer.getData('text/plain') || draggedAdmissionId;
      const targetStage = column.dataset.stage;

      if (!admId || !targetStage) return;
      if (draggedFromStage === targetStage) return;

      const adm = store.getAdmissionById(admId);
      if (!adm) return;

      if (onMoveClick) {
        onMoveClick(admId, targetStage);
      }
    });
  });
}
