// =============================================================================
// ATS PLURIX 360° | Componente Módulo Banco de Talentos
// =============================================================================

import { store } from '../db/store.js';
import { authService } from '../services/authService.js';

export function renderTalentBankTable(candidates, onAttachJobClick, onDeleteCandidateClick, onEditCandidateClick) {
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

