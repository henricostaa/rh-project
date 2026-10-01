// =============================================================================
// ATS PLURIX 360° | Serviço de Autenticação e RBAC (Section 4 & RN-04 a RN-07)
// =============================================================================

import { PERSONAS } from '../db/schema.js';

const SESSION_KEY = 'ats_plurix_session_v1';

class AuthService {
  constructor() {
    this.currentPersona = PERSONAS[0]; // Default: Gestora de RH
    this.isLoggedIn = false;
    this.listeners = [];
    this.initSession();
  }

  initSession() {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.personaId && parsed.isLoggedIn) {
          const found = PERSONAS.find(p => p.id === parsed.personaId);
          if (found) {
            this.currentPersona = found;
            this.isLoggedIn = true;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão de login:', e);
    }
    // Padrão: deslogado para exibir a tela de login inicial
    this.isLoggedIn = false;
  }

  saveSession(remember = true) {
    try {
      if (remember && this.isLoggedIn) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          personaId: this.currentPersona.id,
          isLoggedIn: true
        }));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
    }
  }

  isAuthenticated() {
    return this.isLoggedIn;
  }

  getPersona() {
    return this.currentPersona;
  }

  setPersona(personaId) {
    const found = PERSONAS.find(p => p.id === personaId);
    if (found) {
      this.currentPersona = found;
      this.isLoggedIn = true;
      this.saveSession(true);
      this.notify();
    }
  }

  login(email, password, remember = true) {
    if (!email || !email.trim()) {
      return { success: false, error: 'Por favor, informe seu e-mail institucional.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const found = PERSONAS.find(p => p.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { 
        success: false, 
        error: `E-mail "${email}" não possui cadastro ou nível de acesso no ATS.` 
      };
    }

    if (!password) {
      return { success: false, error: 'Por favor, digite sua senha de acesso.' };
    }

    this.currentPersona = found;
    this.isLoggedIn = true;
    this.saveSession(remember);
    this.notify();

    return { success: true, persona: found };
  }

  loginAsPersona(personaId, remember = true) {
    const found = PERSONAS.find(p => p.id === personaId);
    if (found) {
      this.currentPersona = found;
      this.isLoggedIn = true;
      this.saveSession(remember);
      this.notify();
      return { success: true, persona: found };
    }
    return { success: false, error: 'Perfil não encontrado.' };
  }

  logout() {
    this.isLoggedIn = false;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Erro ao remover sessão:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.currentPersona, this.isLoggedIn));
  }

  getRolePrivileges(role) {
    switch (role) {
      case 'GESTORA_RH':
        return {
          title: 'Gestão Global de RH (Acesso Total)',
          badges: ['Acesso Total', 'Vagas Confidenciais', 'Atribuição de Recrutadoras', 'Alteração Global'],
          description: 'Acesso total e irrestrito a todas as vagas (inclusive confidenciais), atribuição de recrutadoras, alteração de etapas e relatórios consolidados de SLA.'
        };
      case 'BP':
        return {
          title: 'Business Partner de Diretoria (BP)',
          badges: ['Abertura de Vagas', 'Vagas Confidenciais da Diretoria', 'Autoatribuição Operacional'],
          description: 'Pode abrir novas vagas para a sua diretoria, marcar requisições como confidenciais (RN-07) e autoatribuir-se como recrutador responsável (RN-06).'
        };
      case 'RECRUTADOR':
        return {
          title: 'Recrutadora Operacional (R&S)',
          badges: ['Condução de Candidaturas', 'Parecer Técnico', 'Transição de Etapas'],
          description: 'Conduz candidaturas e vagas atribuídas ao seu e-mail. Registra pareceres técnicos imutáveis e faz o avanço de etapas no pipeline de R&S.'
        };
      default:
        return {
          title: 'Usuário do Sistema',
          badges: ['Consulta'],
          description: 'Visualização de indicadores e vagas públicas do sistema.'
        };
    }
  }

  // ---------------------------------------------------------------------------
  // Matriz de Acesso RBAC (Section 4.2 PRD)
  // ---------------------------------------------------------------------------

  // CA-01 & RN-04: Somente BPs e Gestora de RH podem abrir vagas
  canCreateJob() {
    return ['GESTORA_RH', 'BP'].includes(this.currentPersona.role);
  }

  // RN-05: Somente Gestora de RH ou BP titular pode definir recruiter_email
  canAssignRecruiter(job) {
    if (this.currentPersona.role === 'GESTORA_RH') return true;
    if (this.currentPersona.role === 'BP') {
      return job.bp_in_charge_email === this.currentPersona.email;
    }
    return false;
  }

  // RN-07: Isolamento de Vagas Confidenciais
  // Vagas confidenciais ficam invisíveis para recrutadoras não vinculadas e BPs de outras diretorias.
  // Acesso apenas à BP titular, recrutadora atribuída e Gestora de RH.
  canViewJob(job) {
    if (!job) return false;
    
    // Gestora de RH tem acesso global
    if (this.currentPersona.role === 'GESTORA_RH') return true;

    // Se a vaga é confidencial (RN-07)
    if (job.is_confidential) {
      if (this.currentPersona.role === 'BP' && job.bp_in_charge_email === this.currentPersona.email) {
        return true;
      }
      if (job.recruiter_email === this.currentPersona.email) {
        return true;
      }
      return false; // Bloqueado para todos os outros!
    }

    // Se a vaga é regular:
    if (this.currentPersona.role === 'BP') {
      // BP vê vagas de sua diretoria e vagas gerais públicas
      return true;
    }

    if (this.currentPersona.role === 'RECRUTADOR') {
      // Recrutadora vê vagas regulares
      return true;
    }

    return true;
  }

  // RN-06 & Matriz CRUD: Movimentar candidaturas / Inserir parecer técnico
  canMoveApplication(application, job) {
    if (!application || !job) return false;

    // Gestora de RH pode movimentar qualquer candidatura
    if (this.currentPersona.role === 'GESTORA_RH') return true;

    // Se a vaga não tem recrutadora atribuída, ninguém além da Gestora RH move
    if (!job.recruiter_email) return false;

    // Se a pessoa logada é a recrutadora atribuída à vaga (ou BP em Duplo Papel - RN-06)
    if (job.recruiter_email === this.currentPersona.email) {
      return true;
    }

    return false;
  }

  // Permissão para alterar status de vagas (Funil de Vagas)
  canEditJobStatus(job) {
    if (!job) return false;

    // Gestora de RH pode alterar qualquer vaga
    if (this.currentPersona.role === 'GESTORA_RH') return true;

    // BP responsável pela vaga pode alterar o status
    if (this.currentPersona.role === 'BP' && job.bp_in_charge_email === this.currentPersona.email) {
      return true;
    }

    // Recrutadora atribuída à vaga pode alterar o status
    if (job.recruiter_email === this.currentPersona.email) {
      return true;
    }

    return false;
  }

  // Permissão para excluir candidatura (vaga x candidato)
  canDeleteApplication(application, job) {
    if (!application) return false;
    if (this.currentPersona.role === 'GESTORA_RH') return true;
    if (!job) return true;

    if (this.currentPersona.role === 'BP') {
      return job.bp_in_charge_email === this.currentPersona.email || this.canCreateJob();
    }

    if (job.recruiter_email === this.currentPersona.email) {
      return true;
    }

    return false;
  }

  // Permissão para excluir candidato globalmente
  canDeleteCandidate() {
    return ['GESTORA_RH', 'BP'].includes(this.currentPersona.role);
  }

  // Permissão para excluir vaga
  canDeleteJob(job) {
    if (!job) return false;
    if (this.currentPersona.role === 'GESTORA_RH') return true;
    if (this.currentPersona.role === 'BP' && job.bp_in_charge_email === this.currentPersona.email) {
      return true;
    }
    return false;
  }
}

export const authService = new AuthService();

