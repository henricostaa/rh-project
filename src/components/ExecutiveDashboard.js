// =============================================================================
// ATS PLURIX 360° | Componente Painel Executivo (Home Screen)
// =============================================================================

import { store } from '../db/store.js';
import { authService } from '../services/authService.js';
import { setIndicatorsSubtab } from './IndicatorsModule.js';

/**
 * Renderiza o Painel Executivo (Tela Inicial de Governança e Operação)
 * @param {Array} jobs - Lista de vagas visíveis
 * @param {Array} applications - Lista de candidaturas visíveis
 * @param {Array} candidates - Lista global de candidatos
 * @param {Function} onViewChange - Função de troca de aba de navegação
 * @param {Function} onOpenNewJobModal - Função para abrir modal de nova vaga
 * @param {Function} onOpenNewCandidateModal - Função para abrir modal de novo candidato
 * @param {Function} onOpenJobDetails - Função para abrir detalhes da vaga
 */
export function renderExecutiveDashboard(
  jobs = [],
  applications = [],
  candidates = [],
  onViewChange,
  onOpenNewJobModal,
  onOpenNewCandidateModal,
  onOpenJobDetails
) {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const currentUser = authService.getPersona() || { name: 'Executivo', role: 'GESTORA_RH' };

  // ---------------------------------------------------------------------------
  // 1. Métricas & Estatísticas Executivas
  // ---------------------------------------------------------------------------
  const activeJobs = jobs.filter(j => j.status !== 'CONCLUIDA' && j.status !== 'CANCELADA');
  const closedJobs = jobs.filter(j => j.status === 'CONCLUIDA');
  const criticalJobs = jobs.filter(j => j.status === 'DIVULGACAO' || j.status === 'TRIAGEM' || j.status === 'ENTREVISTAS');

  // Cálculo de SLAs das Candidaturas
  let totalSlaNoPrazo = 0;
  let totalSlaAtencao = 0;
  let totalSlaEstourado = 0;

  applications.forEach(app => {
    const job = app.job || jobs.find(j => j.id === app.job_id);
    const slaInfo = store.calculateSLA(app, job);
    if (slaInfo.code === 'ESTOURADO') totalSlaEstourado++;
    else if (slaInfo.code === 'ATENCAO') totalSlaAtencao++;
    else totalSlaNoPrazo++;
  });

  const totalAppsCount = applications.length || 1;
  const slaComplianceRate = Math.round((totalSlaNoPrazo / totalAppsCount) * 100);

  // Vagas com SLA crítico ou atenção
  const jobsNeedingAttention = activeJobs.map(j => {
    const jobApps = applications.filter(a => a.job_id === j.id);
    const estourados = jobApps.filter(a => store.calculateSLA(a, j).code === 'ESTOURADO').length;
    const atencao = jobApps.filter(a => store.calculateSLA(a, j).code === 'ATENCAO').length;
    return {
      job: j,
      appsCount: jobApps.length,
      estourados,
      atencao,
      riskLevel: estourados > 0 ? 'CRITICO' : (atencao > 0 ? 'ALERTA' : 'OK')
    };
  }).filter(item => item.riskLevel !== 'OK' || item.appsCount === 0);

  // Distribuição por Etapas do Funil
  const stageDistribution = {
    TRIAGEM: applications.filter(a => a.current_stage === 'Triagem' || a.current_stage === 'Primeiro Contato' || a.current_stage === 'Aguardando Conexão / LinkedIn' || a.stage === 'TRIAGEM').length,
    ENTREVISTA_RH: applications.filter(a => a.current_stage === 'Entrevista R&S' || a.current_stage === 'Entrevista RH' || a.current_stage === 'Aguardando Retorno' || a.stage === 'ENTREVISTA_RH').length,
    ENTREVISTA_GESTOR: applications.filter(a => a.current_stage === 'Entrevista Gestor' || a.current_stage === 'Teste' || a.current_stage === 'Aguardando Entrevista' || a.stage === 'ENTREVISTA_GESTOR').length,
    PROPOSTA: applications.filter(a => a.current_stage === 'Oferta' || a.stage === 'PROPOSTA').length,
    CONTRATADO: applications.filter(a => a.current_stage === 'Contratado' || a.status === 'Aprovado R&S' || a.stage === 'CONTRATADO').length
  };

  // Distribuição por Diretoria
  const deptMap = {};
  jobs.forEach(j => {
    const dept = j.department || 'Outros';
    if (!deptMap[dept]) deptMap[dept] = { activeJobs: 0, totalApps: 0 };
    if (j.status !== 'CONCLUIDA' && j.status !== 'CANCELADA') deptMap[dept].activeJobs++;
    const appsCount = applications.filter(a => a.job_id === j.id).length;
    deptMap[dept].totalApps += appsCount;
  });

  // Data e hora atual formatadas
  const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ---------------------------------------------------------------------------
  // 2. Renderização da Interface
  // ---------------------------------------------------------------------------
  container.innerHTML = `
    <div class="executive-dashboard">
      
      <!-- Banner de Boas-Vindas Executivo -->
      <header class="exec-hero-banner">
        <div class="exec-hero-content">
          <div class="exec-hero-badge">
            <span class="role-tag">${currentUser.role || 'GESTORA_RH'}</span>
            <span class="date-tag">${todayStr}</span>
          </div>
          <h1 class="exec-hero-title">Painel Executivo de R&S</h1>
          <p class="exec-hero-subtitle">
            Olá, <strong>${currentUser.name || 'Executivo(a)'}</strong>. Acompanhe o desempenho estratégico das vagas, funis de recrutamento e indicadores de SLA em tempo real.
          </p>
          <div class="exec-hero-stats">
            <div class="hero-stat-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <span><strong>${activeJobs.length}</strong> Vagas Ativas</span>
            </div>
            <div class="hero-stat-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span><strong>${applications.length}</strong> Candidaturas</span>
            </div>
            <div class="hero-stat-pill ${slaComplianceRate >= 80 ? 'pill-success' : 'pill-warning'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>SLA em Dia: <strong>${slaComplianceRate}%</strong></span>
            </div>
          </div>
        </div>
      </header>

      <!-- KPI Grid Executivo (Cartões de Destaque) -->
      <section class="exec-kpi-grid">
        <div class="exec-kpi-card" id="card-nav-jobs" style="cursor: pointer;" title="Clique para gerenciar vagas">
          <div class="exec-kpi-header">
            <div class="exec-kpi-icon icon-navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <span class="exec-kpi-badge badge-neutral">${jobs.length} Total</span>
          </div>
          <div class="exec-kpi-body">
            <div class="exec-kpi-value">${activeJobs.length}</div>
            <div class="exec-kpi-title">Vagas em Andamento</div>
            <div class="exec-kpi-subtext"><strong>${closedJobs.length}</strong> vagas concluídas até o momento</div>
          </div>
        </div>

        <div class="exec-kpi-card" id="card-nav-cands" style="cursor: pointer;" title="Clique para ver o Funil do Candidato">
          <div class="exec-kpi-header">
            <div class="exec-kpi-icon icon-sky">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span class="exec-kpi-badge badge-sky">${candidates.length} no Banco</span>
          </div>
          <div class="exec-kpi-body">
            <div class="exec-kpi-value">${applications.length}</div>
            <div class="exec-kpi-title">Candidaturas no Funil</div>
            <div class="exec-kpi-subtext">Em processo ativo de seleção</div>
          </div>
        </div>

        <div class="exec-kpi-card" id="card-nav-indicators" style="cursor: pointer;" title="Clique para ver indicadores completos">
          <div class="exec-kpi-header">
            <div class="exec-kpi-icon ${totalSlaEstourado > 0 ? 'icon-danger' : 'icon-success'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span class="exec-kpi-badge ${totalSlaEstourado > 0 ? 'badge-danger' : 'badge-success'}">${slaComplianceRate}% Cumprimento</span>
          </div>
          <div class="exec-kpi-body">
            <div class="exec-kpi-value" style="color: ${totalSlaEstourado > 0 ? 'var(--neg-d)' : 'var(--pos-d)'};">
              ${totalSlaEstourado}
            </div>
            <div class="exec-kpi-title">SLA Estourado</div>
            <div class="exec-kpi-subtext"><strong>${totalSlaAtencao}</strong> em atenção • <strong>${totalSlaNoPrazo}</strong> no prazo</div>
          </div>
        </div>

        <div class="exec-kpi-card">
          <div class="exec-kpi-header">
            <div class="exec-kpi-icon icon-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <span class="exec-kpi-badge badge-warning">Eficiência</span>
          </div>
          <div class="exec-kpi-body">
            <div class="exec-kpi-value">${stageDistribution.CONTRATADO}</div>
            <div class="exec-kpi-title">Contratações Realizadas</div>
            <div class="exec-kpi-subtext">Etapa final do funil concluída</div>
          </div>
        </div>
      </section>

      <!-- Layout Principal em 2 Colunas: Esquerda (Funil + Críticas) | Direita (Diretorias + Atalhos) -->
      <div class="exec-grid-2col">
        
        <!-- Coluna Esquerda -->
        <div class="exec-col-main">
          
          <!-- Seção 1: Visão Geral do Funil de Candidatos -->
          <div class="exec-section-card">
            <div class="exec-card-header">
              <div class="exec-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="6" height="14" x="4" y="5" rx="1"/><rect width="6" height="10" x="14" y="5" rx="1"/></svg>
                Visão Macro do Funil de Candidatos
              </div>
              <button class="btn-link" id="exec-goto-cand-funnel">Ver Funil Completo &rarr;</button>
            </div>
            <div class="exec-funnel-bars">
              <div class="funnel-bar-item">
                <div class="bar-info">
                  <span class="bar-label">1. Triagem</span>
                  <span class="bar-count"><strong>${stageDistribution.TRIAGEM}</strong> candidatos</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-sky" style="width: ${totalAppsCount ? Math.round((stageDistribution.TRIAGEM / totalAppsCount) * 100) : 0}%;"></div>
                </div>
              </div>

              <div class="funnel-bar-item">
                <div class="bar-info">
                  <span class="bar-label">2. Entrevista RH</span>
                  <span class="bar-count"><strong>${stageDistribution.ENTREVISTA_RH}</strong> candidatos</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-blue" style="width: ${totalAppsCount ? Math.round((stageDistribution.ENTREVISTA_RH / totalAppsCount) * 100) : 0}%;"></div>
                </div>
              </div>

              <div class="funnel-bar-item">
                <div class="bar-info">
                  <span class="bar-label">3. Entrevista Gestor</span>
                  <span class="bar-count"><strong>${stageDistribution.ENTREVISTA_GESTOR}</strong> candidatos</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-navy" style="width: ${totalAppsCount ? Math.round((stageDistribution.ENTREVISTA_GESTOR / totalAppsCount) * 100) : 0}%;"></div>
                </div>
              </div>

              <div class="funnel-bar-item">
                <div class="bar-info">
                  <span class="bar-label">4. Proposta</span>
                  <span class="bar-count"><strong>${stageDistribution.PROPOSTA}</strong> candidatos</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-gold" style="width: ${totalAppsCount ? Math.round((stageDistribution.PROPOSTA / totalAppsCount) * 100) : 0}%;"></div>
                </div>
              </div>

              <div class="funnel-bar-item">
                <div class="bar-info">
                  <span class="bar-label">5. Contratado</span>
                  <span class="bar-count"><strong>${stageDistribution.CONTRATADO}</strong> candidatos</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-success" style="width: ${totalAppsCount ? Math.round((stageDistribution.CONTRATADO / totalAppsCount) * 100) : 0}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Seção 2: Vagas que Exigem Atenção Executiva -->
          <div class="exec-section-card">
            <div class="exec-card-header">
              <div class="exec-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Vagas em Atenção Executiva (SLA &amp; Alertas)
              </div>
              <button class="btn-link" id="exec-goto-jobs-funnel">Ver Funil de Vagas &rarr;</button>
            </div>

            ${jobsNeedingAttention.length === 0 ? `
              <div class="exec-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div style="font-weight: 600; color: var(--navy); margin-top: 6px;">Todas as vagas estão dentro dos padrões normais!</div>
                <div style="font-size: 0.8rem; color: var(--muted);">Nenhum SLA estourado ou gargalo crítico no momento.</div>
              </div>
            ` : `
              <div class="exec-attention-list">
                ${jobsNeedingAttention.map(item => `
                  <div class="exec-attention-item risk-${item.riskLevel.toLowerCase()}">
                    <div class="item-left">
                      <div class="item-code">${item.job.id}</div>
                      <div class="item-details">
                        <div class="item-title">${item.job.title}</div>
                        <div class="item-meta">
                          <span>${item.job.department}</span> • 
                          <span>Recrutadora: <strong>${item.job.recruiter_name || item.job.recruiter_email || 'Não atribuída'}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div class="item-right">
                      <div class="item-stats">
                        ${item.estourados > 0 ? `<span class="badge-pill bg-danger-pill">${item.estourados} SLA Estourado</span>` : ''}
                        ${item.atencao > 0 ? `<span class="badge-pill bg-warning-pill">${item.atencao} SLA Atenção</span>` : ''}
                        ${item.appsCount === 0 ? `<span class="badge-pill bg-warning-pill">Sem Candidatos</span>` : ''}
                      </div>
                      <button class="btn btn-outline-navy btn-sm btn-inspect-job" data-job-id="${item.job.id}">
                        Detalhes
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Seção Executiva de SLA por Etapa e Vaga -->
          <div class="exec-section-card" style="margin-top: 16px;">
            <div class="exec-card-header">
              <div class="exec-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Indicadores de SLA por Etapa &amp; Vaga
              </div>
              <button class="btn-link" id="exec-goto-sla-tab" style="font-weight: 700; color: var(--navy); cursor: pointer;">Ver Painel de SLAs &rarr;</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
              <div style="background: #f8fafc; border: 1px solid var(--border-subtle); padding: 12px 14px; border-radius: var(--radius-xs);">
                <div style="font-size: 0.74rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">Monitoramento de Vagas</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${totalSlaEstourado > 0 ? 'var(--coral)' : 'var(--emerald)'}; margin-top: 3px;">
                  ${jobsNeedingAttention.length} vaga(s) em atenção
                </div>
                <div style="font-size: 0.76rem; color: var(--muted); margin-top: 4px;">
                  ${totalSlaEstourado} candidatos estourados • ${totalSlaAtencao} em atenção
                </div>
              </div>

              <div style="background: #f8fafc; border: 1px solid var(--border-subtle); padding: 12px 14px; border-radius: var(--radius-xs);">
                <div style="font-size: 0.74rem; color: var(--muted); font-weight: 700; text-transform: uppercase;">Conformidade Global</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${slaComplianceRate >= 80 ? 'var(--emerald)' : 'var(--amber)'}; margin-top: 3px;">
                  ${slaComplianceRate}% no prazo
                </div>
                <div style="font-size: 0.76rem; color: var(--muted); margin-top: 4px;">
                  Acompanhamento de funil e gargalos
                </div>
              </div>
            </div>
            <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm" id="exec-btn-explore-sla" type="button" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Explorar SLAs por Etapa e Vaga
              </button>
            </div>
          </div>

        </div>

        <!-- Coluna Direita -->
        <div class="exec-col-side">
          
          <!-- Seção 3: Distribuição de Vagas por Diretoria -->
          <div class="exec-section-card">
            <div class="exec-card-header">
              <div class="exec-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Volume por Diretoria
              </div>
            </div>
            <div class="exec-dept-list">
              ${Object.entries(deptMap).map(([dept, data]) => `
                <div class="dept-row">
                  <div class="dept-name-wrap">
                    <span class="dept-name">${dept}</span>
                    <span class="dept-counts"><strong>${data.activeJobs}</strong> vagas • <strong>${data.totalApps}</strong> cands</span>
                  </div>
                  <div class="dept-progress">
                    <div class="dept-progress-fill" style="width: ${activeJobs.length ? Math.min(100, Math.round((data.activeJobs / activeJobs.length) * 100)) : 0}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Seção 4: Atalhos Operacionais Rápidos -->
          <div class="exec-section-card">
            <div class="exec-card-header">
              <div class="exec-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Módulos de Navegação
              </div>
            </div>
            <div class="exec-shortcuts-grid">
              <button class="exec-shortcut-card" id="shortcut-cand-funnel">
                <div class="shortcut-icon icon-sky">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="6" height="14" x="4" y="5" rx="1"/><rect width="6" height="10" x="14" y="5" rx="1"/></svg>
                </div>
                <div class="shortcut-text">
                  <div class="shortcut-title">Funil do Candidato</div>
                  <div class="shortcut-desc">Movimentação drag-and-drop por etapas</div>
                </div>
              </button>

              <button class="exec-shortcut-card" id="shortcut-jobs-funnel">
                <div class="shortcut-icon icon-navy">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h6"/></svg>
                </div>
                <div class="shortcut-text">
                  <div class="shortcut-title">Funil de Vagas</div>
                  <div class="shortcut-desc">Ciclo de vida operacional das vagas</div>
                </div>
              </button>

              <button class="exec-shortcut-card" id="shortcut-talent-bank">
                <div class="shortcut-icon icon-gold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div class="shortcut-text">
                  <div class="shortcut-title">Banco de Talentos</div>
                  <div class="shortcut-desc">Busca e vinculação de candidatos</div>
                </div>
              </button>

              <button class="exec-shortcut-card" id="shortcut-indicators">
                <div class="shortcut-icon icon-success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div class="shortcut-text">
                  <div class="shortcut-title">Indicadores Completo</div>
                  <div class="shortcut-desc">Gráficos de tempo médio e conversão</div>
                </div>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  // ---------------------------------------------------------------------------
  // 3. Bind de Eventos e Ações Rápidas
  // ---------------------------------------------------------------------------
  // Cliques nos Cards de KPI
  const cardJobs = document.getElementById('card-nav-jobs');
  if (cardJobs) cardJobs.onclick = () => onViewChange('jobs-kanban');

  const cardCands = document.getElementById('card-nav-cands');
  if (cardCands) cardCands.onclick = () => onViewChange('kanban');

  const cardInds = document.getElementById('card-nav-indicators');
  if (cardInds) cardInds.onclick = () => onViewChange('indicators');

  // Links do Funil
  const linkCandFunnel = document.getElementById('exec-goto-cand-funnel');
  if (linkCandFunnel) linkCandFunnel.onclick = () => onViewChange('kanban');

  const linkJobsFunnel = document.getElementById('exec-goto-jobs-funnel');
  if (linkJobsFunnel) linkJobsFunnel.onclick = () => onViewChange('jobs-kanban');

  // Atalhos
  const scCand = document.getElementById('shortcut-cand-funnel');
  if (scCand) scCand.onclick = () => onViewChange('kanban');

  const scJobs = document.getElementById('shortcut-jobs-funnel');
  if (scJobs) scJobs.onclick = () => onViewChange('jobs-kanban');

  const scTalent = document.getElementById('shortcut-talent-bank');
  if (scTalent) scTalent.onclick = () => onViewChange('talent-bank');

  const scInds = document.getElementById('shortcut-indicators');
  if (scInds) scInds.onclick = () => onViewChange('indicators');

  // Navegação direta para os indicadores de SLA
  const openSlaTab = () => {
    setIndicatorsSubtab('sla');
    onViewChange('indicators');
  };
  const btnGotoSlaTab = document.getElementById('exec-goto-sla-tab');
  if (btnGotoSlaTab) btnGotoSlaTab.onclick = openSlaTab;
  const btnExploreSla = document.getElementById('exec-btn-explore-sla');
  if (btnExploreSla) btnExploreSla.onclick = openSlaTab;

  // Detalhes da Vaga nas vagas críticas
  container.querySelectorAll('.btn-inspect-job').forEach(btn => {
    btn.onclick = () => {
      const jobId = btn.dataset.jobId;
      if (jobId && onOpenJobDetails) {
        onOpenJobDetails(jobId);
      }
    };
  });
}
