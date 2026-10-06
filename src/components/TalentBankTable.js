import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { downloadResume, openCandidateHistoryModal } from './Modals.js';

export function renderTalentBankTable(candidates, onAttachJobClick, onDeleteCandidateClick, onEditCandidateClick, onHistoryClick) {
  const tbody = document.getElementById('talent-bank-table-body');
  if (!tbody) return;

  if (candidates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: var(--muted);">
          Nenhum candidato cadastrado no Banco de Talentos com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  const allApps = store.getApplications();

  tbody.innerHTML = candidates.map(cand => {
    const candApps = allApps.filter(a => a.candidate_id === cand.id || (a.candidate && a.candidate.email === cand.email));
    const canDelete = authService.canDeleteCandidate();
    const formattedDate = cand.created_at ? new Date(cand.created_at).toLocaleDateString('pt-BR') : '--';

    const jobsBadgesHtml = candApps.length > 0 
      ? candApps.map(a => `<span class="badge badge-neutral" style="margin-right: 4px; margin-bottom: 2px;">${a.job ? a.job.id : 'Vaga'} (${a.current_stage})</span>`).join('')
      : '<span class="badge badge-b">Sem Vagas Ativas</span>';

    return `
      <tr>
        <td>
          <div class="cell-main" style="font-weight: 600; color: var(--navy);">${cand.full_name}</div>
          <div style="margin-top: 2px; display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
            <span class="badge badge-neutral" style="font-size: 0.7rem;">${cand.gender || 'Não informado'}</span>
            ${cand.salary_expectation ? `<span class="badge badge-neutral" style="font-size: 0.7rem; background: #f0f9ff; color: #0369a1; border-color: #bae6fd;">💰 R$ ${Number(cand.salary_expectation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>` : ''}
          </div>
          ${(cand.resume_url || cand.resume_name) ? `
            <div style="margin-top: 4px;">
              <button type="button" class="btn-download-resume-talent" data-cand-id="${cand.id}" style="background:none; border:none; padding:0; font-size: 0.75rem; color: var(--primary-color, #00147d); font-weight: 600; text-decoration: underline; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" title="Visualizar / Baixar Currículo">
                📎 ${cand.resume_name || 'Currículo'}
              </button>
            </div>
          ` : ''}
        </td>
        <td>
          <div class="cell-main">${cand.email}</div>
        </td>
        <td>
          <div class="cell-main">${cand.phone || '--'}</div>
          <div class="cell-sub">Origem: ${cand.source || 'N/A'}</div>
        </td>
        <td>
          <span class="cell-main">${formattedDate}</span>
        </td>
        <td>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 300px;">
            ${jobsBadgesHtml}
          </div>
        </td>
        <td class="text-right" style="white-space: nowrap;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm btn-history-talent" data-cand-id="${cand.id}" data-cand-email="${cand.email}" title="Ver Histórico Completo de Auditoria">
              Histórico
            </button>
            <button class="btn btn-secondary btn-sm btn-edit-talent" data-cand-id="${cand.id}" data-cand-email="${cand.email}" title="Editar informações do candidato">
              Editar
            </button>
            <button class="btn btn-primary btn-sm btn-attach-job" data-cand-id="${cand.id}" data-cand-email="${cand.email}" title="Inscrever este candidato em uma vaga aberta">
              + Vincular a Vaga
            </button>
            ${canDelete ? `
              <button class="btn btn-danger-outline btn-sm btn-delete-talent" data-cand-id="${cand.id}" data-cand-email="${cand.email}" title="Excluir candidato definitivamente do Banco de Talentos">
                Excluir
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-download-resume-talent').forEach(btn => {
    btn.onclick = () => {
      const cand = store.getCandidates().find(c => c.id === btn.dataset.candId);
      if (cand) downloadResume(cand.resume_url, cand.resume_name);
    };
  });

  tbody.querySelectorAll('.btn-history-talent').forEach(btn => {
    btn.onclick = () => {
      openCandidateHistoryModal(btn.dataset.candId || btn.dataset.candEmail);
    };
  });

  tbody.querySelectorAll('.btn-edit-talent').forEach(btn => {
    btn.onclick = () => {
      if (onEditCandidateClick) {
        onEditCandidateClick(btn.dataset.candId, btn.dataset.candEmail);
      }
    };
  });

  tbody.querySelectorAll('.btn-attach-job').forEach(btn => {
    btn.onclick = () => {
      if (onAttachJobClick) {
        onAttachJobClick(btn.dataset.candId, btn.dataset.candEmail);
      }
    };
  });

  tbody.querySelectorAll('.btn-delete-talent').forEach(btn => {
    btn.onclick = () => {
      if (onDeleteCandidateClick) {
        onDeleteCandidateClick(btn.dataset.candId, btn.dataset.candEmail);
      }
    };
  });
}

