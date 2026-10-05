import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { downloadResume, openTransferCandidateJobModal } from './Modals.js';

export function renderCandidatesTable(applications, onMoveClick, onHistoryClick, onDeleteClick, onEditCandidateClick) {
  const tbody = document.getElementById('applications-table-body');
  if (!tbody) return;

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 30px; color: var(--muted);">
          Nenhuma candidatura encontrada com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = applications.map(app => {
    const cand = app.candidate;
    const job = app.job;
    const sla = store.calculateSLA(app, job);
    const canMove = authService.canMoveApplication(app, job);
    const canDelete = authService.canDeleteApplication(app, job);

    return `
      <tr>
        <td>
          <div class="cell-main">${cand ? cand.full_name : 'N/A'}</div>
          <div class="cell-sub">${cand ? cand.email : ''}</div>
          <div style="margin-top: 2px;">
            <span class="badge badge-neutral" style="font-size: 0.7rem;">${cand && cand.gender ? cand.gender : 'Não informado'}</span>
          </div>
          ${cand && (cand.resume_url || cand.resume_name) ? `
            <div style="margin-top: 4px;">
              <button type="button" class="btn-download-resume-table" data-cand-id="${cand.id}" style="background:none; border:none; padding:0; font-size: 0.75rem; color: var(--primary-color, #00147d); font-weight: 600; text-decoration: underline; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" title="Visualizar / Baixar Currículo">
                📎 ${cand.resume_name || 'Currículo'}
              </button>
            </div>
          ` : ''}
        </td>
        <td>
          <div class="cell-main">${cand && cand.phone ? cand.phone : '--'}</div>
          <div class="cell-sub">Canal: ${cand ? cand.source : 'N/A'}</div>
        </td>
        <td>
          <div class="cell-main">${job ? `${job.id} - ${job.title}` : 'N/A'}</div>
          <div class="cell-sub"><b>${job ? job.business_unit : 'N/A'}</b> • ${job ? job.department : ''} ${job && job.is_confidential ? '(Confidencial)' : ''}</div>
        </td>
        <td>
          <span class="cell-main">${job && job.recruiter_email ? job.recruiter_email : '<em style="color: var(--muted)">Pendente</em>'}</span>
        </td>
        <td>
          <span class="badge badge-neutral">${app.current_stage}</span>
        </td>
        <td>
          <div class="cell-main">${sla.days} dia(s)</div>
          <div class="cell-sub">SLA Limite: ${sla.limit} dias</div>
        </td>
        <td>
          <span class="badge ${sla.badgeClass}">${sla.label}</span>
        </td>
        <td>
          <span class="badge badge-neutral">${app.status}</span>
        </td>
        <td class="text-right">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm btn-edit-cand-table" data-cand-id="${cand ? cand.id : ''}" data-cand-email="${cand ? cand.email : ''}" title="Editar Candidato">
              Editar
            </button>
            <button class="btn btn-secondary btn-sm btn-history-table" data-app-id="${app.id}" title="Ver Auditoria">
              Auditoria
            </button>
            ${canMove ? `
              <button class="btn btn-primary btn-sm btn-move-table" data-app-id="${app.id}">
                Transicionar
              </button>
              <button class="btn btn-secondary btn-sm btn-transfer-app-table" data-app-id="${app.id}" title="Mover Candidato para Outra Vaga">
                Mover Vaga
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled>Leitura</button>
            `}
            ${canDelete ? `
              <button class="btn btn-danger-outline btn-sm btn-delete-app-table" data-app-id="${app.id}" title="Excluir Candidatura">
                Excluir
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-download-resume-table').forEach(btn => {
    btn.onclick = () => {
      const cand = store.getCandidates().find(c => c.id === btn.dataset.candId);
      if (cand) downloadResume(cand.resume_url, cand.resume_name);
    };
  });

  tbody.querySelectorAll('.btn-edit-cand-table').forEach(btn => {
    btn.onclick = () => {
      if (onEditCandidateClick) {
        onEditCandidateClick(btn.dataset.candId || btn.dataset.candEmail);
      }
    };
  });

  tbody.querySelectorAll('.btn-move-table').forEach(btn => {
    btn.onclick = () => onMoveClick(btn.dataset.appId);
  });

  tbody.querySelectorAll('.btn-transfer-app-table').forEach(btn => {
    btn.onclick = () => openTransferCandidateJobModal(btn.dataset.appId);
  });

  tbody.querySelectorAll('.btn-history-table').forEach(btn => {
    btn.onclick = () => onHistoryClick(btn.dataset.appId);
  });

  tbody.querySelectorAll('.btn-delete-app-table').forEach(btn => {
    btn.onclick = () => {
      if (onDeleteClick) {
        onDeleteClick(btn.dataset.appId);
      }
    };
  });
}

