// =============================================================================
// ATS PLURIX 360° | Seed Data Inicial Demonstrativo
// =============================================================================

export const INITIAL_JOBS = [
  {
    id: 'VAG-101',
    title: 'Analista de Sistemas Senior',
    business_unit: 'Plurix - CSC',
    department: 'Comercial',
    hiring_manager: 'Roberto Almeida',
    headcount_type: 'Posição Nova',
    selection_type: 'ATS',
    work_model: 'Híbrido',
    positions_count: 2,
    salary_min: 8000,
    salary_max: 12000,
    location_associada: 'Plurix - CSC',
    location_city: 'São Paulo',
    location_state: 'SP',
    replaced_employee: null,
    is_pcd: false,
    status: 'Triagem',
    stage_sla_days: 4,
    opened_by_role: 'BP',
    bp_in_charge_email: 'bp.comercial@plurix.com.br',
    recruiter_email: 'fatima@plurix.com.br',
    is_confidential: false,
    observation: 'Vaga prioritária para atender demanda do novo sistema de faturamento.',
    opened_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    closed_at: null
  },
  {
    id: 'VAG-102',
    title: 'Coordenador de Expansão de Lojas',
    business_unit: 'Superpão',
    department: 'Expansão',
    hiring_manager: 'Fernanda Lima',
    headcount_type: 'Substituição',
    selection_type: 'Linkedin',
    work_model: 'Presencial',
    positions_count: 1,
    salary_min: 9500,
    salary_max: 14000,
    location_associada: 'Superpão',
    location_city: 'Guarapuava',
    location_state: 'PR',
    replaced_employee: 'Marcos Vinicius Ribeiro',
    is_pcd: false,
    status: 'Entrevista RH',
    stage_sla_days: 3,
    opened_by_role: 'GESTORA_RH',
    bp_in_charge_email: 'gestora.rh@plurix.com.br',
    recruiter_email: 'julia@plurix.com.br',
    is_confidential: false,
    observation: 'Substituição urgente devido à movimentação interna do coordenador anterior.',
    opened_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    closed_at: null
  },
  {
    id: 'VAG-103',
    title: 'Diretor de M&A e Reestruturação',
    business_unit: 'Plurix - Sede',
    department: 'M&A',
    hiring_manager: 'Conselho Consultivo',
    headcount_type: 'Posição Nova',
    selection_type: 'Consultoria',
    work_model: 'Presencial',
    positions_count: 1,
    salary_min: 25000,
    salary_max: 35000,
    location_associada: 'Plurix - Sede',
    location_city: 'São Paulo',
    location_state: 'SP',
    replaced_employee: null,
    is_pcd: false,
    status: 'Entrevista Gestor',
    stage_sla_days: 5,
    opened_by_role: 'GESTORA_RH',
    bp_in_charge_email: 'gestora.rh@plurix.com.br',
    recruiter_email: 'luana@plurix.com.br',
    is_confidential: true, // RN-07 Confidencial!
    observation: 'Projeto estratégico sigiloso do conselho de administração.',
    opened_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    closed_at: null
  },
  {
    id: 'VAG-104',
    title: 'Especialista em Inteligência de Mercado',
    business_unit: 'Amigão',
    department: 'Digital',
    hiring_manager: 'Lucas Moura',
    headcount_type: 'Posição Nova',
    selection_type: 'Linkedin',
    work_model: 'Remoto',
    positions_count: 3,
    salary_min: 7500,
    salary_max: 10500,
    location_associada: 'Amigão',
    location_city: 'Campinas',
    location_state: 'SP',
    replaced_employee: null,
    is_pcd: false,
    status: 'Alinhamento',
    stage_sla_days: 4,
    opened_by_role: 'BP',
    bp_in_charge_email: 'bp.digital@plurix.com.br',
    recruiter_email: 'bp.digital@plurix.com.br', // RN-06 Duplo Papel BP
    is_confidential: false,
    observation: 'Nova cadeira focada em pricing dinâmico e e-commerce.',
    opened_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    closed_at: null
  },
  {
    id: 'VAG-105',
    title: 'Gerente Regional de Operações',
    business_unit: 'Avenida',
    department: 'Operações',
    hiring_manager: 'Carlos Eduardo',
    headcount_type: 'Substituição',
    selection_type: 'Mov. Interna',
    work_model: 'Presencial',
    positions_count: 5,
    salary_min: 15000,
    salary_max: 22000,
    location_associada: 'Avenida',
    location_city: 'Cuiabá',
    location_state: 'MT',
    replaced_employee: 'Ricardo Alves Ferreira',
    is_pcd: true,
    status: 'Alinhamento',
    stage_sla_days: 4,
    opened_by_role: 'BP',
    bp_in_charge_email: 'bp.comercial@plurix.com.br',
    recruiter_email: null, // Sem recrutadora atribuída
    is_confidential: false,
    observation: 'Requisição em alinhamento de perfil com o gestor regional.',
    opened_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    closed_at: null
  }
];

export const INITIAL_CANDIDATES = [
  {
    id: 'cand-001',
    full_name: 'Gabriel Santos Oliveira',
    email: 'gabriel.santos@email.com',
    phone: '(11) 98765-4321',
    source: 'LinkedIn',
    gender: 'Masculino',
    salary_expectation: 9500,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 'cand-002',
    full_name: 'Camila Rodriguez Souza',
    email: 'camila.souza@email.com',
    phone: '(41) 99887-1122',
    source: 'Indicação Colaborador',
    gender: 'Feminino',
    salary_expectation: 11000,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'cand-003',
    full_name: 'Marcelo Barbosa Mendes',
    email: 'marcelo.mendes@email.com',
    phone: '(19) 97123-8899',
    source: 'Consultoria',
    gender: 'Masculino',
    salary_expectation: 28000,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 'cand-004',
    full_name: 'Juliana Ferreira Paes',
    email: 'juliana.paes@email.com',
    phone: '(31) 99112-3344',
    source: 'ATS Plurix',
    gender: 'Feminino',
    salary_expectation: 8500,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'cand-005',
    full_name: 'Rodrigo Nogueira Ramos',
    email: 'rodrigo.ramos@email.com',
    phone: '(11) 98112-9988',
    source: 'Mov. Interna',
    gender: 'Masculino',
    salary_expectation: 16000,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

export const INITIAL_APPLICATIONS = [
  {
    id: 'app-001',
    job_id: 'VAG-101',
    candidate_id: 'cand-001',
    current_stage: 'Entrevista R&S',
    status: 'EM_ANDAMENTO',
    rejection_reason: null,
    // Stage entered 1 day ago -> No Prazo (1 <= 4)
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'app-002',
    job_id: 'VAG-101',
    candidate_id: 'cand-004',
    current_stage: 'Aguardando Retorno',
    status: 'EM_ANDAMENTO',
    rejection_reason: null,
    // Stage entered 6 days ago -> SLA ESTOURADO (6 > 4)
    stage_entered_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 'app-003',
    job_id: 'VAG-102',
    candidate_id: 'cand-002',
    current_stage: 'Entrevista Gestor',
    status: 'EM_ANDAMENTO',
    rejection_reason: null,
    // Stage entered 3 days ago -> SLA ATENÇÃO (3 == 3)
    stage_entered_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'app-004',
    job_id: 'VAG-103',
    candidate_id: 'cand-003',
    current_stage: 'Teste',
    status: 'EM_ANDAMENTO',
    rejection_reason: null,
    // Stage entered 2 days ago -> No Prazo (2 <= 5)
    stage_entered_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 'app-005',
    job_id: 'VAG-104',
    candidate_id: 'cand-005',
    current_stage: 'Primeiro Contato',
    status: 'EM_ANDAMENTO',
    rejection_reason: null,
    // Stage entered 1 day ago -> No Prazo
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

export const INITIAL_STAGE_HISTORY = [
  {
    id: 'hist-001',
    application_id: 'app-001',
    previous_stage: 'Aguardando Conexão / LinkedIn',
    new_stage: 'Primeiro Contato',
    status_at_move: 'EM_ANDAMENTO',
    feedback: 'Candidato aceitou a conexão e demonstrou forte interesse no projeto.',
    moved_by: 'fatima@plurix.com.br',
    duration_days: 2,
    moved_at: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 'hist-002',
    application_id: 'app-001',
    previous_stage: 'Primeiro Contato',
    new_stage: 'Entrevista R&S',
    status_at_move: 'EM_ANDAMENTO',
    feedback: 'Triagem telefônica concluída com alinhamento salarial e disponibilidade imediata.',
    moved_by: 'fatima@plurix.com.br',
    duration_days: 7,
    moved_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'hist-003',
    application_id: 'app-003',
    previous_stage: 'Entrevista R&S',
    new_stage: 'Entrevista Gestor',
    status_at_move: 'Aprovado R&S',
    feedback: 'Parecer R&S extremamente favorável. Candidata atende 100% dos pré-requisitos de expansão.',
    moved_by: 'julia@plurix.com.br',
    duration_days: 4,
    moved_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

export const INITIAL_JOB_HISTORY = [
  {
    id: 'job-hist-001',
    job_id: 'VAG-101',
    previous_status: 'Abertura de Vaga',
    new_status: 'Alinhamento',
    observation: 'Abertura de requisição iniciada pelo BP Comercial.',
    changed_by: 'bp.comercial@plurix.com.br',
    changed_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'job-hist-002',
    job_id: 'VAG-101',
    previous_status: 'Alinhamento',
    new_status: 'Triagem',
    observation: 'Alinhamento de perfil concluído. Divulgação da vaga autorizada.',
    changed_by: 'fatima@plurix.com.br',
    changed_at: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 'job-hist-003',
    job_id: 'VAG-102',
    previous_status: 'Abertura de Vaga',
    new_status: 'Alinhamento',
    observation: 'Requisição aberta pela Gestora RH.',
    changed_by: 'gestora.rh@plurix.com.br',
    changed_at: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 'job-hist-004',
    job_id: 'VAG-102',
    previous_status: 'Alinhamento',
    new_status: 'Entrevista RH',
    observation: 'Recrutadora Julia iniciou as entrevistas dos primeiros pré-selecionados.',
    changed_by: 'julia@plurix.com.br',
    changed_at: new Date(Date.now() - 11 * 86400000).toISOString()
  },
  {
    id: 'job-hist-005',
    job_id: 'VAG-103',
    previous_status: 'Abertura de Vaga',
    new_status: 'Entrevista Gestor',
    observation: 'Vaga confidencial direta para fase avançada com o Conselho.',
    changed_by: 'gestora.rh@plurix.com.br',
    changed_at: new Date(Date.now() - 20 * 86400000).toISOString()
  }
];

export const INITIAL_ADMISSIONS = [
  {
    id: 'adm-001',
    candidate_id: 'cand-001',
    job_id: 'VAG-101',
    application_id: 'app-001',
    current_stage: 'Carta Oferta (Assinatura Gestor e Candidato)',
    status: 'EM_ANDAMENTO',
    start_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    salary: 10500,
    responsible_email: 'fatima@plurix.com.br',
    checklist: {
      oferta_gestor_assinado: true,
      oferta_gestor_data: new Date(Date.now() - 1 * 86400000).toISOString(),
      oferta_candidato_assinado: false,
      oferta_candidato_data: null,
      link_admissao_enviado: false,
      link_admissao_status: 'Pendente',
      exame_protocolo: '',
      exame_clinica: '',
      exame_data: null,
      exame_aso_status: 'Pendente',
      carta_banco_dispensada: false,
      carta_banco_emitida: false,
      chamado_dp_numero: '',
      chamado_dp_status: 'Pendente',
      email_confirmacao_enviado: false,
      glpi_ticket_numero: '',
      glpi_solicitado_notebook: true,
      glpi_solicitado_email: true,
      glpi_status: 'Pendente',
      planilha_inserida: false,
      informe_bp_novo_candidato: false,
      matricula_gerada: ''
    },
    notes: 'Aguardando retorno do candidato com a carta oferta assinada.',
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    completed_at: null
  },
  {
    id: 'adm-002',
    candidate_id: 'cand-002',
    job_id: 'VAG-102',
    application_id: 'app-003',
    current_stage: 'Abertura Chamado Exame Admissão',
    status: 'EM_ANDAMENTO',
    start_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    salary: 12500,
    responsible_email: 'julia@plurix.com.br',
    checklist: {
      oferta_gestor_assinado: true,
      oferta_gestor_data: new Date(Date.now() - 5 * 86400000).toISOString(),
      oferta_candidato_assinado: true,
      oferta_candidato_data: new Date(Date.now() - 4 * 86400000).toISOString(),
      link_admissao_enviado: true,
      link_admissao_data: new Date(Date.now() - 3 * 86400000).toISOString(),
      link_admissao_status: 'Documentos Enviados',
      exame_protocolo: 'MED-2026-8841',
      exame_clinica: 'Clínica Saúde Ocupacional Curitiba',
      exame_data: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      exame_aso_status: 'Agendado',
      carta_banco_dispensada: false,
      carta_banco_emitida: false,
      chamado_dp_numero: '',
      chamado_dp_status: 'Pendente',
      email_confirmacao_enviado: false,
      glpi_ticket_numero: '',
      glpi_solicitado_notebook: true,
      glpi_solicitado_email: true,
      glpi_status: 'Pendente',
      planilha_inserida: false,
      informe_bp_novo_candidato: false,
      matricula_gerada: ''
    },
    notes: 'Exame agendado para depois de amanhã. Candidata já anexou certidões e comprovantes.',
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    completed_at: null
  },
  {
    id: 'adm-003',
    candidate_id: 'cand-003',
    job_id: 'VAG-103',
    application_id: 'app-004',
    current_stage: 'Formulário de Acessos GLPI',
    status: 'EM_ANDAMENTO',
    start_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    salary: 32000,
    responsible_email: 'luana@plurix.com.br',
    checklist: {
      oferta_gestor_assinado: true,
      oferta_gestor_data: new Date(Date.now() - 8 * 86400000).toISOString(),
      oferta_candidato_assinado: true,
      oferta_candidato_data: new Date(Date.now() - 7 * 86400000).toISOString(),
      link_admissao_enviado: true,
      link_admissao_data: new Date(Date.now() - 6 * 86400000).toISOString(),
      link_admissao_status: 'Aprovado',
      exame_protocolo: 'MED-2026-7910',
      exame_clinica: 'Laboratório Fleury - Higienópolis',
      exame_data: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      exame_aso_status: 'Apto',
      carta_banco_dispensada: true, // Já possui conta no banco
      carta_banco_emitida: false,
      chamado_dp_numero: 'DP-2026-551',
      chamado_dp_responsavel: 'Mariana DP',
      chamado_dp_status: 'Concluído',
      email_confirmacao_enviado: true,
      email_confirmacao_data: new Date(Date.now() - 2 * 86400000).toISOString(),
      glpi_ticket_numero: 'GLPI-84910',
      glpi_solicitado_notebook: true,
      glpi_solicitado_email: true,
      glpi_solicitado_vpn: true,
      glpi_solicitado_cracha: true,
      glpi_status: 'Em Atendimento',
      planilha_inserida: false,
      informe_bp_novo_candidato: false,
      matricula_gerada: ''
    },
    notes: 'Chamado GLPI aberto para configuração de MacBook e acesso à rede executiva.',
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    completed_at: null
  },
  {
    id: 'adm-004',
    candidate_id: 'cand-004',
    job_id: 'VAG-104',
    application_id: 'app-002',
    current_stage: 'Admissão Concluída',
    status: 'CONCLUIDO',
    start_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    salary: 9500,
    responsible_email: 'bp.digital@plurix.com.br',
    checklist: {
      oferta_gestor_assinado: true,
      oferta_candidato_assinado: true,
      link_admissao_enviado: true,
      link_admissao_status: 'Aprovado',
      exame_aso_status: 'Apto',
      carta_banco_dispensada: true,
      chamado_dp_numero: 'DP-2026-499',
      chamado_dp_status: 'Concluído',
      email_confirmacao_enviado: true,
      glpi_ticket_numero: 'GLPI-84102',
      glpi_status: 'Concluído',
      planilha_inserida: true,
      informe_bp_novo_candidato: true,
      matricula_gerada: 'PLX-0982'
    },
    notes: 'Admissão finalizada e homologada. Colaboradora já integrada na equipe Digital.',
    stage_entered_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'adm-005',
    candidate_id: 'cand-005',
    job_id: 'VAG-105',
    application_id: 'app-005',
    current_stage: 'Envio do Link de Admissão',
    status: 'EM_ANDAMENTO',
    start_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    salary: 19000,
    responsible_email: 'bp.comercial@plurix.com.br',
    checklist: {
      oferta_gestor_assinado: true,
      oferta_candidato_assinado: true,
      link_admissao_enviado: true,
      link_admissao_status: 'Em Preenchimento',
      exame_aso_status: 'Pendente',
      carta_banco_dispensada: false,
      chamado_dp_status: 'Pendente',
      email_confirmacao_enviado: false,
      glpi_status: 'Pendente',
      planilha_inserida: false,
      informe_bp_novo_candidato: false,
      matricula_gerada: ''
    },
    notes: 'Candidato já está preenchendo os dados no portal de admissão.',
    stage_entered_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    completed_at: null
  }
];

export const INITIAL_ADMISSION_STAGE_HISTORY = [
  {
    id: 'adm-hist-001',
    admission_id: 'adm-001',
    previous_stage: 'Início da Admissão',
    new_stage: 'Carta Oferta (Assinatura Gestor e Candidato)',
    status_at_move: 'EM_ANDAMENTO',
    feedback: 'Processo de admissão iniciado após aprovação na etapa final de seleção.',
    moved_by: 'fatima@plurix.com.br',
    duration_days: 0,
    moved_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'adm-hist-002',
    admission_id: 'adm-002',
    previous_stage: 'Carta Oferta (Assinatura Gestor e Candidato)',
    new_stage: 'Envio do Link de Admissão',
    status_at_move: 'EM_ANDAMENTO',
    feedback: 'Carta oferta devidamente assinada por ambas as partes.',
    moved_by: 'julia@plurix.com.br',
    duration_days: 2,
    moved_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'adm-hist-003',
    admission_id: 'adm-002',
    previous_stage: 'Envio do Link de Admissão',
    new_stage: 'Abertura Chamado Exame Admissão',
    status_at_move: 'EM_ANDAMENTO',
    feedback: 'Documentos anexados no link com sucesso. Encaminhada para exame médico admissional.',
    moved_by: 'julia@plurix.com.br',
    duration_days: 2,
    moved_at: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];


