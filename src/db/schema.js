// =============================================================================
// ATS PLURIX 360° | Dicionário de Domínios e Taxonomia Operacional (Section 5 & 6)
// =============================================================================

export const TAXONOMY = {
  workModels: [
    'Presencial',
    'Híbrido',
    'Remoto'
  ],
  genders: [
    'Feminino',
    'Masculino',
    'Outro',
    'Prefiro não informar'
  ],
  businessUnits: [
    'Amigão',
    'Avenida',
    'BOA',
    'Paraná',
    'Plurix - CSC',
    'Plurix - Sede',
    'Superpão'
  ],
  departments: [
    'Auditoria Interna',
    'Comercial',
    'Digital',
    'Estratégia',
    'Expansão',
    'Finanças',
    'Gente e Sustentabilidade',
    'M&A',
    'Novos Negócios',
    'Operações',
    'Outros',
    'RH'
  ],
  titles: [
    'Analista',
    'Aprendiz',
    'Assistente',
    'Auxiliar',
    'C Level',
    'Consultor',
    'Coordenador',
    'Diretor',
    'Especialista',
    'Estágio',
    'Gerente',
    'Gerente de Loja',
    'Gerente Regional',
    'Medico',
    'Supervisor',
    'Tecnico'
  ],
  headcountTypes: [
    'Substituição',
    'Posição Nova'
  ],
  selectionTypes: [
    'ATS',
    'Consultoria',
    'Indicação Colaborador',
    'Indicação Gestor',
    'Internalização',
    'Linkedin',
    'Mov. Interna',
    'Cancelada'
  ],
  jobStatuses: [
    'Alinhamento',
    'Triagem',
    'Entrevista RH',
    'Entrevista Gestor',
    'Teste',
    'Remuneração',
    'Oferta',
    'Admissão',
    'Standy by',
    'Congelada',
    'Cancelada',
    'Concluída',
    'Fechada'
  ],
  funnelStages: [
    'Aguardando Conexão / LinkedIn',
    'Primeiro Contato',
    'Aguardando Retorno',
    'Aguardando Entrevista',
    'Entrevista R&S',
    'Entrevista Gestor',
    'Teste',
    'Oferta',
    'Contratado'
  ],
  applicationStatuses: [
    'EM_ANDAMENTO',
    'Aprovado R&S',
    'Reprovado R&S',
    'Reprovado Gestão',
    'Declinio',
    'Standy by',
    'Banco de Talentos'
  ]
};

// Matriz de SLAs da Empresa (Conforme Tabela e Fluxo de Recrutamento)
export const ROLE_LEVEL_SLA_MAP = {
  'Assistente': 30,
  'Analista': 30,
  'Consultor': 45,
  'Coordenador': 45,
  'Gerente de Loja': 30,
  'Gerente Loja': 30,
  'Gerente': 45,
  'Gerente Geral': 45,
  'Gerente Geral/ Adm': 45,
  'Adm': 45,
  'Gerente Regional': 60,
  'Diretor': 90,
  'C Level': 90,
  'C-Level': 90
};

export function getRoleLevelSLA(titleOrLevel) {
  if (!titleOrLevel) return 30;
  const str = String(titleOrLevel).toLowerCase();
  
  if (str.includes('c-level') || str.includes('c level') || str.includes('diretor')) return 90;
  if (str.includes('regional')) return 60;
  if (str.includes('gerente loja') || str.includes('gerente de loja')) return 30;
  if (str.includes('gerente') || str.includes('adm') || str.includes('consultor') || str.includes('coordenador')) return 45;
  if (str.includes('assistente') || str.includes('analista') || str.includes('aprendiz') || str.includes('auxiliar') || str.includes('estágio')) return 30;
  
  return 30; // Padrão
}

// -----------------------------------------------------------------------------
// Fluxo Oficial de R&S e SLAs por Etapa do Processo
// Conforme matriz de etapas e prazos oficiais:
// Etapa 1: BP recebe a vaga do Gestor e formaliza vaga para R&S (2 dias)
// Etapa 2: Alinhamento de Perfil com Gestor + Publicação Vaga (1 dia)
// Etapa 3: Triagem + Captação (7 dias)
// Etapa 4: Validação do perfil mapeados para o Gestor (3 dias)
// Etapa 5: Entrevista RH (1 dia)
// Etapa 6: Entrevista Gestor + Teste (1 dia - dependerá dos testes)
// Etapa 7: Formalização do candidato Gestor / Estudo de Remuneração (5 dias)
// Etapa 8: Oferta proposta ao candidato + Envio dos dados para admissão com carta oferta (5 dias)
// -----------------------------------------------------------------------------

export const PROCESS_STAGES = [
  {
    step: 1,
    key: 'bp_formalizacao',
    name: 'BP recebe a vaga do Gestor e formaliza vaga para R&S com descrição da vaga.',
    shortName: 'Formalização BP',
    defaultDays: 2,
    aliases: [
      'BP recebe a vaga do Gestor e formaliza vaga para R&S com descrição da vaga.',
      'Formalização BP',
      'Formalização',
      'Abertura de Vaga'
    ]
  },
  {
    step: 2,
    key: 'alinhamento_publicacao',
    name: 'Alinhamento de Perfil com Gestor + Publicação Vaga',
    shortName: 'Alinhamento & Publicação',
    defaultDays: 1,
    aliases: [
      'Alinhamento de Perfil com Gestor + Publicação Vaga',
      'Alinhamento',
      'Alinhamento & Publicação',
      'Aguardando Conexão / LinkedIn'
    ]
  },
  {
    step: 3,
    key: 'triagem_captacao',
    name: 'Triagem + Captação',
    shortName: 'Triagem + Captação',
    defaultDays: 7,
    aliases: [
      'Triagem + Captação',
      'Triagem',
      'Primeiro Contato'
    ]
  },
  {
    step: 4,
    key: 'validacao_gestor',
    name: 'Validação do perfil mapeados para o Gestor',
    shortName: 'Validação Gestor',
    defaultDays: 3,
    aliases: [
      'Validação do perfil mapeados para o Gestor',
      'Validação Gestor',
      'Aguardando Retorno',
      'Aguardando Entrevista'
    ]
  },
  {
    step: 5,
    key: 'entrevista_rh',
    name: 'Entrevista RH',
    shortName: 'Entrevista RH',
    defaultDays: 1,
    aliases: [
      'Entrevista RH',
      'Entrevista R&S'
    ]
  },
  {
    step: 6,
    key: 'entrevista_gestor_teste',
    name: 'Entrevista Gestor + Teste',
    shortName: 'Entrevista Gestor + Teste',
    defaultDays: 1,
    note: 'dependerá dos testes',
    aliases: [
      'Entrevista Gestor + Teste',
      'Entrevista Gestor',
      'Teste'
    ]
  },
  {
    step: 7,
    key: 'formalizacao_remuneracao',
    name: 'Formalização do candidato Gestor / Estudo de Remuneração',
    shortName: 'Formalização & Remuneração',
    defaultDays: 5,
    aliases: [
      'Formalização do candidato Gestor / Estudo de Remuneração',
      'Formalização do candidato Gestor',
      'Estudo de Remuneração',
      'Remuneração'
    ]
  },
  {
    step: 8,
    key: 'oferta_admissao',
    name: 'Oferta proposta ao candidato + Envio dos dados para admissão com carta oferta',
    shortName: 'Oferta & Admissão',
    defaultDays: 5,
    aliases: [
      'Oferta proposta ao candidato + Envio dos dados para admissão com carta oferta',
      'Oferta proposta ao candidato + Envio dos dados para admissão',
      'Oferta',
      'Admissão',
      'Contratado'
    ]
  }
];

export const DEFAULT_STAGE_SLAS = {
  'BP recebe a vaga do Gestor e formaliza vaga para R&S com descrição da vaga.': 2,
  'Alinhamento de Perfil com Gestor + Publicação Vaga': 1,
  'Triagem + Captação': 7,
  'Validação do perfil mapeados para o Gestor': 3,
  'Entrevista RH': 1,
  'Entrevista Gestor + Teste': 1,
  'Formalização do candidato Gestor / Estudo de Remuneração': 5,
  'Oferta proposta ao candidato + Envio dos dados para admissão com carta oferta': 5
};

export const STAGE_SLA_MAP = {
  // 8 Etapas Oficiais
  'BP recebe a vaga do Gestor e formaliza vaga para R&S com descrição da vaga.': 2,
  'Formalização BP': 2,
  'Formalização': 2,
  'Abertura de Vaga': 2,

  'Alinhamento de Perfil com Gestor + Publicação Vaga': 1,
  'Alinhamento': 1,
  'Alinhamento & Publicação': 1,
  'Aguardando Conexão / LinkedIn': 1,

  'Triagem + Captação': 7,
  'Triagem': 7,
  'Primeiro Contato': 7,

  'Validação do perfil mapeados para o Gestor': 3,
  'Validação Gestor': 3,
  'Aguardando Retorno': 3,
  'Aguardando Entrevista': 3,

  'Entrevista RH': 1,
  'Entrevista R&S': 1,

  'Entrevista Gestor + Teste': 1,
  'Entrevista Gestor': 1,
  'Teste': 1,

  'Formalização do candidato Gestor / Estudo de Remuneração': 5,
  'Formalização do candidato Gestor': 5,
  'Estudo de Remuneração': 5,
  'Remuneração': 5,

  'Oferta proposta ao candidato + Envio dos dados para admissão com carta oferta': 5,
  'Oferta proposta ao candidato + Envio dos dados para admissão': 5,
  'Oferta': 5,
  'Admissão': 5,
  'Contratado': 0
};

export function getStageSLALimit(stageName, job = null) {
  if (!stageName) return 4;
  
  // 1. Se a vaga possui stage_slas personalizado gravado:
  if (job && job.stage_slas && typeof job.stage_slas === 'object') {
    // Busca direta pelo nome da etapa
    if (job.stage_slas[stageName] !== undefined && Number(job.stage_slas[stageName]) > 0) {
      return Number(job.stage_slas[stageName]);
    }
    // Busca por alias no processo oficial
    const matchedProcessStage = PROCESS_STAGES.find(ps => 
      ps.name === stageName || 
      ps.shortName === stageName || 
      ps.key === stageName || 
      (ps.aliases && ps.aliases.includes(stageName))
    );
    if (matchedProcessStage) {
      if (job.stage_slas[matchedProcessStage.name] !== undefined) {
        return Number(job.stage_slas[matchedProcessStage.name]);
      }
      if (job.stage_slas[matchedProcessStage.key] !== undefined) {
        return Number(job.stage_slas[matchedProcessStage.key]);
      }
      if (job.stage_slas[matchedProcessStage.shortName] !== undefined) {
        return Number(job.stage_slas[matchedProcessStage.shortName]);
      }
    }
  }

  // 2. Busca na matriz padrão oficial de SLAs por etapa
  if (STAGE_SLA_MAP[stageName] !== undefined) {
    return STAGE_SLA_MAP[stageName];
  }

  // 3. Fallback pelo job.stage_sla_days se definido
  if (job && job.stage_sla_days && Number(job.stage_sla_days) > 0) {
    return Number(job.stage_sla_days);
  }

  return 4;
}

export function getStageSLA(stageName) {
  return getStageSLALimit(stageName, null);
}

export function calculateTotalJobSLA(job = null) {
  let total = 0;
  PROCESS_STAGES.forEach(ps => {
    let days = ps.defaultDays;
    if (job && job.stage_slas) {
      if (job.stage_slas[ps.name] !== undefined) days = Number(job.stage_slas[ps.name]) || ps.defaultDays;
      else if (job.stage_slas[ps.key] !== undefined) days = Number(job.stage_slas[ps.key]) || ps.defaultDays;
      else if (job.stage_slas[ps.shortName] !== undefined) days = Number(job.stage_slas[ps.shortName]) || ps.defaultDays;
    }
    total += days;
  });
  return total;
}

// System Personas / RBAC Users (Section 4 PRD)
export const PERSONAS = [
  {
    id: 'rh_admin',
    name: 'Gestora de RH',
    email: 'gestora.rh@plurix.com.br',
    role: 'GESTORA_RH',
    department: 'RH',
    description: 'Acesso global administrativo; cria vagas, atribui recrutadoras, visualiza posições confidenciais.'
  },
  {
    id: 'bp_comercial',
    name: 'BP Comercial (Mariana Costa)',
    email: 'bp.comercial@plurix.com.br',
    role: 'BP',
    department: 'Comercial',
    description: 'Business Partner da diretoria Comercial. Pode abrir vagas, definir confidencialidade e autoatribuir-se.'
  },
  {
    id: 'bp_digital',
    name: 'BP Digital (Carlos Eduardo)',
    email: 'bp.digital@plurix.com.br',
    role: 'BP',
    department: 'Digital',
    description: 'Business Partner da diretoria Digital.'
  },
  {
    id: 'rec_fatima',
    name: 'Fatima (Recrutadora)',
    email: 'fatima@plurix.com.br',
    role: 'RECRUTADOR',
    department: 'RH',
    description: 'Recrutadora Operacional. Conduz candidaturas das vagas atribuídas.'
  },
  {
    id: 'rec_julia',
    name: 'Julia (Recrutadora)',
    email: 'julia@plurix.com.br',
    role: 'RECRUTADOR',
    department: 'RH',
    description: 'Recrutadora Operacional.'
  },
  {
    id: 'rec_luana',
    name: 'Luana (Recrutadora)',
    email: 'luana@plurix.com.br',
    role: 'RECRUTADOR',
    department: 'RH',
    description: 'Recrutadora Operacional.'
  }
];

// -----------------------------------------------------------------------------
// Funil de Admissão & Onboarding (Etapas Oficiais)
// -----------------------------------------------------------------------------
export const ADMISSION_STAGES = [
  {
    step: 1,
    key: 'carta_oferta',
    name: 'Carta Oferta (Assinatura Gestor e Candidato)',
    shortName: 'Carta Oferta',
    defaultDays: 2,
    icon: 'file-text',
    description: 'Assinatura formal da carta oferta pelo gestor da vaga e pelo candidato aprovado.'
  },
  {
    step: 2,
    key: 'envio_link_admissao',
    name: 'Envio do Link de Admissão',
    shortName: 'Link de Admissão',
    defaultDays: 1,
    icon: 'link',
    description: 'Envio do link da plataforma de admissão digital para upload e validação de documentos.'
  },
  {
    step: 3,
    key: 'abertura_chamado_exame',
    name: 'Abertura Chamado Exame Admissão',
    shortName: 'Exame Admissional',
    defaultDays: 2,
    icon: 'activity',
    description: 'Abertura de chamado de saúde ocupacional, agendamento do exame clínico e emissão do ASO.'
  },
  {
    step: 4,
    key: 'carta_banco',
    name: 'Carta de Banco (Opcional)',
    shortName: 'Carta de Banco (Opcional)',
    defaultDays: 1,
    isOptional: true,
    icon: 'credit-card',
    description: 'Emissão de carta para abertura de conta salário (opcional se o candidato já possuir conta no banco conveniado).'
  },
  {
    step: 5,
    key: 'chamado_admissao',
    name: 'Chamado de Admissão',
    shortName: 'Chamado de Admissão',
    defaultDays: 2,
    icon: 'inbox',
    description: 'Abertura formal do chamado de admissão junto ao Departamento Pessoal (DP).'
  },
  {
    step: 6,
    key: 'email_confirmacao',
    name: 'E-mail de Confirmação',
    shortName: 'E-mail de Confirmação',
    defaultDays: 1,
    icon: 'mail',
    description: 'Envio de e-mail de confirmação ao novo colaborador com orientações de primeiro dia, local, horário e boas-vindas.'
  },
  {
    step: 7,
    key: 'formulario_acessos_glpi',
    name: 'Formulário de Acessos GLPI',
    shortName: 'Acessos GLPI (TI)',
    defaultDays: 2,
    icon: 'monitor',
    description: 'Abertura de chamado GLPI para TI (disponibilização de notebook, e-mail corporativo, crachá e acessos a sistemas).'
  },
  {
    step: 8,
    key: 'inserir_dados_planilha',
    name: 'Inserir Dados Planilha Admissão',
    shortName: 'Planilha Admissão',
    defaultDays: 1,
    icon: 'table',
    description: 'Lançamento do colaborador na planilha mestre de admissão e geração do número de matrícula.'
  },
  {
    step: 9,
    key: 'admissao_concluida',
    name: 'Admissão Concluída',
    shortName: 'Concluída',
    defaultDays: 0,
    icon: 'check-circle',
    description: 'Processo admissional 100% finalizado. Colaborador pronto e integrado à equipe.'
  }
];

export const ADMISSION_STAGE_NAMES = ADMISSION_STAGES.map(s => s.name);

export const DEFAULT_ADMISSION_SLAS = {
  'Carta Oferta (Assinatura Gestor e Candidato)': 2,
  'Envio do Link de Admissão': 1,
  'Abertura Chamado Exame Admissão': 2,
  'Carta de Banco (Opcional)': 1,
  'Chamado de Admissão': 2,
  'E-mail de Confirmação': 1,
  'Formulário de Acessos GLPI': 2,
  'Inserir Dados Planilha Admissão': 1,
  'Admissão Concluída': 0
};

export function getAdmissionStageSLALimit(stageName) {
  if (!stageName) return 2;
  if (DEFAULT_ADMISSION_SLAS[stageName] !== undefined) {
    return DEFAULT_ADMISSION_SLAS[stageName];
  }
  const matched = ADMISSION_STAGES.find(s => s.name === stageName || s.shortName === stageName || s.key === stageName);
  return matched ? matched.defaultDays : 2;
}

export const INITIAL_ADMISSION_CHECKLIST = {
  // 1. Carta Oferta
  oferta_gestor_assinado: false,
  oferta_gestor_data: null,
  oferta_candidato_assinado: false,
  oferta_candidato_data: null,
  oferta_anexo: null,

  // 2. Link de Admissão
  link_admissao_enviado: false,
  link_admissao_data: null,
  link_admissao_status: 'Pendente', // 'Pendente', 'Em Preenchimento', 'Documentos Enviados', 'Aprovado'

  // 3. Exame Admissão
  exame_protocolo: '',
  exame_clinica: '',
  exame_data: null,
  exame_aso_status: 'Pendente', // 'Pendente', 'Agendado', 'Apto', 'Inapto'

  // 4. Carta de Banco (Opcional)
  carta_banco_dispensada: false, // se já tem conta
  carta_banco_emitida: false,
  carta_banco_nome: '',

  // 5. Chamado de Admissão
  chamado_dp_numero: '',
  chamado_dp_responsavel: '',
  chamado_dp_status: 'Pendente', // 'Pendente', 'Aberto', 'Concluído'

  // 6. E-mail de Confirmação
  email_confirmacao_enviado: false,
  email_confirmacao_data: null,

  // 7. Formulário GLPI
  glpi_ticket_numero: '',
  glpi_solicitado_notebook: true,
  glpi_solicitado_email: true,
  glpi_solicitado_vpn: false,
  glpi_solicitado_cracha: true,
  glpi_status: 'Pendente', // 'Pendente', 'Aberto', 'Em Atendimento', 'Concluído'

  // 8. Planilha Admissão
  planilha_inserida: false,
  planilha_data: null,
  matricula_gerada: ''
};

