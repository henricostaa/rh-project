// =============================================================================
// ATS PLURIX 360° | Application Entry Point & Reactive State Manager
// =============================================================================

import './styles/main.css';
import { store } from './db/store.js';
import { isSupabaseConfigured } from './db/supabaseClient.js';
import { authService } from './services/authService.js';
import { jobService } from './services/jobService.js';
import { pipelineService } from './services/pipelineService.js';


import { candidateService } from './services/candidateService.js';
import { admissionService } from './services/admissionService.js';
import { renderLoginScreen } from './components/LoginScreen.js';
import { renderTopbar } from './components/Topbar.js';
import { renderKPIGrid } from './components/KPIGrid.js';
import { renderFilterBar } from './components/FilterBar.js';
import { renderKanbanBoard } from './components/KanbanBoard.js';
import { renderJobsKanbanBoard } from './components/JobsKanbanBoard.js';
import { renderAdmissionKanbanBoard } from './components/AdmissionKanbanBoard.js';

import { renderTalentBankTable } from './components/TalentBankTable.js';
import { renderIndicatorsModule } from './components/IndicatorsModule.js';
import { renderExecutiveDashboard } from './components/ExecutiveDashboard.js';
import { openAuditDrawer } from './components/AuditDrawer.js';
import {
  initModals,
  showToast,
  openNewJobModal,
  openNewCandidateModal,
  openMoveStageModal,
  openAssignRecruiterModal,
  openMoveJobStatusModal,
  openJobDetailsModal,
  openConfirmDeleteModal,
  openAttachToJobModal,
  openDeleteChoiceModal,
  openEditCandidateModal,
  openEditJobModal,
  openTransferCandidateJobModal,
  openCandidateHistoryModal,
  openNewAdmissionModal,
  openAdmissionDetailsModal,
  openMoveAdmissionStageModal
} from './components/Modals.js';

import { exportCandidatesToExcel, exportJobsToExcel, exportAllToExcel, exportAdmissionsToExcel } from './services/exportService.js';

// Application State
const state = {
  currentView: 'dashboard',
  filters: {
    search: '',
    department: '',
    recruiter: '',
    sla: '',
    confidential: ''
  }
};

function refreshUI() {
  const loginContainer = document.getElementById('login-screen-container');
  const appLayout = document.querySelector('.app-layout');
  const rbacBar = document.getElementById('rbac-bar');

  // Check authentication status
  if (!authService.isAuthenticated()) {
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';
    if (rbacBar) rbacBar.style.display = 'none';

    renderLoginScreen(() => refreshUI());
    return;
  }

  // Logged in UI state
  if (loginContainer) loginContainer.style.display = 'none';
  if (appLayout) appLayout.style.display = 'flex';
  if (rbacBar) rbacBar.style.display = 'block';

  // 1. Render Topbar & KPI Grid
  renderTopbar(refreshUI);
  renderKPIGrid();

  // 2. Fetch Visible Data (Enforces RBAC RN-07)
  const jobs = jobService.getVisibleJobs();
  const applications = pipelineService.getVisibleApplications();
  const allCandidates = store.getCandidates();
  const admissions = admissionService.getVisibleAdmissions();

  // 3. Apply Filters
  const searchLower = state.filters.search.toLowerCase().trim();

  const filteredJobs = jobs.filter(j => {
    if (state.filters.department && j.department !== state.filters.department) return false;
    if (state.filters.recruiter && j.recruiter_email !== state.filters.recruiter) return false;
    if (state.filters.confidential === 'REGULAR' && j.is_confidential) return false;
    if (state.filters.confidential === 'CONFIDENCIAL' && !j.is_confidential) return false;
    if (searchLower) {
      const matchTitle = j.title.toLowerCase().includes(searchLower);
      const matchCode = j.id.toLowerCase().includes(searchLower);
      const matchDept = j.department.toLowerCase().includes(searchLower);
      const matchBU = j.business_unit && j.business_unit.toLowerCase().includes(searchLower);
      if (!matchTitle && !matchCode && !matchDept && !matchBU) return false;
    }
    return true;
  });

  const filteredApps = applications.filter(app => {
    const job = app.job;
    const cand = app.candidate;

    if (state.filters.department && job && job.department !== state.filters.department) return false;
    if (state.filters.recruiter && job && job.recruiter_email !== state.filters.recruiter) return false;
    if (state.filters.confidential === 'REGULAR' && job && job.is_confidential) return false;
    if (state.filters.confidential === 'CONFIDENCIAL' && job && !job.is_confidential) return false;

    if (state.filters.sla) {
      const sla = store.calculateSLA(app, job);
      if (sla.code !== state.filters.sla) return false;
    }

    if (searchLower) {
      const matchCandName = cand && cand.full_name.toLowerCase().includes(searchLower);
      const matchCandEmail = cand && cand.email.toLowerCase().includes(searchLower);
      const matchJobTitle = job && job.title.toLowerCase().includes(searchLower);
      const matchJobCode = job && job.id.toLowerCase().includes(searchLower);
      const matchBU = job && job.business_unit && job.business_unit.toLowerCase().includes(searchLower);
      if (!matchCandName && !matchCandEmail && !matchJobTitle && !matchJobCode && !matchBU) return false;
    }

    return true;
  });

  const filteredCandidates = allCandidates.filter(c => {
    if (searchLower) {
      const matchName = c.full_name.toLowerCase().includes(searchLower);
      const matchEmail = c.email.toLowerCase().includes(searchLower);
      const matchPhone = c.phone && c.phone.toLowerCase().includes(searchLower);
      const matchSource = c.source && c.source.toLowerCase().includes(searchLower);
      if (!matchName && !matchEmail && !matchPhone && !matchSource) return false;
    }
    return true;
  });

  const filteredAdmissions = admissions.filter(adm => {
    const job = adm.job;
    const cand = adm.candidate;

    if (state.filters.department && job && job.department !== state.filters.department) return false;
    if (state.filters.recruiter) {
      const matchResp = adm.responsible_email === state.filters.recruiter;
      const matchRec = job && job.recruiter_email === state.filters.recruiter;
      if (!matchResp && !matchRec) return false;
    }
    if (state.filters.confidential === 'REGULAR' && job && job.is_confidential) return false;
    if (state.filters.confidential === 'CONFIDENCIAL' && job && !job.is_confidential) return false;

    if (state.filters.sla) {
      const sla = store.calculateAdmissionSLA(adm);
      if (sla.code !== state.filters.sla) return false;
    }

    if (searchLower) {
      const matchCandName = cand && cand.full_name.toLowerCase().includes(searchLower);
      const matchCandEmail = cand && cand.email.toLowerCase().includes(searchLower);
      const matchJobTitle = job && job.title.toLowerCase().includes(searchLower);
      const matchJobCode = job && job.id.toLowerCase().includes(searchLower);
      const matchBU = job && job.business_unit && job.business_unit.toLowerCase().includes(searchLower);
      const matchStage = adm.current_stage && adm.current_stage.toLowerCase().includes(searchLower);
      const matchResp = adm.responsible_email && adm.responsible_email.toLowerCase().includes(searchLower);
      if (!matchCandName && !matchCandEmail && !matchJobTitle && !matchJobCode && !matchBU && !matchStage && !matchResp) return false;
    }

    return true;
  });

  // Delete Action Handlers
  const handleAppDelete = (appId) => {
    const app = store.getApplicationById(appId);
    if (!app) return;
    const cand = app.candidate;
    const candName = cand ? cand.full_name : 'Candidato';
    const candEmail = cand ? cand.email : '';
    const jobTitle = app.job ? `${app.job.id} - ${app.job.title}` : 'Vaga';
    
    openDeleteChoiceModal({
      candName,
      candEmail,
      jobTitle,
      onRemoveFromJob: async () => {
        await candidateService.deleteApplication(appId);
        showToast(`Candidatura de ${candName} removida da vaga (mantido no Banco de Talentos)!`, 'success');
        refreshUI();
      },
      onDeletePermanently: async () => {
        if (cand && cand.id) {
          await candidateService.deleteCandidate(cand.id, candEmail);
        } else {
          await candidateService.deleteApplication(appId);
        }
        showToast(`Candidato ${candName} excluído do Banco de Talentos e do Supabase com sucesso!`, 'success');
        refreshUI();
      }
    });
  };

  const handleTalentDelete = (candId, candEmail) => {
    const cand = store.getCandidates().find(c => c.id === candId || c.email === candEmail);
    const candName = cand ? cand.full_name : 'Candidato';

    openConfirmDeleteModal({
      title: 'Excluir do Banco de Talentos',
      message: `Tem certeza que deseja excluir permanentemente <strong>${candName}</strong> (${candEmail}) do Banco de Talentos?`,
      details: 'Esta ação excluirá o candidato da tabela de candidatos no Supabase e de todas as candidaturas vinculadas.',
      onConfirm: async () => {
        await candidateService.deleteCandidate(candId, candEmail);
        showToast(`Candidato ${candName} excluído do Banco de Talentos!`, 'success');
        refreshUI();
      }
    });
  };

  const handleJobDelete = (jobId) => {
    const job = store.getJobById(jobId);
    if (!job) return;
    const appsCount = store.getApplications().filter(a => a.job_id === jobId).length;

    openConfirmDeleteModal({
      title: `Excluir Vaga ${job.id}`,
      message: `Tem certeza que deseja excluir permanentemente a vaga <strong>${job.id}: ${job.title}</strong>?`,
      details: `Esta ação excluirá a vaga, seu histórico de auditoria e ${appsCount} candidatura(s) vinculada(s).`,
      onConfirm: async () => {
        await jobService.deleteJob(jobId);
        showToast(`Vaga ${job.id} excluída com sucesso!`, 'success');
        refreshUI();
      }
    });
  };

  const handleAdmissionDelete = (admId) => {
    const adm = store.getAdmissionById(admId);
    if (!adm) return;
    const candName = adm.candidate ? adm.candidate.full_name : 'Candidato';

    openConfirmDeleteModal({
      title: 'Excluir Processo de Admissão',
      message: `Tem certeza que deseja remover o processo de admissão de <strong>${candName}</strong>?`,
      details: 'Esta ação excluirá o processo do Funil de Admissão e seu histórico de etapas. O candidato permanecerá ativo no Banco de Talentos.',
      onConfirm: async () => {
        await admissionService.deleteAdmission(admId);
        showToast(`Processo de admissão de ${candName} excluído!`, 'success');
        refreshUI();
      }
    });
  };

  const handleAdmissionMove = (admId, targetStage) => {
    openMoveAdmissionStageModal(admId, targetStage);
  };

  const handleAdmissionAdvance = async (admId, nextStageName) => {
    try {
      await admissionService.moveAdmissionStage(admId, {
        newStage: nextStageName,
        feedback: `Avanço direto para a etapa: ${nextStageName}`
      });
      showToast(`Processo avançado para "${nextStageName}" com sucesso!`, 'success');
      refreshUI();
    } catch (err) {
      showToast(err.message || 'Erro ao avançar etapa.', 'error');
    }
  };

  // Bind button in Talent Bank view
  const btnTalentNew = document.getElementById('btn-talent-bank-new');
  if (btnTalentNew) {
    btnTalentNew.onclick = openNewCandidateModal;
  }

  // Bind button in Admission view
  const btnAdmissionNewTop = document.getElementById('btn-new-admission-top');
  if (btnAdmissionNewTop) {
    btnAdmissionNewTop.onclick = () => openNewAdmissionModal();
  }

  // 4. Render Active View
  renderFilterBar(
    state.filters,
    state.currentView,
    (newFilters) => {
      state.filters = newFilters;
      refreshUI();
    },
    (newView) => {
      state.currentView = newView;
      refreshUI();
    },
    openNewJobModal,
    openNewCandidateModal,
    () => exportCandidatesToExcel(filteredApps),
    () => exportJobsToExcel(filteredJobs),
    () => exportAllToExcel(filteredJobs, filteredApps),
    () => exportAdmissionsToExcel(filteredAdmissions)
  );

  renderExecutiveDashboard(
    filteredJobs,
    filteredApps,
    filteredCandidates,
    (newView) => {
      state.currentView = newView;
      refreshUI();
    },
    openNewJobModal,
    openNewCandidateModal,
    openJobDetailsModal
  );

  renderKanbanBoard(filteredApps, openMoveStageModal, openAuditDrawer, handleAppDelete, openEditCandidateModal);
  renderJobsKanbanBoard(filteredJobs, openMoveJobStatusModal, openAssignRecruiterModal, openJobDetailsModal, handleJobDelete, openEditJobModal);
  renderAdmissionKanbanBoard(filteredAdmissions, handleAdmissionMove, openAdmissionDetailsModal, handleAdmissionDelete, handleAdmissionAdvance);
  renderTalentBankTable(filteredCandidates, openAttachToJobModal, handleTalentDelete, openEditCandidateModal, openCandidateHistoryModal);
  renderIndicatorsModule(filteredJobs, filteredApps, filteredAdmissions);
}

// =============================================================================
// Plurix Design System v4.5 Controls (Theme, Sync & Sidebar)
// =============================================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    if (theme === 'dark') {
      toggleBtn.innerHTML = `
        <svg class="theme-icon-sun" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <span id="theme-toggle-label">Modo Claro</span>
      `;
      toggleBtn.title = 'Alternar para Modo Claro';
    } else {
      toggleBtn.innerHTML = `
        <svg class="theme-icon-moon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <span id="theme-toggle-label">Modo Escuro</span>
      `;
      toggleBtn.title = 'Alternar para Modo Escuro';
    }
  }
}

function initTheme(onThemeChange) {
  const savedTheme = localStorage.getItem('plx-theme') || 'light';
  applyTheme(savedTheme);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('plx-theme', newTheme);
      window.dispatchEvent(new Event('resize'));
      if (onThemeChange) onThemeChange();
    };
  }
}

function initSidebarState() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Menu é permanentemente fixo e não comprimível
  sidebar.classList.remove('collapsed');
  localStorage.removeItem('plx-sidebar-collapsed');
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', async () => {
  initTheme(() => refreshUI());
  initSidebarState();

  if (isSupabaseConfigured()) {
    await store.loadFromSupabase();
  }
  initModals(refreshUI);
  authService.subscribe(() => refreshUI());
  refreshUI();
});


