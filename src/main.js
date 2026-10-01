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
import { renderLoginScreen } from './components/LoginScreen.js';
import { renderTopbar } from './components/Topbar.js';
import { renderKPIGrid } from './components/KPIGrid.js';
import { renderFilterBar } from './components/FilterBar.js';
import { renderKanbanBoard } from './components/KanbanBoard.js';
import { renderJobsKanbanBoard } from './components/JobsKanbanBoard.js';
import { renderCandidatesTable } from './components/CandidatesTable.js';
import { renderJobsTable } from './components/JobsTable.js';
import { renderTalentBankTable } from './components/TalentBankTable.js';
import { renderIndicatorsModule } from './components/IndicatorsModule.js';
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
  openDeleteChoiceModal
} from './components/Modals.js';

import { exportCandidatesToExcel, exportJobsToExcel, exportAllToExcel } from './services/exportService.js';

// Application State
const state = {
  currentView: 'kanban',
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
      if (!matchTitle && !matchCode && !matchDept) return false;
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
      if (!matchCandName && !matchCandEmail && !matchJobTitle && !matchJobCode) return false;
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

  // Bind button in Talent Bank view
  const btnTalentNew = document.getElementById('btn-talent-bank-new');
  if (btnTalentNew) {
    btnTalentNew.onclick = openNewCandidateModal;
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
    () => exportAllToExcel(filteredJobs, filteredApps)
  );

  renderKanbanBoard(filteredApps, openMoveStageModal, openAuditDrawer, handleAppDelete);
  renderJobsKanbanBoard(filteredJobs, openMoveJobStatusModal, openAssignRecruiterModal, openJobDetailsModal, handleJobDelete);
  renderCandidatesTable(filteredApps, openMoveStageModal, openAuditDrawer, handleAppDelete);
  renderJobsTable(filteredJobs, openAssignRecruiterModal, openJobDetailsModal, handleJobDelete);
  renderTalentBankTable(filteredCandidates, openAttachToJobModal, handleTalentDelete);
  renderIndicatorsModule(filteredJobs, filteredApps);
}
 
// Bootstrapping
document.addEventListener('DOMContentLoaded', async () => {
  if (isSupabaseConfigured()) {
    await store.loadFromSupabase();
  }
  initModals(refreshUI);
  authService.subscribe(() => refreshUI());
  refreshUI();
});


