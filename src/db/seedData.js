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
    created_at: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 'cand-002',
    full_name: 'Camila Rodriguez Souza',
    email: 'camila.souza@email.com',
    phone: '(41) 99887-1122',
    source: 'Indicação Colaborador',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'cand-003',
    full_name: 'Marcelo Barbosa Mendes',
    email: 'marcelo.mendes@email.com',
    phone: '(19) 97123-8899',
    source: 'Consultoria',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 'cand-004',
    full_name: 'Juliana Ferreira Paes',
    email: 'juliana.paes@email.com',
    phone: '(31) 99112-3344',
    source: 'ATS Plurix',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'cand-005',
    full_name: 'Rodrigo Nogueira Ramos',
    email: 'rodrigo.ramos@email.com',
    phone: '(11) 98112-9988',
    source: 'Mov. Interna',
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

