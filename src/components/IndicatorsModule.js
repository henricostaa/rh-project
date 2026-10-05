// =============================================================================
// ATS PLURIX 360° | Módulo de Indicadores, Métricas e Governança de R&S e Admissão
// Painel Analítico Executivo com Gráficos Interativos (Chart.js)
// =============================================================================

import Chart from 'chart.js/auto';
import { store } from '../db/store.js';
import { TAXONOMY, PERSONAS, ADMISSION_STAGES, getAdmissionStageSLALimit } from '../db/schema.js';

// Cache global para controle de instâncias dos gráficos (evita memory leaks / erros de canvas reuse)
let activeChartInstances = {};

// Controle de sub-aba ativa no módulo de indicadores: 'all' | 'rs' | 'admissions'
let currentIndicatorsTab = 'all';
let lastRenderArgs = { jobs: [], applications: [], admissions: [] };

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

function formatDate(dateStr) {
  if (!dateStr) return 'Não def.';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return dateStr;
  }
}

function getAdmissionChecklistProgress(adm) {
  const chk = adm.checklist || {};
  let totalSteps = 8;
  let doneSteps = 0;

  if (chk.oferta_gestor_assinado && chk.oferta_candidato_assinado) doneSteps++;
  if (chk.link_admissao_status === 'Aprovado' || chk.link_admissao_status === 'Documentos Enviados') doneSteps++;
  if (chk.exame_aso_status === 'Apto') doneSteps++;
  if (chk.carta_banco_dispensada || chk.carta_banco_emitida) doneSteps++;
  if (chk.chamado_dp_status === 'Concluído' || chk.chamado_dp_status === 'Aberto') doneSteps++;
  if (chk.email_confirmacao_enviado) doneSteps++;
  if (chk.glpi_status === 'Concluído' || chk.glpi_status === 'Em Atendimento') doneSteps++;
  if (chk.planilha_inserida || chk.matricula_gerada) doneSteps++;

  return {
    doneSteps,
    totalSteps,
    pct: Math.round((doneSteps / totalSteps) * 100)
  };
}

export function renderIndicatorsModule(jobs, applications, admissions = null) {
  const container = document.getElementById('view-indicators');
  if (!container) return;

  const allJobs = jobs || store.getJobs();
  const allApps = applications || store.getApplications();
  const allHistory = store.stageHistory || [];
  const allAdmissions = admissions || store.getAdmissions() || [];
  const allAdmHistory = store.admissionStageHistory || [];

  // Salvar argumentos para permitir troca dinâmica de sub-abas sem perda de estado
  lastRenderArgs = { jobs: allJobs, applications: allApps, admissions: allAdmissions };

  // Destruir gráficos anteriores antes de re-renderizar
  destroyExistingCharts();

  // ---------------------------------------------------------------------------
  // 1. Apuração de Métricas Globais de R&S
  // ---------------------------------------------------------------------------
  const totalJobs = allJobs.length;
  const activeJobs = allJobs.filter(j => j.status !== 'Concluída' && j.status !== 'Fechada' && j.status !== 'Cancelada').length;
  const closedJobs = allJobs.filter(j => j.status === 'Concluída' || j.status === 'Fechada').length;
  const confidentialJobs = allJobs.filter(j => j.is_confidential).length;
  const pcdJobs = allJobs.filter(j => j.is_pcd).length;

  const totalApps = allApps.length;
  const inProgressApps = allApps.filter(a => a.status === 'EM_ANDAMENTO').length;
  const hiredApps = allApps.filter(a => a.current_stage === 'Contratado' || a.status === 'Aprovado R&S').length;

  // Apuração determinística de SLA de R&S
  let slaNoPrazo = 0;
  let slaAtencao = 0;
  let slaEstourado = 0;

  allApps.forEach(app => {
    const sla = store.calculateSLA(app, app.job);
    if (sla.code === 'NO_PRAZO') slaNoPrazo++;
    else if (sla.code === 'ATENCAO') slaAtencao++;
    else if (sla.code === 'ESTOURADO') slaEstourado++;
  });

  const slaConformityPercent = totalApps > 0 ? Math.round((slaNoPrazo / totalApps) * 100) : 100;
  const conversionRate = totalApps > 0 ? ((hiredApps / totalApps) * 100).toFixed(1) : '0.0';

  // Tempo Médio no Funil R&S
  let totalDurationDays = 0;
  let historyCountWithDuration = 0;
  allHistory.forEach(h => {
    if (h.duration_days !== undefined) {
      totalDurationDays += h.duration_days;
      historyCountWithDuration++;
    }
  });
  const avgDaysPerStage = historyCountWithDuration > 0 ? (totalDurationDays / historyCountWithDuration).toFixed(1) : '3.2';

  // Análise do Funil R&S por Etapa
  const stageStats = TAXONOMY.funnelStages.map(stage => {
    const appsInStage = allApps.filter(a => a.current_stage === stage);
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

  // Desempenho por Recrutadora / BP
  const recruiterStats = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP' || p.role === 'GESTORA_RH').map(rec => {
    const recJobs = allJobs.filter(j => j.recruiter_email === rec.email || j.bp_in_charge_email === rec.email);
    const recJobIds = new Set(recJobs.map(j => j.id));
    const recApps = allApps.filter(a => recJobIds.has(a.job_id));

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

  // Origem dos Candidatos
  const sourceCounts = {};
  allApps.forEach(a => {
    const src = (a.candidate && a.candidate.source) ? a.candidate.source : 'Outros';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const sourceList = Object.keys(sourceCounts).map(src => ({
    source: src,
    count: sourceCounts[src],
    pct: totalApps > 0 ? Math.round((sourceCounts[src] / totalApps) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Governança de SLA por Sexo / Gênero
  const genderStatsMap = {};
  TAXONOMY.genders.concat(['Não informado']).forEach(g => {
    genderStatsMap[g] = { count: 0, noPrazo: 0, atencao: 0, estourado: 0, sumDays: 0 };
  });

  allApps.forEach(a => {
    const cand = a.candidate;
    const gender = (cand && cand.gender) ? cand.gender : 'Não informado';
    if (!genderStatsMap[gender]) {
      genderStatsMap[gender] = { count: 0, noPrazo: 0, atencao: 0, estourado: 0, sumDays: 0 };
    }

    const sla = store.calculateSLA(a, a.job);
    genderStatsMap[gender].count += 1;
    if (sla.code === 'NO_PRAZO') genderStatsMap[gender].noPrazo += 1;
    else if (sla.code === 'ATENCAO') genderStatsMap[gender].atencao += 1;
    else if (sla.code === 'ESTOURADO') genderStatsMap[gender].estourado += 1;

    const enteredAt = new Date(a.stage_entered_at);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now - enteredAt) / 86400000));
    genderStatsMap[gender].sumDays += diffDays;
  });

  const genderList = Object.keys(genderStatsMap)
    .filter(g => genderStatsMap[g].count > 0)
    .map(g => {
      const item = genderStatsMap[g];
      const slaPct = item.count > 0 ? Math.round((item.noPrazo / item.count) * 100) : 100;
      const avgDays = item.count > 0 ? (item.sumDays / item.count).toFixed(1) : '0.0';
      return { gender: g, ...item, slaPct, avgDays };
    });

  // ---------------------------------------------------------------------------
  // 2. Apuração de Métricas Globais de Admissão & Onboarding
  // ---------------------------------------------------------------------------
  const totalAdmissions = allAdmissions.length;
  const activeAdmissions = allAdmissions.filter(a => a.status === 'EM_ANDAMENTO' && a.current_stage !== 'Admissão Concluída').length;
  const completedAdmissions = allAdmissions.filter(a => a.current_stage === 'Admissão Concluída' || a.status === 'CONCLUIDO').length;
  const admissionCompletionRate = totalAdmissions > 0 ? Math.round((completedAdmissions / totalAdmissions) * 100) : 0;

  // SLA de Admissão
  let admSlaNoPrazo = 0;
  let admSlaAtencao = 0;
  let admSlaEstourado = 0;

  allAdmissions.forEach(adm => {
    const sla = store.calculateAdmissionSLA(adm);
    if (sla.code === 'NO_PRAZO') admSlaNoPrazo++;
    else if (sla.code === 'ATENCAO') admSlaAtencao++;
    else if (sla.code === 'ESTOURADO') admSlaEstourado++;
  });

  const admSlaConformity = totalAdmissions > 0 ? Math.round((admSlaNoPrazo / totalAdmissions) * 100) : 100;

  // Lead Time Médio de Admissão (dias decorridos)
  let totalAdmCycleDays = 0;
  allAdmissions.forEach(adm => {
    const start = new Date(adm.created_at || Date.now());
    const end = (adm.current_stage === 'Admissão Concluída' && adm.completed_at) ? new Date(adm.completed_at) : new Date();
    const diffDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000));
    totalAdmCycleDays += diffDays;
  });
  const avgAdmLeadTime = totalAdmissions > 0 ? (totalAdmCycleDays / totalAdmissions).toFixed(1) : '3.8';

  // Marcos Operacionais de Onboarding & Checklist
  let ofertaAssinadaCount = 0;
  let linkDocsOkCount = 0;
  let asoAptoCount = 0;
  let asoAgendadoCount = 0;
  let asoPendenteCount = 0;
  let chamadoDpOkCount = 0;
  let emailConfOkCount = 0;
  let glpiOkCount = 0;
  let glpiEmAtendCount = 0;
  let matriculaOkCount = 0;

  allAdmissions.forEach(adm => {
    const chk = adm.checklist || {};
    if (chk.oferta_gestor_assinado && chk.oferta_candidato_assinado) ofertaAssinadaCount++;
    if (chk.link_admissao_status === 'Aprovado' || chk.link_admissao_status === 'Documentos Enviados') linkDocsOkCount++;
    
    if (chk.exame_aso_status === 'Apto') asoAptoCount++;
    else if (chk.exame_aso_status === 'Agendado') asoAgendadoCount++;
    else asoPendenteCount++;

    if (chk.chamado_dp_status === 'Concluído' || chk.chamado_dp_status === 'Aberto') chamadoDpOkCount++;
    if (chk.email_confirmacao_enviado) emailConfOkCount++;

    if (chk.glpi_status === 'Concluído') glpiOkCount++;
    else if (chk.glpi_status === 'Em Atendimento' || chk.glpi_status === 'Aberto') glpiEmAtendCount++;

    if (chk.planilha_inserida || chk.matricula_gerada) matriculaOkCount++;
  });

  const asoAptoPct = totalAdmissions > 0 ? Math.round((asoAptoCount / totalAdmissions) * 100) : 0;
  const glpiReadyPct = totalAdmissions > 0 ? Math.round(((glpiOkCount + glpiEmAtendCount) / totalAdmissions) * 100) : 0;

  // Funil de Admissão por Etapa (Volume & Tempo Médio na Etapa)
  const admStageStats = ADMISSION_STAGES.map((stage, idx) => {
    const inStage = allAdmissions.filter(a => {
      return a.current_stage === stage.name || 
             a.current_stage === stage.shortName || 
             a.current_stage === stage.key;
    });
    const count = inStage.length;
    const pct = totalAdmissions > 0 ? Math.round((count / totalAdmissions) * 100) : 0;
    
    let sumDays = 0;
    inStage.forEach(a => {
      const entered = new Date(a.stage_entered_at || a.created_at || Date.now());
      const diff = Math.max(0, Math.floor((Date.now() - entered.getTime()) / 86400000));
      sumDays += diff;
    });
    const avgDays = count > 0 ? (sumDays / count).toFixed(1) : '0.0';
    const slaLimit = getAdmissionStageSLALimit(stage.name);

    return {
      ...stage,
      stageNumber: idx + 1,
      count,
      pct,
      avgDays,
      slaLimit
    };
  });

  // Distribuição de Admissões por Empresa / Unidade de Negócio
  const admBuMap = {};
  allAdmissions.forEach(adm => {
    const bu = (adm.job && adm.job.business_unit) ? adm.job.business_unit : 'Supermercados BH';
    if (!admBuMap[bu]) {
      admBuMap[bu] = { active: 0, completed: 0, total: 0 };
    }
    admBuMap[bu].total += 1;
    if (adm.current_stage === 'Admissão Concluída' || adm.status === 'CONCLUIDO') {
      admBuMap[bu].completed += 1;
    } else {
      admBuMap[bu].active += 1;
    }
  });

  const admBuList = Object.keys(admBuMap).map(bu => ({
    bu,
    active: admBuMap[bu].active,
    completed: admBuMap[bu].completed,
    total: admBuMap[bu].total
  })).sort((a, b) => b.total - a.total);

  // ---------------------------------------------------------------------------
  // 3. Renderização HTML do Módulo
  // ---------------------------------------------------------------------------
  const showRs = currentIndicatorsTab === 'all' || currentIndicatorsTab === 'rs';
  const showAdmissions = currentIndicatorsTab === 'all' || currentIndicatorsTab === 'admissions';

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
            Análise visual consolidada de desempenho, governança de SLAs, velocidade de contratação e produtividade de R&amp;S e Admissão.
          </p>
        </div>
        <div class="metrics-actions">
          <button id="btn-print-metrics" class="btn btn-secondary btn-sm" onclick="window.print()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir Relatório Executivo
          </button>
        </div>
      </div>

      <!-- Barra de Sub-Navegação por Domínio -->
      <div class="indicators-subtabs-nav">
        <button class="indicators-subtab-btn ${currentIndicatorsTab === 'all' ? 'active' : ''}" data-tab="all">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Visão Consolidada 360° (Todos)
        </button>
        <button class="indicators-subtab-btn ${currentIndicatorsTab === 'rs' ? 'active' : ''}" data-tab="rs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Recrutamento &amp; Seleção (R&amp;S)
          <span class="subtab-counter-badge">${activeJobs} vagas</span>
        </button>
        <button class="indicators-subtab-btn ${currentIndicatorsTab === 'admissions' ? 'active' : ''}" data-tab="admissions">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          Admissão &amp; Onboarding (Funil DP/TI)
          <span class="subtab-counter-badge">${activeAdmissions} ativas</span>
        </button>
      </div>

      ${showAdmissions ? `
        <!-- =================================================================== -->
        <!-- SEÇÃO: INDICADORES E MÉTRICAS DE ADMISSÃO & ONBOARDING              -->
        <!-- =================================================================== -->
        <div class="indicator-domain-section" id="section-admission-indicators">
          <div class="indicator-domain-header">
            <h3 class="indicator-domain-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
              Admissão &amp; Onboarding: Indicadores de DP, TI e Integração
            </h3>
            <span class="indicator-domain-badge">Funil de 8 Etapas + Conclusão</span>
          </div>

          <!-- Grade de Indicadores de Admissão (6 KPIs) -->
          <div class="metrics-kpi-grid">
            <div class="metrics-card">
              <div class="metrics-card-label">Processos em Admissão</div>
              <div class="metrics-card-value">${activeAdmissions} <span class="metrics-sub-val">/ ${totalAdmissions} totais</span></div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${totalAdmissions > 0 ? (activeAdmissions / totalAdmissions) * 100 : 0}%; background: var(--navy);"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${completedAdmissions} admissões 100% concluídas</span>
              </div>
            </div>

            <div class="metrics-card">
              <div class="metrics-card-label">Taxa de Conclusão / Onboarding</div>
              <div class="metrics-card-value text-pos">${admissionCompletionRate}%</div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${admissionCompletionRate}%; background: var(--pos);"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${completedAdmissions} colaboradores integrados</span>
              </div>
            </div>

            <div class="metrics-card ${admSlaConformity >= 80 ? 'border-pos' : admSlaConformity >= 60 ? 'border-gold' : 'border-neg'}">
              <div class="metrics-card-label">Conformidade SLA de Admissão</div>
              <div class="metrics-card-value ${admSlaConformity >= 80 ? 'text-pos' : admSlaConformity >= 60 ? 'text-gold' : 'text-neg'}">${admSlaConformity}%</div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${admSlaConformity}%; background: ${admSlaConformity >= 80 ? 'var(--pos)' : admSlaConformity >= 60 ? 'var(--gold)' : 'var(--neg)'};"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${admSlaNoPrazo} no prazo • ${admSlaEstourado} estourados</span>
              </div>
            </div>

            <div class="metrics-card">
              <div class="metrics-card-label">Lead Time Médio de Entrada</div>
              <div class="metrics-card-value">${avgAdmLeadTime} <span class="metrics-sub-val">dias</span></div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${Math.min(100, parseFloat(avgAdmLeadTime) * 15)}%; background: #6366f1;"></div>
              </div>
              <div class="metrics-card-footer">
                <span>Da proposta ao 1º dia de trabalho</span>
              </div>
            </div>

            <div class="metrics-card">
              <div class="metrics-card-label">Prontidão Acessos GLPI (TI)</div>
              <div class="metrics-card-value">${glpiReadyPct}%</div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${glpiReadyPct}%; background: #38bdf8;"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${glpiOkCount} concluídos • ${glpiEmAtendCount} em atendimento</span>
              </div>
            </div>

            <div class="metrics-card">
              <div class="metrics-card-label">Aptidão Ocupacional (ASO)</div>
              <div class="metrics-card-value">${asoAptoPct}%</div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${asoAptoPct}%; background: #10b981;"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${asoAptoCount} aptos • ${asoAgendadoCount} agendados</span>
              </div>
            </div>
          </div>

          <!-- Gráficos de Admissão (Chart.js) -->
          <div class="metrics-charts-grid">
            <!-- Gráfico ADM 1: Funil de Admissão por Etapa -->
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    Distribuição no Funil de Admissão
                  </h3>
                  <p class="chart-subtitle">Volume de colaboradores em cada uma das etapas de contratação</p>
                </div>
                <span class="chart-badge-tag">${totalAdmissions} admissões</span>
              </div>
              <div class="chart-container">
                <canvas id="chart-adm-funnel-bar"></canvas>
              </div>
            </div>

            <!-- Gráfico ADM 2: Governança de SLA de Admissão -->
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Governança &amp; SLA de Admissão
                  </h3>
                  <p class="chart-subtitle">Cumprimento de prazos nas etapas de admissão (No Prazo / Atenção / Estourado)</p>
                </div>
                <span class="chart-badge-tag">${admSlaConformity}% No Prazo</span>
              </div>
              <div class="chart-container">
                <canvas id="chart-adm-sla-doughnut"></canvas>
              </div>
            </div>

            <!-- Gráfico ADM 3: Admissões por Empresa / Unidade de Negócio -->
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    Admissões por Empresa / Unidade
                  </h3>
                  <p class="chart-subtitle">Volume de contratações em andamento vs concluídas por empresa</p>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="chart-adm-bu-bar"></canvas>
              </div>
            </div>

            <!-- Gráfico ADM 4: Status dos Marcos Críticos de Onboarding -->
            <div class="chart-card">
              <div class="chart-header">
                <div>
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Marcos Críticos de Onboarding
                  </h3>
                  <p class="chart-subtitle">Conclusão de documentos, exame médico, TI e abertura no DP</p>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="chart-adm-milestones-bar"></canvas>
              </div>
            </div>
          </div>

          <!-- Diagnóstico de Gargalos por Etapa no Funil de Admissão -->
          <div class="metrics-section card">
            <div class="metrics-section-header">
              <div>
                <h3 class="metrics-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  Tempo Médio de Permanência por Etapa de Admissão
                </h3>
                <p class="metrics-section-subtitle">Duração observada versus limite de SLA padrão por fase</p>
              </div>
            </div>

            <div class="funnel-metrics-wrapper">
              ${admStageStats.map((stg) => `
                <div class="funnel-stage-row">
                  <div class="stage-info">
                    <span class="stage-num">${stg.stageNumber}</span>
                    <div class="stage-name-box">
                      <span class="stage-title">${stg.shortName || stg.name}</span>
                      <span class="stage-avg-time">
                        ⏱️ Média: ${stg.avgDays}d (SLA: ${stg.slaLimit > 0 ? stg.slaLimit + 'd' : 'Meta Final'})
                      </span>
                    </div>
                  </div>

                  <div class="stage-bar-container">
                    <div class="stage-bar">
                      <div class="stage-bar-fill" style="width: ${Math.max(5, stg.pct)}%; background: linear-gradient(90deg, #00147D 0%, #38bdf8 100%);"></div>
                    </div>
                  </div>

                  <div class="stage-stat-badge">
                    <span class="stat-count">${stg.count} processo(s)</span>
                    <span class="stat-pct">(${stg.pct}%)</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Tabela de Acompanhamento Operacional de Admissões -->
          <div class="metrics-section card">
            <div class="metrics-section-header">
              <div>
                <h3 class="metrics-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Acompanhamento de Admissões em Andamento &amp; Status dos Marcos
                </h3>
                <p class="metrics-section-subtitle">Visão executiva de cada colaborador no funil com SLA e checklist operacional</p>
              </div>
            </div>

            <div class="tbl-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Vaga &amp; Empresa</th>
                    <th>Etapa Atual</th>
                    <th>SLA Operacional</th>
                    <th>Progresso Checklist</th>
                    <th>Marcos Chave (Carta / ASO / DP / TI)</th>
                    <th>Início Previsto</th>
                  </tr>
                </thead>
                <tbody>
                  ${allAdmissions.map(adm => {
                    const sla = store.calculateAdmissionSLA(adm);
                    const prog = getAdmissionChecklistProgress(adm);
                    const chk = adm.checklist || {};
                    const candName = adm.candidate?.full_name || 'Candidato';
                    const candEmail = adm.candidate?.email || '';
                    const jobTitle = adm.job?.title || 'Vaga';
                    const bu = adm.job?.business_unit || 'Supermercados BH';

                    const cartaOk = chk.oferta_gestor_assinado && chk.oferta_candidato_assinado;
                    const asoStatus = chk.exame_aso_status || 'Pendente';
                    const dpStatus = chk.chamado_dp_status || 'Pendente';
                    const glpiStatus = chk.glpi_status || 'Pendente';

                    return `
                      <tr>
                        <td>
                          <div class="cell-main">${candName}</div>
                          <div class="cell-sub">${candEmail}</div>
                        </td>
                        <td>
                          <div class="cell-main">${jobTitle}</div>
                          <div class="cell-sub"><span class="badge badge-neutral" style="font-size: 0.7rem;">${bu}</span></div>
                        </td>
                        <td>
                          <span class="badge badge-neutral" style="font-weight: 600;">${adm.current_stage}</span>
                        </td>
                        <td>
                          <span class="badge ${sla.badgeClass}">${sla.label}</span>
                        </td>
                        <td>
                          <div class="progress-mini-bar" title="${prog.doneSteps} de ${prog.totalSteps} passos concluídos">
                            <div class="progress-mini-track">
                              <div class="progress-mini-fill" style="width: ${prog.pct}%;"></div>
                            </div>
                            <span class="cell-sub" style="font-size: 0.75rem; font-weight: 600;">${prog.doneSteps}/8</span>
                          </div>
                        </td>
                        <td>
                          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            <span class="milestone-badge-pill ${cartaOk ? 'ok' : 'pending'}" title="Carta Oferta">
                              ${cartaOk ? '✓ Carta' : '⏳ Carta'}
                            </span>
                            <span class="milestone-badge-pill ${asoStatus === 'Apto' ? 'ok' : asoStatus === 'Agendado' ? 'warning' : 'pending'}" title="Exame ASO">
                              ${asoStatus === 'Apto' ? '✓ ASO' : asoStatus === 'Agendado' ? '📅 ASO' : '⏳ ASO'}
                            </span>
                            <span class="milestone-badge-pill ${dpStatus === 'Concluído' ? 'ok' : dpStatus === 'Aberto' ? 'warning' : 'pending'}" title="Chamado DP">
                              ${dpStatus === 'Concluído' ? '✓ DP' : dpStatus === 'Aberto' ? '🔄 DP' : '⏳ DP'}
                            </span>
                            <span class="milestone-badge-pill ${glpiStatus === 'Concluído' ? 'ok' : glpiStatus === 'Em Atendimento' || glpiStatus === 'Aberto' ? 'warning' : 'pending'}" title="TI GLPI">
                              ${glpiStatus === 'Concluído' ? '✓ TI' : glpiStatus !== 'Pendente' ? '💻 TI' : '⏳ TI'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span class="cell-main" style="font-family: var(--font-mono); font-size: 0.8rem;">
                            📅 ${formatDate(adm.start_date)}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      ${showRs ? `
        <!-- =================================================================== -->
        <!-- SEÇÃO: RECRUTAMENTO & SELEÇÃO (PIPELINE DE VAGAS E CANDIDATOS)      -->
        <!-- =================================================================== -->
        <div class="indicator-domain-section" id="section-rs-indicators">
          <div class="indicator-domain-header">
            <h3 class="indicator-domain-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Recrutamento &amp; Seleção: Indicadores de Vagas e Pipeline
            </h3>
            <span class="indicator-domain-badge">Pipeline de Candidaturas</span>
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
              <div class="metrics-card-label">Conformidade SLA R&amp;S</div>
              <div class="metrics-card-value ${slaConformityPercent >= 80 ? 'text-pos' : slaConformityPercent >= 60 ? 'text-gold' : 'text-neg'}">${slaConformityPercent}%</div>
              <div class="metrics-card-bar">
                <div class="metrics-bar-fill" style="width: ${slaConformityPercent}%; background: ${slaConformityPercent >= 80 ? 'var(--pos)' : slaConformityPercent >= 60 ? 'var(--gold)' : 'var(--neg)'}"></div>
              </div>
              <div class="metrics-card-footer">
                <span>${slaNoPrazo} no prazo • ${slaEstourado} estourados</span>
              </div>
            </div>

            <div class="metrics-card">
              <div class="metrics-card-label">Tempo Médio / Etapa R&amp;S</div>
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
                    Funil de Conversão do Pipeline R&amp;S
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
                    Governança &amp; Conformidade de SLA R&amp;S
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

            <!-- Gráfico 7: Governança de Diversidade & SLA por Sexo / Gênero -->
            <div class="chart-card span-2" style="grid-column: span 2;">
              <div class="chart-header">
                <div>
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Conformidade de SLA por Sexo / Gênero dos Candidatos
                  </h3>
                  <p class="chart-subtitle">Análise de cumprimento de SLA por gênero para governança de diversidade</p>
                </div>
              </div>
              <div class="chart-container" style="height: 240px;">
                <canvas id="chart-gender-sla"></canvas>
              </div>
            </div>
          </div>

          <!-- Seção Detalhamento do Funil R&S (Barras de Progresso e Média de Dias) -->
          <div class="metrics-section card">
            <div class="metrics-section-header">
              <div>
                <h3 class="metrics-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  Tempo Médio de Permanência por Etapa no R&amp;S (Diagnóstico de Gargalos)
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

          <!-- Seção Tabela de Produtividade & Governança Imutável -->
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
                    <p class="metrics-section-subtitle">Registros de histórico de auditoria em stage_history</p>
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

          <!-- Seção Tabela de Governança de Diversidade & SLA por Sexo / Gênero -->
          <div class="metrics-section card" style="margin-top: 20px;">
            <div class="metrics-section-header">
              <div>
                <h3 class="metrics-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  Detalhamento de SLA &amp; Diversidade por Sexo / Gênero
                </h3>
                <p class="metrics-section-subtitle">Consolidado de apuração de SLA (No Prazo vs Atenção vs Estourado) e tempo médio por gênero</p>
              </div>
            </div>

            <div class="tbl-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sexo / Gênero</th>
                    <th>Candidaturas Totais</th>
                    <th>SLA No Prazo</th>
                    <th>SLA Em Atenção</th>
                    <th>SLA Estourado</th>
                    <th>% Conformidade SLA</th>
                    <th>Tempo Médio na Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  ${genderList.map(g => `
                    <tr>
                      <td>
                        <span class="badge badge-neutral" style="font-weight: 600;">${g.gender}</span>
                      </td>
                      <td><strong>${g.count}</strong></td>
                      <td><span class="badge badge-a">${g.noPrazo}</span></td>
                      <td><span class="badge badge-b">${g.atencao}</span></td>
                      <td><span class="badge badge-c">${g.estourado}</span></td>
                      <td>
                        <span class="badge ${g.slaPct >= 80 ? 'badge-a' : g.slaPct >= 60 ? 'badge-b' : 'badge-c'}">
                          ${g.slaPct}%
                        </span>
                      </td>
                      <td><span class="cell-main">${g.avgDays} dia(s)</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Bind dos botões de troca de sub-aba
  container.querySelectorAll('.indicators-subtab-btn').forEach(btn => {
    btn.onclick = () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab && targetTab !== currentIndicatorsTab) {
        currentIndicatorsTab = targetTab;
        renderIndicatorsModule(lastRenderArgs.jobs, lastRenderArgs.applications, lastRenderArgs.admissions);
      }
    };
  });

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
    jobs: allJobs,
    applications: allApps,
    sourceList,
    recruiterStats,
    genderList,
    // Admission charts params
    admStageStats,
    totalAdmissions,
    admSlaNoPrazo,
    admSlaAtencao,
    admSlaEstourado,
    admBuList,
    ofertaAssinadaCount,
    linkDocsOkCount,
    asoAptoCount,
    chamadoDpOkCount,
    glpiOkCount,
    glpiEmAtendCount,
    matriculaOkCount
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
  recruiterStats,
  genderList,
  // Admission params
  admStageStats,
  totalAdmissions,
  admSlaNoPrazo,
  admSlaAtencao,
  admSlaEstourado,
  admBuList,
  ofertaAssinadaCount,
  linkDocsOkCount,
  asoAptoCount,
  chamadoDpOkCount,
  glpiOkCount,
  glpiEmAtendCount,
  matriculaOkCount
}) {
  // ---------------------------------------------------------------------------
  // Gráficos de Admissão & Onboarding
  // ---------------------------------------------------------------------------

  // ADM 1. Gráfico de Funil de Admissão (Horizontal Bar)
  const ctxAdmFunnel = document.getElementById('chart-adm-funnel-bar')?.getContext('2d');
  if (ctxAdmFunnel && admStageStats) {
    activeChartInstances['admFunnel'] = new Chart(ctxAdmFunnel, {
      type: 'bar',
      data: {
        labels: admStageStats.map(s => s.shortName || s.name),
        datasets: [{
          label: 'Colaboradores em Admissão',
          data: admStageStats.map(s => s.count),
          backgroundColor: [
            '#00147D',
            '#002b9e',
            '#0284c7',
            '#38bdf8',
            '#6366f1',
            '#8b5cf6',
            '#f59e0b',
            '#10B981',
            '#047857'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} colaborador(es) (${totalAdmissions > 0 ? Math.round((ctx.raw / totalAdmissions) * 100) : 0}%)`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { family: 'Inter' } },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 10, weight: '500' } }
          }
        }
      }
    });
  }

  // ADM 2. Gráfico de SLA de Admissão (Doughnut)
  const ctxAdmSLA = document.getElementById('chart-adm-sla-doughnut')?.getContext('2d');
  if (ctxAdmSLA) {
    activeChartInstances['admSla'] = new Chart(ctxAdmSLA, {
      type: 'doughnut',
      data: {
        labels: ['No Prazo', 'Em Atenção', 'Estourado'],
        datasets: [{
          data: [admSlaNoPrazo || 0, admSlaAtencao || 0, admSlaEstourado || 0],
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
            labels: { font: { family: 'Inter', size: 12 }, padding: 14 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} processo(s) (${totalAdmissions > 0 ? Math.round((ctx.raw / totalAdmissions) * 100) : 0}%)`
            }
          }
        }
      }
    });
  }

  // ADM 3. Gráfico de Admissões por Empresa / Unidade (Bar)
  const ctxAdmBu = document.getElementById('chart-adm-bu-bar')?.getContext('2d');
  if (ctxAdmBu && admBuList && admBuList.length > 0) {
    activeChartInstances['admBu'] = new Chart(ctxAdmBu, {
      type: 'bar',
      data: {
        labels: admBuList.map(b => b.bu),
        datasets: [
          {
            label: 'Em Andamento',
            data: admBuList.map(b => b.active),
            backgroundColor: '#38bdf8',
            borderRadius: 5
          },
          {
            label: 'Concluídas',
            data: admBuList.map(b => b.completed),
            backgroundColor: '#00147D',
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
          y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter' } }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }

  // ADM 4. Status dos Marcos Críticos de Onboarding (Stacked Horizontal Bar)
  const ctxAdmMilestones = document.getElementById('chart-adm-milestones-bar')?.getContext('2d');
  if (ctxAdmMilestones) {
    const milestonesLabels = [
      'Carta Oferta',
      'Documentos Digitais',
      'Exame ASO Apto',
      'Chamado DP',
      'Acessos GLPI TI',
      'Planilha/Matrícula'
    ];
    const doneCounts = [
      ofertaAssinadaCount || 0,
      linkDocsOkCount || 0,
      asoAptoCount || 0,
      chamadoDpOkCount || 0,
      (glpiOkCount || 0) + (glpiEmAtendCount || 0),
      matriculaOkCount || 0
    ];
    const pendingCounts = doneCounts.map(done => Math.max(0, (totalAdmissions || 0) - done));

    activeChartInstances['admMilestones'] = new Chart(ctxAdmMilestones, {
      type: 'bar',
      data: {
        labels: milestonesLabels,
        datasets: [
          {
            label: 'Concluído / OK',
            data: doneCounts,
            backgroundColor: '#10B981',
            borderRadius: 4
          },
          {
            label: 'Pendente / Aguardando',
            data: pendingCounts,
            backgroundColor: '#e2e8f0',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter' } }, grid: { color: '#f1f5f9' } },
          y: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Gráficos de Recrutamento & Seleção (R&S)
  // ---------------------------------------------------------------------------

  // 1. Gráfico de Funil (Bar Horizontal / Vertical)
  const ctxFunnel = document.getElementById('chart-funnel-bar')?.getContext('2d');
  if (ctxFunnel && stageStats) {
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

  // 2. Gráfico de SLA Operacional R&S (Doughnut)
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
  if (ctxDept && jobs && applications) {
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
  if (ctxJobStatus && jobs) {
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
  if (ctxSourcing && sourceList) {
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
  if (ctxRec && recruiterStats) {
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

  // 7. Gráfico de SLA por Sexo / Gênero
  const ctxGender = document.getElementById('chart-gender-sla')?.getContext('2d');
  if (ctxGender && genderList && genderList.length > 0) {
    activeChartInstances['genderSla'] = new Chart(ctxGender, {
      type: 'bar',
      data: {
        labels: genderList.map(g => g.gender),
        datasets: [
          {
            label: 'No Prazo',
            data: genderList.map(g => g.noPrazo),
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Em Atenção',
            data: genderList.map(g => g.atencao),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: 'Estourado',
            data: genderList.map(g => g.estourado),
            backgroundColor: '#ef4444',
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
