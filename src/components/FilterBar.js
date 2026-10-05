// =============================================================================
// ATS PLURIX 360° | Componente Área de Filtros e Tabs
// =============================================================================

import { TAXONOMY, PERSONAS } from '../db/schema.js';
import { authService } from '../services/authService.js';

export function renderFilterBar(filters, currentView, onFilterChange, onViewChange, onOpenNewJobModal, onOpenNewCandidateModal, onExportCandidates, onExportJobs, onExportAll, onExportAdmissions) {
  const deptSelect = document.getElementById('filter-department');
  const recSelect = document.getElementById('filter-recruiter');
  const searchInput = document.getElementById('filter-search');
  const slaSelect = document.getElementById('filter-sla');
  const confSelect = document.getElementById('filter-confidential');
  const btnNewJob = document.getElementById('btn-new-job');
  const btnNewCand = document.getElementById('btn-new-candidate');

  // Export elements
  const btnExportMenu = document.getElementById('btn-export-menu');
  const exportDropdownMenu = document.getElementById('export-dropdown-menu');
  const btnExportCand = document.getElementById('btn-export-candidates');
  const btnExportJobs = document.getElementById('btn-export-jobs');
  const btnExportAdm = document.getElementById('btn-export-admissions');
  const btnExportAll = document.getElementById('btn-export-all');

  // Populate department options
  if (deptSelect && deptSelect.children.length <= 1) {
    deptSelect.innerHTML = '<option value="">Todas as Diretorias</option>' +
      TAXONOMY.departments.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  // Populate recruiter options
  if (recSelect && recSelect.children.length <= 1) {
    const recruiters = PERSONAS.filter(p => p.role === 'RECRUTADOR' || p.role === 'BP' || p.role === 'GESTORA_RH');
    recSelect.innerHTML = '<option value="">Todas as Recrutadoras</option>' +
      recruiters.map(r => `<option value="${r.email}">${r.name}</option>`).join('');
  }

  // Bind filter events
  searchInput.value = filters.search || '';
  deptSelect.value = filters.department || '';
  recSelect.value = filters.recruiter || '';
  slaSelect.value = filters.sla || '';
  confSelect.value = filters.confidential || '';

  const triggerChange = () => {
    onFilterChange({
      search: searchInput.value,
      department: deptSelect.value,
      recruiter: recSelect.value,
      sla: slaSelect.value,
      confidential: confSelect.value
    });
  };

  searchInput.oninput = triggerChange;
  deptSelect.onchange = triggerChange;
  recSelect.onchange = triggerChange;
  slaSelect.onchange = triggerChange;
  confSelect.onchange = triggerChange;

  // View tabs and Module Titles
  const tabBtns = document.querySelectorAll('.tab-btn');
  const moduleTitleEl = document.getElementById('active-module-title');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  const viewTitles = {
    'dashboard': 'Painel Executivo',
    'jobs-kanban': 'Funil de Vagas',
    'kanban': 'Funil do Candidato',
    'admission-kanban': 'Funil de Admissão',
    'talent-bank': 'Banco de Talentos',
    'indicators': 'Indicadores & Métricas'
  };

  const viewSubtitles = {
    'dashboard': 'Acompanhamento estratégico de vagas, pipeline de candidatos, SLAs e governança de R&S.',
    'jobs-kanban': 'Acompanhamento do ciclo de vida das vagas abertas por etapas de recrutamento.',
    'kanban': 'Movimentação e triagem de candidatos em etapas seletivas para a vaga selecionada.',
    'admission-kanban': 'Acompanhamento das 8 etapas oficiais do processo admissional, exames, links, chamados e onboarding.',
    'talent-bank': 'Base unificada de talentos para busca, prospecção e reaproveitamento em novas vagas.',
    'indicators': 'Métricas avançadas de SLA, tempo médio de fechamento e taxas de conversão do funil.'
  };

  const moduleSubtitleEl = document.getElementById('active-module-subtitle');

  // Toggle visibility of global KPI section and controls section for views without global header
  const kpiSection = document.querySelector('.kpi-section');
  const controlsSection = document.querySelector('.controls-section');
  const viewsWithoutGlobalHeader = ['dashboard', 'talent-bank', 'indicators'];
  const hideHeader = viewsWithoutGlobalHeader.includes(currentView);

  if (kpiSection) kpiSection.style.display = hideHeader ? 'none' : 'block';
  if (controlsSection) controlsSection.style.display = hideHeader ? 'none' : 'block';

  // Sync active tab state & panel visibility with currentView
  tabBtns.forEach(btn => {
    const isCurrent = btn.dataset.view === currentView;
    btn.classList.toggle('active', isCurrent);
    btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
  });

  if (moduleTitleEl && viewTitles[currentView]) {
    moduleTitleEl.textContent = viewTitles[currentView];
  }
  if (moduleSubtitleEl && viewSubtitles[currentView]) {
    moduleSubtitleEl.textContent = viewSubtitles[currentView];
  }

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${currentView}`);
  });

  tabBtns.forEach(btn => {
    btn.onclick = () => {
      const viewName = btn.dataset.view;

      tabBtns.forEach(b => {
        const isActive = b.dataset.view === viewName;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      if (moduleTitleEl && viewTitles[viewName]) {
        moduleTitleEl.textContent = viewTitles[viewName];
      }
      if (moduleSubtitleEl && viewSubtitles[viewName]) {
        moduleSubtitleEl.textContent = viewSubtitles[viewName];
      }
      
      document.querySelectorAll('.view-panel').forEach(p => {
        p.classList.toggle('active', p.id === `view-${viewName}`);
      });

      // Close mobile sidebar on selection
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('open');
      }

      onViewChange(viewName);
    };
  });

  // O menu lateral é permanentemente fixo
  if (sidebar) {
    sidebar.classList.remove('collapsed');
  }
  if (sidebarOverlay && sidebar) {
    sidebarOverlay.onclick = () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
      window.dispatchEvent(new Event('resize'));
    };
  }

  // Export dropdown handlers
  if (btnExportMenu && exportDropdownMenu) {
    btnExportMenu.onclick = (e) => {
      e.stopPropagation();
      const isVisible = exportDropdownMenu.style.display === 'block';
      exportDropdownMenu.style.display = isVisible ? 'none' : 'block';
      btnExportMenu.setAttribute('aria-expanded', !isVisible);
    };

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!btnExportMenu.contains(e.target) && !exportDropdownMenu.contains(e.target)) {
        exportDropdownMenu.style.display = 'none';
        btnExportMenu.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (btnExportCand) {
    btnExportCand.onclick = () => {
      if (exportDropdownMenu) exportDropdownMenu.style.display = 'none';
      if (onExportCandidates) onExportCandidates();
    };
  }

  if (btnExportJobs) {
    btnExportJobs.onclick = () => {
      if (exportDropdownMenu) exportDropdownMenu.style.display = 'none';
      if (onExportJobs) onExportJobs();
    };
  }

  if (btnExportAdm) {
    btnExportAdm.onclick = () => {
      if (exportDropdownMenu) exportDropdownMenu.style.display = 'none';
      if (onExportAdmissions) onExportAdmissions();
    };
  }

  if (btnExportAll) {
    btnExportAll.onclick = () => {
      if (exportDropdownMenu) exportDropdownMenu.style.display = 'none';
      if (onExportAll) onExportAll();
    };
  }

  // CA-01 & RN-04: Button visibility based on current view & RBAC persona
  const isJobView = currentView === 'jobs-kanban';
  const isCandidateView = currentView === 'kanban';

  if (btnNewJob) {
    const canCreate = authService.canCreateJob();
    btnNewJob.disabled = !canCreate;
    btnNewJob.title = canCreate 
      ? 'Abre o formulário de requisição de nova vaga' 
      : 'Apenas Business Partners e Gestora de RH possuem permissão para abrir vagas (RN-04)';
    btnNewJob.style.display = isJobView ? 'inline-flex' : 'none';
    btnNewJob.onclick = () => {
      if (canCreate) onOpenNewJobModal();
    };
  }

  if (btnNewCand) {
    btnNewCand.style.display = isCandidateView ? 'inline-flex' : 'none';
    btnNewCand.onclick = () => onOpenNewCandidateModal();
  }
}
