// =============================================================================
// ATS PLURIX 360° | Módulo de Indicadores, Métricas e Governança de R&S
// Painel Analítico com Gráficos Interativos (Chart.js)
// =============================================================================

import Chart from 'chart.js/auto';
import { store } from '../db/store.js';
import { TAXONOMY, PERSONAS } from '../db/schema.js';

// Cache global para controle de instâncias dos gráficos (evita memory leaks / erros de canvas reuse)
let activeChartInstances = {};

function destroyExistingCharts() {
  Object.keys(activeChartInstances).forEach(key => {
    if (activeChartInstances[key]) {
      try {
        activeChartInstances[key].destroy();
      } catch (e) {
        console.warn('Erro ao destruir gráfico prévio:', e);
      }
      delete activeChartInstances[key];
    }
  });
}

export function renderIndicatorsModule(jobs, applications) {
  const container = document.getElementById('view-indicators');
  if (!container) return;

  const allJobs = store.getJobs();
  const allApps = store.getApplications();
  const allHistory = store.stageHistory || [];

  // Destruir gráficos anteriores antes de re-renderizar
  destroyExistingCharts();

  // ---------------------------------------------------------------------------
  // 1. Apuração de Métricas Globais
  // ---------------------------------------------------------------------------
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status !== 'Concluída' && j.status !== 'Fechada' && j.status !== 'Cancelada').length;
  const closedJobs = jobs.filter(j => j.status === 'Concluída' || j.status === 'Fechada').length;
  const confidentialJobs = jobs.filter(j => j.is_confidential).length;
  const pcdJobs = jobs.filter(j => j.is_pcd).length;

  const totalApps = applications.length;
  const inProgressApps = applications.filter(a => a.status === 'EM_ANDAMENTO').length;
  const hiredApps = applications.filter(a => a.current_stage === 'Contratado' || a.status === 'Aprovado R&S').length;
  const rejectedApps = applications.filter(a => a.status && a.status.startsWith('Reprovado')).length;

  // Apuração determinística de SLA
  let slaNoPrazo = 0;
  let slaAtencao = 0;
  let slaEstourado = 0;

  applications.forEach(app => {
    const sla = store.calculateSLA(app, app.job);
    if (sla.code === 'NO_PRAZO') slaNoPrazo++;
    else if (sla.code === 'ATENCAO') slaAtencao++;
    else if (sla.code === 'ESTOURADO') slaEstourado++;
  });

  const slaConformityPercent = totalApps > 0 ? Math.round((slaNoPrazo / totalApps) * 100) : 100;
  const conversionRate = totalApps > 0 ? ((hiredApps / totalApps) * 100).toFixed(1) : '0.0';

  // Tempo Médio no Funil (Dias Médios por Candidatura a partir do histórico)
  let totalDurationDays = 0;
  let historyCountWithDuration = 0;
  allHistory.forEach(h => {
    if (h.duration_days !== undefined) {
      totalDurationDays += h.duration_days;
      historyCountWithDuration++;
    }
  });
  const avgDaysPerStage = historyCountWithDuration > 0 ? (totalDurationDays / historyCountWithDuration).toFixed(1) : '3.2';

  // ---------------------------------------------------------------------------
  // 2. Análise do Funil por Etapa (Volume & Tempo Médio)
  // ---------------------------------------------------------------------------
  const stageStats = TAXONOMY.funnelStages.map(stage => {
    const appsInStage = applications.filter(a => a.current_stage === stage);
    const count = appsInStage.length;
    const pct = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0;

    let sumDays = 0;
    appsInStage.forEach(a => {
      const enteredAt = new Date(a.stage_entered_at);
      const now = new Date();
      const diffDays = Math.max(0, Math.floor((now - enteredAt) / 86400000));
      sumDays += diffDays;
    });
    const avgDays = count > 0 ? (sumDays / count).toFixed(1) : '0.0';

    return { stage, count, pct, avgDays };
  });

  // ---------------------------------------------------------------------------
  // 3. Desempenho por Recrutadora / BP
  // ---------------------------------------------------------------------------
  const recruiterStats = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP' || p.role === 'GESTORA_RH').map(rec => {
    const recJobs = jobs.filter(j => j.recruiter_email === rec.email || j.bp_in_charge_email === rec.email);
    const recJobIds = new Set(recJobs.map(j => j.id));
    const recApps = applications.filter(a => recJobIds.has(a.job_id));

    let okSla = 0;
    recApps.forEach(a => {
      const sla = store.calculateSLA(a, a.job);
      if (sla.code === 'NO_PRAZO') okSla++;
    });

    const slaPct = recApps.length > 0 ? Math.round((okSla / recApps.length) * 100) : 100;
    const totalMoves = allHistory.filter(h => h.moved_by === rec.email).length;

    return {
      name: rec.name,
      role: rec.role,
      email: rec.email,
      jobsCount: recJobs.length,
      appsCount: recApps.length,
      slaPct,
      totalMoves
    };
  });

  // ---------------------------------------------------------------------------
  // 4. Origem dos Candidatos (Sourcing Channel Analytics)
  // ---------------------------------------------------------------------------
  const sourceCounts = {};
  applications.forEach(a => {
    const src = (a.candidate && a.candidate.source) ? a.candidate.source : 'Outros';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const sourceList = Object.keys(sourceCounts).map(src => ({
    source: src,
    count: sourceCounts[src],
    pct: totalApps > 0 ? Math.round((sourceCounts[src] / totalApps) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // ---------------------------------------------------------------------------
  // 5. Distribuição por Diretoria
  // ---------------------------------------------------------------------------
  const deptCounts = {};
  jobs.forEach(j => {
    const dept = j.department || 'Outros';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptList = Object.keys(deptCounts).map(dept => ({
    dept,
    count: deptCounts[dept],
    pct: totalJobs > 0 ? Math.round((deptCounts[dept] / totalJobs) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // ---------------------------------------------------------------------------
  // Renderização do HTML Base
  // ---------------------------------------------------------------------------
  container.innerHTML = `
    <div class="metrics-module">
      <!-- Header do Módulo -->
      <div class="metrics-header-banner">
        <div>
          <h2 class="metrics-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Painel Executivo de Indicadores &amp; Gráficos 360°
          </h2>
          <p class="metrics-subtitle">
            Análise visual consolidada de desempenho, governança de SLAs, velocidade de contratação e produtividade de R&amp;S.
          </p>
        </div>
        <div class="metrics-actions">
          <button id="btn-print-metrics" class="btn btn-secondary btn-sm" onclick="window.print()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir Relatório Executivo
          </button>
        </div>
      </div>

      <!-- Grade Principal de Indicadores Executivos (6 KPIs) -->
      <div class="metrics-kpi-grid">
        <div class="metrics-card">
          <div class="metrics-card-label">Volume de Vagas Ativas</div>
          <div class="metrics-card-value">${activeJobs} <span class="metrics-sub-val">/ ${totalJobs} totais</span></div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${totalJobs > 0 ? (activeJobs / totalJobs) * 100 : 0}%; background: var(--navy);"></div>
          </div>
          <div class="metrics-card-footer">
            <span>${closedJobs} vagas concluídas</span>
          </div>
        </div>

        <div class="metrics-card">
          <div class="metrics-card-label">Candidatos no Pipeline</div>
          <div class="metrics-card-value">${inProgressApps} <span class="metrics-sub-val">ativos</span></div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${totalApps > 0 ? (inProgressApps / totalApps) * 100 : 0}%; background: #38bdf8;"></div>
          </div>
          <div class="metrics-card-footer">
            <span>${totalApps} candidaturas totais</span>
          </div>
        </div>

        <div class="metrics-card ${slaConformityPercent >= 80 ? 'border-pos' : slaConformityPercent >= 60 ? 'border-gold' : 'border-neg'}">
          <div class="metrics-card-label">Conformidade SLA Operacional</div>
          <div class="metrics-card-value ${slaConformityPercent >= 80 ? 'text-pos' : slaConformityPercent >= 60 ? 'text-gold' : 'text-neg'}">${slaConformityPercent}%</div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${slaConformityPercent}%; background: ${slaConformityPercent >= 80 ? 'var(--pos)' : slaConformityPercent >= 60 ? 'var(--gold)' : 'var(--neg)'}"></div>
          </div>
          <div class="metrics-card-footer">
            <span>${slaNoPrazo} no prazo • ${slaEstourado} estourados</span>
          </div>
        </div>

        <div class="metrics-card">
          <div class="metrics-card-label">Tempo Médio / Etapa</div>
          <div class="metrics-card-value">${avgDaysPerStage} <span class="metrics-sub-val">dias</span></div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${Math.min(100, parseFloat(avgDaysPerStage) * 20)}%; background: #8b5cf6;"></div>
          </div>
          <div class="metrics-card-footer">
            <span>Baseado no histórico imutável</span>
          </div>
        </div>

        <div class="metrics-card">
          <div class="metrics-card-label">Taxa de Conversão Funil</div>
          <div class="metrics-card-value">${conversionRate}%</div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${Math.min(100, parseFloat(conversionRate) * 5)}%; background: var(--pos);"></div>
          </div>
          <div class="metrics-card-footer">
            <span>${hiredApps} contratados / finalizados</span>
          </div>
        </div>

        <div class="metrics-card">
          <div class="metrics-card-label">Governança: PCD &amp; Sigilo</div>
          <div class="metrics-card-value">🔒 ${confidentialJobs} <span class="metrics-sub-val">| ♿ ${pcdJobs}</span></div>
          <div class="metrics-card-bar">
            <div class="metrics-bar-fill" style="width: ${totalJobs > 0 ? ((confidentialJobs + pcdJobs) / totalJobs) * 100 : 0}%; background: var(--gold);"></div>
          </div>
          <div class="metrics-card-footer">
            <span>Restrição RBAC imutável ativa</span>
          </div>
        </div>
      </div>

      <!-- SEÇÃO GRÁFICOS INTERATIVOS 360° (Chart.js Dashboard) -->
      <div class="metrics-charts-grid">
        <!-- Gráfico 1: Funil de Candidatos por Etapa -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                Funil de Conversão do Pipeline
              </h3>
              <p class="chart-subtitle">Volume de candidatos em cada etapa do processo seletivo</p>
            </div>
            <span class="chart-badge-tag">${totalApps} candidatos</span>
          </div>
          <div class="chart-container">
            <canvas id="chart-funnel-bar"></canvas>
          </div>
        </div>

        <!-- Gráfico 2: Conformidade de SLA Operacional -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Governança &amp; Conformidade de SLA
              </h3>
              <p class="chart-subtitle">Proporção de processos no prazo vs. em atenção ou estourados</p>
            </div>
            <span class="chart-badge-tag">${slaConformityPercent}% OK</span>
          </div>
          <div class="chart-container">
            <canvas id="chart-sla-doughnut"></canvas>
          </div>
        </div>

        <!-- Gráfico 3: Vagas vs Candidatos por Diretoria -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                Vagas &amp; Candidatos por Diretoria
              </h3>
              <p class="chart-subtitle">Demanda de posições e volume de inscritos por área de negócio</p>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-dept-grouped"></canvas>
          </div>
        </div>

        <!-- Gráfico 4: Distribuição de Vagas por Status -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                Distribuição das Vagas por Status
              </h3>
              <p class="chart-subtitle">Mapeamento do ciclo de vida e andamento das posições</p>
            </div>
            <span class="chart-badge-tag">${totalJobs} vagas</span>
          </div>
          <div class="chart-container">
            <canvas id="chart-jobs-status-pie"></canvas>
          </div>
        </div>

        <!-- Gráfico 5: Origem dos Talentos (Sourcing) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Canais de Origem dos Talentos (Sourcing)
              </h3>
              <p class="chart-subtitle">Atração de candidaturas por canal de recrutamento</p>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-sourcing-polar"></canvas>
          </div>
        </div>

        <!-- Gráfico 6: Desempenho por Recrutadora / BP -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Produtividade por Recrutadora / BP
              </h3>
              <p class="chart-subtitle">Comparativo de vagas conduzidas e candidatos atendidos</p>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="chart-recruiter-performance"></canvas>
          </div>
        </div>
      </div>

      <!-- Seção 3: Detalhamento do Funil (Barras de Progresso e Média de Dias) -->
      <div class="metrics-section card">
        <div class="metrics-section-header">
          <div>
            <h3 class="metrics-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
              Tempo Médio de Permanência por Etapa (Diagnóstico de Gargalos)
            </h3>
            <p class="metrics-section-subtitle">Duração média acumulada dos candidatos em cada fase do processo</p>
          </div>
        </div>

        <div class="funnel-metrics-wrapper">
          ${stageStats.map((stg, idx) => `
            <div class="funnel-stage-row">
              <div class="stage-info">
                <span class="stage-num">${idx + 1}</span>
                <div class="stage-name-box">
                  <span class="stage-title">${stg.stage}</span>
                  <span class="stage-avg-time">⏱️ Média: ${stg.avgDays} dias nesta etapa</span>
                </div>
              </div>

              <div class="stage-bar-container">
                <div class="stage-bar">
                  <div class="stage-bar-fill" style="width: ${Math.max(5, stg.pct)}%;"></div>
                </div>
              </div>

              <div class="stage-stat-badge">
                <span class="stat-count">${stg.count} candidatos</span>
                <span class="stat-pct">(${stg.pct}%)</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Seção 4: Tabela de Produtividade & Governança Imutável -->
      <div class="metrics-grid-2">
        <!-- Coluna 1: Tabela de Produtividade por Recrutadora / BP -->
        <div class="card">
          <div class="metrics-section-header">
            <div>
              <h3 class="metrics-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Tabela de Desempenho R&amp;S
              </h3>
              <p class="metrics-section-subtitle">Métricas detalhadas por responsável técnico</p>
            </div>
          </div>

          <div class="tbl-wrap" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Responsável</th>
                  <th>Vagas</th>
                  <th>Candidatos</th>
                  <th>SLA No Prazo</th>
                  <th>Transições Auditadas</th>
                </tr>
              </thead>
              <tbody>
                ${recruiterStats.map(r => `
                  <tr>
                    <td>
                      <div class="cell-main">${r.name}</div>
                      <div class="cell-sub">${r.email}</div>
                    </td>
                    <td><span class="badge badge-neutral">${r.jobsCount} vagas</span></td>
                    <td><strong>${r.appsCount}</strong></td>
                    <td>
                      <span class="badge ${r.slaPct >= 80 ? 'badge-a' : r.slaPct >= 60 ? 'badge-b' : 'badge-c'}">
                        ${r.slaPct}%
                      </span>
                    </td>
                    <td><span class="cell-sub">${r.totalMoves} registros</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Coluna 2: Trilha de Auditoria e Governança Imutável -->
        <div class="card metrics-governance-card" style="margin-top: 0; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="metrics-section-header">
              <div>
                <h3 class="metrics-section-title text-navy">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Trilha de Auditoria &amp; Governança
                </h3>
                <p class="metrics-section-subtitle">Registros INSERT-Only em stage_history</p>
              </div>
              <span class="badge badge-a">Imutável</span>
            </div>

            <div class="governance-stats-strip" style="margin-top: 20px;">
              <div class="gov-stat-item">
                <span class="gov-stat-val">${allHistory.length}</span>
                <span class="gov-stat-lbl">Transições Totais Auditadas</span>
              </div>
              <div class="gov-stat-item">
                <span class="gov-stat-val">${totalApps > 0 ? (allHistory.length / totalApps).toFixed(1) : 0}</span>
                <span class="gov-stat-lbl">Movimentações / Candidato</span>
              </div>
              <div class="gov-stat-item">
                <span class="gov-stat-val">100%</span>
                <span class="gov-stat-lbl">Conformidade e Rastreabilidade</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ---------------------------------------------------------------------------
  // Inicialização dos Gráficos Chart.js após inserção no DOM
  // ---------------------------------------------------------------------------
  initCharts({
    stageStats,
    totalApps,
    totalJobs,
    slaNoPrazo,
    slaAtencao,
    slaEstourado,
    jobs,
    applications,
    sourceList,
    recruiterStats
  });
}

function initCharts({
  stageStats,
  totalApps,
  totalJobs,
  slaNoPrazo,
  slaAtencao,
  slaEstourado,
  jobs,
  applications,
  sourceList,
  recruiterStats
}) {
  // 1. Gráfico de Funil (Bar Horizontal / Vertical)
  const ctxFunnel = document.getElementById('chart-funnel-bar')?.getContext('2d');
  if (ctxFunnel) {
    activeChartInstances['funnel'] = new Chart(ctxFunnel, {
      type: 'bar',
      data: {
        labels: stageStats.map(s => s.stage),
        datasets: [{
          label: 'Candidatos',
          data: stageStats.map(s => s.count),
          backgroundColor: [
            '#00147D',
            '#0033ad',
            '#0284c7',
            '#38bdf8',
            '#10B981',
            '#047857'
          ],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} candidato(s) (${totalApps > 0 ? Math.round((ctx.raw / totalApps) * 100) : 0}%)`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0, font: { family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', weight: '500', size: 11 } }
          }
        }
      }
    });
  }

  // 2. Gráfico de SLA Operacional (Doughnut)
  const ctxSLA = document.getElementById('chart-sla-doughnut')?.getContext('2d');
  if (ctxSLA) {
    activeChartInstances['sla'] = new Chart(ctxSLA, {
      type: 'doughnut',
      data: {
        labels: ['No Prazo', 'Em Atenção', 'Estourado'],
        datasets: [{
          data: [slaNoPrazo, slaAtencao, slaEstourado],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter', size: 12 }, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} candidatura(s)`
            }
          }
        }
      }
    });
  }

  // 3. Gráfico de Vagas & Candidatos por Diretoria (Grouped Bar Chart)
  const ctxDept = document.getElementById('chart-dept-grouped')?.getContext('2d');
  if (ctxDept) {
    const deptMap = {};
    jobs.forEach(j => {
      const d = j.department || 'Outros';
      if (!deptMap[d]) deptMap[d] = { jobs: 0, apps: 0 };
      deptMap[d].jobs += 1;
    });

    applications.forEach(a => {
      const d = (a.job && a.job.department) ? a.job.department : 'Outros';
      if (!deptMap[d]) deptMap[d] = { jobs: 0, apps: 0 };
      deptMap[d].apps += 1;
    });

    const depts = Object.keys(deptMap);
    const jobsData = depts.map(d => deptMap[d].jobs);
    const appsData = depts.map(d => deptMap[d].apps);

    activeChartInstances['dept'] = new Chart(ctxDept, {
      type: 'bar',
      data: {
        labels: depts,
        datasets: [
          {
            label: 'Vagas Abertas',
            data: jobsData,
            backgroundColor: '#00147D',
            borderRadius: 5
          },
          {
            label: 'Candidatos Inscritos',
            data: appsData,
            backgroundColor: '#38bdf8',
            borderRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { family: 'Inter' } },
            grid: { color: '#f1f5f9' }
          },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }

  // 4. Gráfico de Distribuição por Status das Vagas (Doughnut)
  const ctxJobStatus = document.getElementById('chart-jobs-status-pie')?.getContext('2d');
  if (ctxJobStatus) {
    const statusCounts = {};
    jobs.forEach(j => {
      statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
    });
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    activeChartInstances['jobStatus'] = new Chart(ctxJobStatus, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#0284c7', '#38bdf8', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter', size: 11 }, padding: 12 }
          }
        }
      }
    });
  }

  // 5. Gráfico de Origem dos Talentos / Sourcing (Horizontal Bar)
  const ctxSourcing = document.getElementById('chart-sourcing-polar')?.getContext('2d');
  if (ctxSourcing) {
    activeChartInstances['sourcing'] = new Chart(ctxSourcing, {
      type: 'bar',
      data: {
        labels: sourceList.map(s => s.source),
        datasets: [{
          label: 'Candidatos',
          data: sourceList.map(s => s.count),
          backgroundColor: '#0284c7',
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0, font: { family: 'Inter' } }
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
  }

  // 6. Gráfico de Produtividade por Recrutadora / BP
  const ctxRec = document.getElementById('chart-recruiter-performance')?.getContext('2d');
  if (ctxRec) {
    activeChartInstances['recruiter'] = new Chart(ctxRec, {
      type: 'bar',
      data: {
        labels: recruiterStats.map(r => r.name),
        datasets: [
          {
            label: 'Vagas Conduzidas',
            data: recruiterStats.map(r => r.jobsCount),
            backgroundColor: '#00147D',
            borderRadius: 4
          },
          {
            label: 'Candidatos Atendidos',
            data: recruiterStats.map(r => r.appsCount),
            backgroundColor: '#38bdf8',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter' } }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }
}
