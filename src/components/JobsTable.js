// =============================================================================
// ATS PLURIX 360° | Componente Tabela Operacional de Vagas (Section 3 & 4 PRD)
// =============================================================================

import { store, formatSalaryRange } from '../db/store.js';
import { authService } from '../services/authService.js';

export function renderJobsTable(jobs, onAssignClick, onJobClick, onDeleteJobClick, onEditJobClick) {
  const tbody = document.getElementById('jobs-table-body');
  if (!tbody) return;

  if (jobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 30px; color: var(--muted);">
          Nenhuma vaga disponível para o perfil ativo.
        </td>
      </tr>
    `;
    return;
  }

  const allApps = store.getApplications();

  tbody.innerHTML = jobs.map(job => {
    const jobAppsCount = allApps.filter(a => a.job_id === job.id).length;
    const canAssign = authService.canAssignRecruiter(job);
    const canDelete = authService.canDeleteJob(job);
    const canEditJob = authService.canEditJobDetails(job);

    return `
      <tr class="job-table-row" data-job-id="${job.id}" style="cursor: pointer;">
        <td>
          <span class="cell-main" style="font-family: var(--font-heading); color: var(--navy); text-decoration: underline;">${job.id}</span>
        </td>
        <td>
          <div class="cell-main">
            ${job.title}
            ${job.is_confidential ? '<span class="badge badge-confidential" style="margin-left: 6px;">Confidencial</span>' : ''}
          </div>
          <div class="cell-sub">${job.selection_type} • ${job.headcount_type} ${job.is_pcd ? '• PCD' : ''}</div>
        </td>
        <td>
          <div class="cell-main">${job.business_unit}</div>
          <div class="cell-sub">${job.department}</div>
        </td>
        <td>
          <div class="cell-main">${job.bp_in_charge_email}</div>
          <div class="cell-sub">Aberto por ${job.opened_by_role}</div>
        </td>
        <td>
          ${job.recruiter_email ? `
            <span class="cell-main">${job.recruiter_email}</span>
            ${job.recruiter_email === job.bp_in_charge_email ? '<span class="badge badge-a" style="margin-left: 4px;">Duplo Papel BP</span>' : ''}
          ` : `
            <span class="badge badge-b">Sem Recrutadora</span>
          `}
        </td>
        <td>
          <span class="cell-main" style="font-weight: 600; color: var(--navy);">${formatSalaryRange(job.salary_min, job.salary_max)}</span>
        </td>
        <td>
          <span class="cell-main">${job.work_model || 'Presencial'}</span>
        </td>
        <td>
          <span class="cell-main" style="font-weight: 600;">${job.positions_count || 1} pos.</span>
        </td>
        <td>
          <span class="cell-main">${job.stage_sla_days} dias por etapa</span>
        </td>
        <td>
          <span class="badge badge-neutral">${jobAppsCount} candidaturas</span>
        </td>
        <td>
          <span class="badge badge-a">${job.status}</span>
        </td>
        <td class="text-right" style="white-space: nowrap;">
          ${canEditJob ? `
            <button class="btn btn-secondary btn-sm btn-edit-job-table" data-job-id="${job.id}" title="Editar Informações da Vaga">
              Editar
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm btn-job-audit-table" data-job-id="${job.id}" title="Ver Detalhes e Auditoria da Vaga">
            Auditoria
          </button>
          ${canAssign ? `
            <button class="btn btn-secondary btn-sm btn-assign-job" data-job-id="${job.id}">
              Atribuir Recrutadora
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" disabled title="Somente Gestora RH ou BP titular da vaga podem atribuir (RN-05)">
              Bloqueado
            </button>
          `}
          ${canDelete ? `
            <button class="btn btn-danger-outline btn-sm btn-delete-job-table" data-job-id="${job.id}" title="Excluir Vaga">
              Excluir
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.job-table-row').forEach(row => {
    row.onclick = () => {
      if (onJobClick) {
        onJobClick(row.dataset.jobId);
      }
    };
  });

  tbody.querySelectorAll('.btn-edit-job-table').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onEditJobClick) {
        onEditJobClick(btn.dataset.jobId);
      }
    };
  });

  tbody.querySelectorAll('.btn-assign-job').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      onAssignClick(btn.dataset.jobId);
    };
  });

  tbody.querySelectorAll('.btn-job-audit-table').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onJobClick) {
        onJobClick(btn.dataset.jobId);
      }
    };
  });

  tbody.querySelectorAll('.btn-delete-job-table').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onDeleteJobClick) {
        onDeleteJobClick(btn.dataset.jobId);
      }
    };
  });
}

