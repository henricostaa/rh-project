// =============================================================================
// ATS PLURIX 360° | Application Entry Point & Reactive State Manager
// =============================================================================

import './styles/main.css';
import { store } from './db/store.js';
import { authService } from './services/authService.js';
import { jobService } from './services/jobService.js';
import { pipelineService } from './services/pipelineService.js';

import { renderLoginScreen } from './components/LoginScreen.js';
import { renderTopbar } from './components/Topbar.js';
import { renderKPIGrid } from './components/KPIGrid.js';
import { renderFilterBar } from './components/FilterBar.js';
import { renderKanbanBoard } from './components/KanbanBoard.js';
import { renderJobsKanbanBoard } from './components/JobsKanbanBoard.js';
import { renderCandidatesTable } from './components/CandidatesTable.js';
import { renderJobsTable } from './components/JobsTable.js';
import { renderIndicatorsModule } from './components/IndicatorsModule.js';
import { openAuditDrawer } from './components/AuditDrawer.js';
import {
  initModals,
  openNewJobModal,
  openNewCandidateModal,
  openMoveStageModal,
  openAssignRecruiterModal,
  openMoveJobStatusModal,
  openJobDetailsModal
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

  renderKanbanBoard(filteredApps, openMoveStageModal, openAuditDrawer);
  renderJobsKanbanBoard(filteredJobs, openMoveJobStatusModal, openAssignRecruiterModal, openJobDetailsModal);
  renderCandidatesTable(filteredApps, openMoveStageModal, openAuditDrawer);
  renderJobsTable(filteredJobs, openAssignRecruiterModal, openJobDetailsModal);
  renderIndicatorsModule(filteredJobs, filteredApps);
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  initModals(refreshUI);
  authService.subscribe(() => refreshUI());
  refreshUI();
});
