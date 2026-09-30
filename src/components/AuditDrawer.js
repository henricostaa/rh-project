// =============================================================================
// ATS PLURIX 360° | Componente Drawer de Auditoria de Histórico (RN-03)
// =============================================================================

import { store } from '../db/store.js';
import { pipelineService } from '../services/pipelineService.js';

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

  nameEl.textContent = cand ? `Auditoria: ${cand.full_name}` : 'Histórico de Auditoria';
  titleEl.textContent = job ? `Vaga: ${job.id} - ${job.title}` : 'Sem vaga';

  metaEl.innerHTML = `
    <div style="font-size: 0.82rem; line-height: 1.6;">
      <div><b>E-mail:</b> ${cand ? cand.email : '--'}</div>
      <div><b>Canal:</b> ${cand ? cand.source : '--'} | <b>Telefone:</b> ${cand && cand.phone ? cand.phone : '--'}</div>
      <div><b>Etapa Atual:</b> <span class="badge badge-neutral">${app.current_stage}</span> | <b>Status:</b> <span class="badge badge-a">${app.status}</span></div>
    </div>
  `;

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
