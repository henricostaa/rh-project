// =============================================================================
// ATS PLURIX 360° | Dicionário de Domínios e Taxonomia Operacional (Section 5 & 6)
// =============================================================================

export const TAXONOMY = {
  workModels: [
    'Presencial',
    'Híbrido',
    'Remoto'
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

export const STAGE_SLA_MAP = {
  'Alinhamento de Perfil com Gestor + Publicação Vaga': 2,
  'Alinhamento': 2,
  'Triagem + Captação': 1,
  'Triagem': 1,
  'Aguardando Conexão / LinkedIn': 2,
  'Primeiro Contato': 1,
  'Validação do perfil mapeados para o Gestor': 7,
  'Validação Gestor': 7,
  'Aguardando Retorno': 1,
  'Entrevista RH': 3,
  'Entrevista R&S': 3,
  'Aguardando Entrevista': 3,
  'Entrevista Gestor + Teste': 1,
  'Entrevista Gestor': 1,
  'Teste': 1,
  'Formalização do candidato Gestor / Estudo de Remuneração': 1,
  'Remuneração': 1,
  'Oferta proposta ao candidato + Envio dos dados para admissão': 5,
  'Oferta': 5,
  'Contratado': 0
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

export function getStageSLA(stageName) {
  if (!stageName) return 4;
  if (STAGE_SLA_MAP[stageName] !== undefined) {
    return STAGE_SLA_MAP[stageName];
  }
  return 4;
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
