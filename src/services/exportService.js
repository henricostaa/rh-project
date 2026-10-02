// =============================================================================
// ATS PLURIX 360° | Serviço de Exportação para Excel (xlsx)
// =============================================================================

import * as XLSX from 'xlsx';
import { store, formatSalaryRange } from '../db/store.js';
import { showToast } from '../components/Modals.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Exporta a lista de candidaturas/candidatos para Excel (.xlsx)
 * @param {Array} applications - Lista de candidaturas (filtradas ou completas)
 * @param {string} customFilename - Nome customizado do arquivo
 */
export function exportCandidatesToExcel(applications, customFilename) {
  if (!applications || applications.length === 0) {
    showToast('Nenhum candidato disponível para exportação com os filtros aplicados.', 'warning');
    return;
  }

  const rows = applications.map(app => {
    const cand = app.candidate || {};
    const job = app.job || {};
    const sla = store.calculateSLA(app, job);

    return {
      'ID Candidatura': app.id,
      'Nome do Candidato': cand.full_name || 'N/A',
      'E-mail': cand.email || 'N/A',
      'Telefone / WhatsApp': cand.phone || 'N/A',
      'Canal de Origem': cand.source || 'N/A',
      'Código Vaga': job.id || 'N/A',
      'Título da Vaga': job.title || 'N/A',
      'Empresa / Negócio': job.business_unit || 'N/A',
      'Diretoria': job.department || 'N/A',
      'Confidencial': job.is_confidential ? 'Sim' : 'Não',
      'Vaga PCD': job.is_pcd ? 'Sim' : 'Não',
      'Recrutadora Responsável': job.recruiter_email || 'Pendente',
      'BP Titular': job.bp_in_charge_email || 'N/A',
      'Etapa Atual': app.current_stage || 'N/A',
      'Status Candidatura': app.status || 'N/A',
      'Dias na Etapa Atual': sla.days,
      'SLA Limite (dias)': sla.limit,
      'Status SLA': sla.code === 'NO_PRAZO' ? 'No Prazo' : (sla.code === 'ATENCAO' ? 'Atenção' : 'Estourado'),
      'Data de Entrada na Etapa': formatDate(app.stage_entered_at),
      'Data de Cadastro': formatDate(app.created_at)
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Define larguras de coluna baseadas no maior conteúdo
  const keys = Object.keys(rows[0] || {});
  worksheet['!cols'] = keys.map(key => {
    let maxLen = key.length;
    rows.forEach(row => {
      const val = String(row[key] || '');
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidatos');

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = customFilename || `ATS_Plurix_Candidatos_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  showToast(`Exportação concluída! ${rows.length} candidato(s) exportado(s) em Excel.`, 'success');
}

/**
 * Exporta a lista de vagas para Excel (.xlsx)
 * @param {Array} jobs - Lista de vagas (filtradas ou completas)
 * @param {string} customFilename - Nome customizado do arquivo
 */
export function exportJobsToExcel(jobs, customFilename) {
  if (!jobs || jobs.length === 0) {
    showToast('Nenhuma vaga disponível para exportação com os filtros aplicados.', 'warning');
    return;
  }

  const allApps = store.getApplications();

  const rows = jobs.map(job => {
    const jobApps = allApps.filter(a => a.job_id === job.id);
    const countApps = jobApps.length;
    const countApproved = jobApps.filter(a => a.status === 'APROVADO').length;

    return {
      'Código Vaga': job.id,
      'Título da Vaga': job.title,
      'Empresa / Negócio': job.business_unit,
      'Diretoria': job.department,
      'Nível da Função': job.title_level || 'N/A',
      'Quadro de Vagas': job.headcount_type || 'N/A',
      'Tipo de Seleção': job.selection_type || 'N/A',
      'Gestor Solicitante': job.hiring_manager || 'N/A',
      'Vaga PCD': job.is_pcd ? 'Sim' : 'Não',
      'Modelo de Trabalho': job.work_model || 'Presencial',
      'Qtd. Posições': job.positions_count || 1,
      'Faixa Salarial': formatSalaryRange(job.salary_min, job.salary_max),
      'Status da Vaga': job.status,
      'SLA Etapa (dias)': job.stage_sla_days,
      'Solicitante (Perfil)': job.opened_by_role,
      'BP Responsável': job.bp_in_charge_email,
      'Recrutadora Atribuída': job.recruiter_email || 'Não Atribuída',
      'Observação da Vaga': job.observation || 'Sem observações',
      'Total Candidaturas': countApps,
      'Aprovados': countApproved,
      'Data de Abertura': formatDate(job.opened_at),
      'Data Encerramento': job.closed_at ? formatDate(job.closed_at) : 'Em Aberto'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const keys = Object.keys(rows[0] || {});
  worksheet['!cols'] = keys.map(key => {
    let maxLen = key.length;
    rows.forEach(row => {
      const val = String(row[key] || '');
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vagas');

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = customFilename || `ATS_Plurix_Vagas_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  showToast(`Exportação concluída! ${rows.length} vaga(s) exportada(s) em Excel.`, 'success');
}

/**
 * Exporta tanto Vagas como Candidatos em um único arquivo Excel com duas abas.
 * @param {Array} jobs 
 * @param {Array} applications 
 */
export function exportAllToExcel(jobs, applications) {
  if ((!jobs || jobs.length === 0) && (!applications || applications.length === 0)) {
    showToast('Nenhum dado disponível para exportação.', 'warning');
    return;
  }

  const workbook = XLSX.utils.book_new();

  // 1. Aba Vagas
  if (jobs && jobs.length > 0) {
    const allApps = store.getApplications();
    const jobRows = jobs.map(job => {
      const jobApps = allApps.filter(a => a.job_id === job.id);
      return {
        'Código Vaga': job.id,
        'Título da Vaga': job.title,
        'Empresa / Negócio': job.business_unit,
        'Diretoria': job.department,
        'Nível da Função': job.title_level || 'N/A',
        'Quadro de Vagas': job.headcount_type || 'N/A',
        'Tipo de Seleção': job.selection_type || 'N/A',
        'Gestor Solicitante': job.hiring_manager || 'N/A',
        'Vaga PCD': job.is_pcd ? 'Sim' : 'Não',
        'Modelo de Trabalho': job.work_model || 'Presencial',
        'Qtd. Posições': job.positions_count || 1,
        'Faixa Salarial': formatSalaryRange(job.salary_min, job.salary_max),
        'Status da Vaga': job.status,
        'SLA Etapa (dias)': job.stage_sla_days,
        'BP Responsável': job.bp_in_charge_email,
        'Recrutadora Atribuída': job.recruiter_email || 'Não Atribuída',
        'Total Candidaturas': jobApps.length,
        'Data de Abertura': formatDate(job.opened_at)
      };
    });
    const jobsSheet = XLSX.utils.json_to_sheet(jobRows);
    const keysJ = Object.keys(jobRows[0] || {});
    jobsSheet['!cols'] = keysJ.map(key => ({ wch: Math.min(Math.max(key.length + 3, 14), 40) }));
    XLSX.utils.book_append_sheet(workbook, jobsSheet, 'Vagas');
  }

  // 2. Aba Candidatos
  if (applications && applications.length > 0) {
    const candRows = applications.map(app => {
      const cand = app.candidate || {};
      const job = app.job || {};
      const sla = store.calculateSLA(app, job);
      return {
        'ID Candidatura': app.id,
        'Nome do Candidato': cand.full_name || 'N/A',
        'E-mail': cand.email || 'N/A',
        'Telefone': cand.phone || 'N/A',
        'Canal de Origem': cand.source || 'N/A',
        'Código Vaga': job.id || 'N/A',
        'Título da Vaga': job.title || 'N/A',
        'Diretoria': job.department || 'N/A',
        'Recrutadora Responsável': job.recruiter_email || 'Pendente',
        'Etapa Atual': app.current_stage || 'N/A',
        'Status': app.status || 'N/A',
        'Dias na Etapa': sla.days,
        'Status SLA': sla.code === 'NO_PRAZO' ? 'No Prazo' : (sla.code === 'ATENCAO' ? 'Atenção' : 'Estourado'),
        'Data de Cadastro': formatDate(app.created_at)
      };
    });
    const candSheet = XLSX.utils.json_to_sheet(candRows);
    const keysC = Object.keys(candRows[0] || {});
    candSheet['!cols'] = keysC.map(key => ({ wch: Math.min(Math.max(key.length + 3, 14), 40) }));
    XLSX.utils.book_append_sheet(workbook, candSheet, 'Candidatos');
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = `ATS_Plurix_Relatorio_Completo_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  showToast('Relatório completo em Excel baixado com sucesso!', 'success');
}
