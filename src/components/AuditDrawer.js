// =============================================================================
// ATS PLURIX 360° | Componente Drawer de Auditoria de Histórico (RN-03)
// =============================================================================

import { store } from '../db/store.js';
import { pipelineService } from '../services/pipelineService.js';
import { candidateService } from '../services/candidateService.js';
import { authService } from '../services/authService.js';
import { openMoveStageModal, openEditCandidateModal, openTransferCandidateJobModal, openConfirmDeleteModal, downloadResume, showToast } from './Modals.js';

export function openAuditDrawer(applicationId) {
  const modal = document.getElementById('modal-audit') || document.getElementById('audit-drawer');
  const nameEl = document.getElementById('drawer-candidate-name');
  const titleEl = document.getElementById('drawer-job-title');
  const metaEl = document.getElementById('drawer-candidate-meta');
  const timelineEl = document.getElementById('drawer-timeline');

  if (!modal) return;

  const app = store.getApplicationById(applicationId);
  if (!app) return;

  const cand = app.candidate;
  const job = app.job;
  const history = pipelineService.getAuditHistory(applicationId);
  const canMove = authService.canMoveApplication(app, job);

  nameEl.textContent = cand ? `${cand.full_name}` : 'Histórico de Auditoria';
  titleEl.textContent = job ? `Vaga: ${job.id} - ${job.title}` : 'Sem vaga';

  const headerActionsContainer = document.getElementById('audit-header-actions');
  if (headerActionsContainer) {
    headerActionsContainer.innerHTML = (cand && authService.canEditCandidate()) ? `
      <button type="button" id="btn-drawer-edit-cand" class="btn btn-outline-light btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editar Candidato
      </button>
    ` : '';
  }

  metaEl.innerHTML = `
    <div style="font-size: 0.84rem; line-height: 1.6; background: #f8fafc; padding: 14px; border: 1px solid var(--brd); border-radius: var(--rs); margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
        <div>
          <div><b>E-mail:</b> ${cand ? cand.email : '--'} | <b>Sexo / Gênero:</b> <span class="badge badge-neutral">${cand && cand.gender ? cand.gender : 'Não informado'}</span></div>
          <div><b>Empresa / Bandeira:</b> ${job && job.business_unit ? job.business_unit : 'N/A'} | <b>Diretoria:</b> ${job && job.department ? job.department : 'N/A'}</div>
          <div><b>Canal:</b> ${cand ? cand.source : '--'} | <b>Telefone:</b> ${cand && cand.phone ? cand.phone : '--'}</div>
          ${cand && (cand.resume_url || cand.resume_name) ? `
            <div style="margin-top: 3px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <b>Currículo:</b> 
              <button type="button" id="btn-drawer-download-resume" style="background:none; border:none; padding:0; color: var(--primary-color, #00147d); text-decoration: underline; font-weight: 600; cursor: pointer;">📎 ${cand.resume_name || 'Visualizar / Baixar Currículo'}</button>
              <button type="button" id="btn-drawer-remove-resume" style="background:none; border:none; padding:0; color: var(--danger, #ec221f); font-size: 0.78rem; font-weight: 600; cursor: pointer; text-decoration: underline;">🗑️ Remover</button>
            </div>
          ` : ''}
          <div style="margin-top: 4px;"><b>Etapa Atual:</b> <span class="badge badge-neutral">${app.current_stage}</span> | <b>Status:</b> <span class="badge badge-a">${app.status}</span></div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${canMove ? `
            <button type="button" id="btn-drawer-move-stage" class="btn btn-primary btn-sm">
              Etapa &rarr; Transicionar
            </button>
            <button type="button" id="btn-drawer-transfer-job" class="btn btn-secondary btn-sm" title="Mover candidato para outra vaga">
              Mover p/ Outra Vaga
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  const btnDrawerResume = metaEl.querySelector('#btn-drawer-download-resume');
  if (btnDrawerResume && cand) {
    btnDrawerResume.onclick = () => {
      downloadResume(cand.resume_url, cand.resume_name);
    };
  }

  const btnDrawerRemoveResume = metaEl.querySelector('#btn-drawer-remove-resume');
  if (btnDrawerRemoveResume && cand) {
    btnDrawerRemoveResume.onclick = () => {
      openConfirmDeleteModal({
        title: 'Remover Currículo',
        message: `Tem certeza que deseja remover o currículo de <strong>${cand.full_name}</strong>?`,
        details: 'O arquivo de currículo será desvinculado deste candidato.',
        onConfirm: async () => {
          await candidateService.removeResume(cand.id || cand.email);
          showToast('Currículo removido com sucesso!', 'success');
          modal.classList.remove('open');
          openAuditDrawer(applicationId);
        }
      });
    };
  }

  const btnEditCand = modal.querySelector('#btn-drawer-edit-cand');
  if (btnEditCand && cand) {
    btnEditCand.onclick = () => {
      modal.classList.remove('open');
      openEditCandidateModal(cand.id || cand.email);
    };
  }

  const btnMoveStage = metaEl.querySelector('#btn-drawer-move-stage');
  if (btnMoveStage) {
    btnMoveStage.onclick = () => {
      modal.classList.remove('open');
      openMoveStageModal(applicationId);
    };
  }

  const btnTransferJob = metaEl.querySelector('#btn-drawer-transfer-job');
  if (btnTransferJob) {
    btnTransferJob.onclick = () => {
      modal.classList.remove('open');
      openTransferCandidateJobModal(applicationId);
    };
  }

  if (history.length === 0) {
    timelineEl.innerHTML = `
      <div style="text-align: center; color: var(--muted); padding: 20px;">
        Nenhuma movimentação registrada no histórico.
      </div>
    `;
  } else {
    timelineEl.innerHTML = history.map(h => {
      const movedDate = new Date(h.moved_at).toLocaleString('pt-BR');
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-meta">
              <span><b>${h.moved_by}</b></span>
              <span>${movedDate}</span>
            </div>
            <div class="timeline-stages">
              ${h.previous_stage} &rarr; <b>${h.new_stage}</b>
            </div>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px;">
              Permanência na etapa anterior: <b>${h.duration_days} dia(s)</b> | Status: <b>${h.status_at_move}</b>
            </div>
            ${h.feedback ? `
              <div class="timeline-feedback">
                <strong>Parecer Técnico:</strong> "${h.feedback}"
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('open');

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  };
}

