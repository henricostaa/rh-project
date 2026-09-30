// =============================================================================
// ATS PLURIX 360° | Componente Grade de Indicadores (KPI Grid - Section 9.2)
// =============================================================================

import { jobService } from '../services/jobService.js';
import { pipelineService } from '../services/pipelineService.js';
import { store } from '../db/store.js';

export function renderKPIGrid() {
  const container = document.getElementById('kpi-grid');
  if (!container) return;

  const visibleJobs = jobService.getVisibleJobs();
  const visibleApps = pipelineService.getVisibleApplications();

  // Metrics computation
  const activeJobsCount = visibleJobs.filter(j => j.status !== 'Fechada' && j.status !== 'Cancelada').length;
  const activeAppsCount = visibleApps.filter(a => a.status === 'EM_ANDAMENTO').length;

  let noPrazoCount = 0;
  let estouradoCount = 0;

  visibleApps.forEach(app => {
    const sla = store.calculateSLA(app, app.job);
    if (sla.code === 'NO_PRAZO') noPrazoCount++;
    if (sla.code === 'ESTOURADO') estouradoCount++;
  });

  const slaConformityPercent = visibleApps.length > 0 
    ? Math.round((noPrazoCount / visibleApps.length) * 100) 
    : 100;

  const confidentialCount = visibleJobs.filter(j => j.is_confidential).length;

  container.innerHTML = `
    <!-- Card 1: Total de Vagas Ativas -->
    <div class="kpi-card">
      <div class="kpi-header">
        <span>Vagas em Aberto</span>
        <div class="kpi-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
      </div>
      <div class="kpi-value">${activeJobsCount}</div>
      <div class="kpi-footer">
        <span>${visibleJobs.length} vagas visíveis ao seu perfil</span>
      </div>
    </div>

    <!-- Card 2: Candidaturas em Andamento -->
    <div class="kpi-card kpi-pos">
      <div class="kpi-header">
        <span>Em Andamento</span>
        <div class="kpi-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
      </div>
      <div class="kpi-value">${activeAppsCount}</div>
      <div class="kpi-footer">
        <span>${visibleApps.length} candidaturas totais registradas</span>
      </div>
    </div>

    <!-- Card 3: Conformidade de SLA -->
    <div class="kpi-card ${slaConformityPercent >= 80 ? 'kpi-pos' : slaConformityPercent >= 60 ? 'kpi-gold' : 'kpi-neg'}">
      <div class="kpi-header">
        <span>Conformidade SLA</span>
        <div class="kpi-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="kpi-value">${slaConformityPercent}%</div>
      <div class="kpi-footer">
        <span>${noPrazoCount} dentro do prazo estipulado</span>
      </div>
    </div>

    <!-- Card 4: Alertas de SLA Estourado & Sigilo -->
    <div class="kpi-card ${estouradoCount > 0 ? 'kpi-neg' : 'kpi-gold'}">
      <div class="kpi-header">
        <span>SLA Crítico / Sigilo</span>
        <div class="kpi-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      </div>
      <div class="kpi-value">${estouradoCount} <span style="font-size: 1rem; color: var(--muted); font-weight: normal;">estourados</span></div>
      <div class="kpi-footer">
        <span>🔒 ${confidentialCount} vagas confidenciais ativas</span>
      </div>
    </div>
  `;
}
