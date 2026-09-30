// =============================================================================
// ATS PLURIX 360° | Componente Tela de Login & Gestão de Acesso RBAC
// =============================================================================

import { PERSONAS } from '../db/schema.js';
import { authService } from '../services/authService.js';

export function renderLoginScreen(onLoginSuccess) {
  const container = document.getElementById('login-screen-container');
  if (!container) return;

  const currentSelectedPersonaId = authService.getPersona()?.id || PERSONAS[0].id;

  container.innerHTML = `
    <div class="login-backdrop">
      <div class="login-card-container">
        
        <!-- Painel Esquerdo: Branding & Governança de R&S -->
        <div class="login-branding-panel">
          <div class="login-brand-header">
            <div class="login-logo-badge">ATS</div>
            <h1 class="login-brand-title">PLURIX 360°</h1>
          </div>
          <p class="login-brand-subtitle">MVP 1 • Operação e Governança de R&S</p>

          <div class="login-features-list">
            <div class="login-feature-item">
              <div class="feature-icon">🛡️</div>
              <div>
                <strong class="feature-title">Governança de Acesso RBAC (RN-07)</strong>
                <p class="feature-desc">Isolamento rigoroso de vagas confidenciais por diretoria e recrutadora atribuída.</p>
              </div>
            </div>

            <div class="login-feature-item">
              <div class="feature-icon">⚡</div>
              <div>
                <strong class="feature-title">Auditoria Imutável (RN-03)</strong>
                <p class="feature-desc">Histórico temporal INSERT-Only gravado em stage_history a cada transição de etapa.</p>
              </div>
            </div>

            <div class="login-feature-item">
              <div class="feature-icon">⏱️</div>
              <div>
                <strong class="feature-title">Matriz de SLAs por Função (RN-08)</strong>
                <p class="feature-desc">Apuração automática de prazos por nível de cargo e etapa do funil.</p>
              </div>
            </div>
          </div>

          <div class="login-footer-info">
            <span>Servidor: Supabase PostgreSQL / Local Engine</span>
            <span>Versão 1.0.4</span>
          </div>
        </div>

        <!-- Painel Direito: Formulário de Login & Rápido Acesso -->
        <div class="login-form-panel">
          <div class="login-form-header">
            <h2>Portal de Autenticação</h2>
            <p>Selecione um perfil de acesso ou insira suas credenciais institucionais.</p>
          </div>

          <!-- Alert de Erro de Autenticação -->
          <div id="login-error-alert" class="login-error-alert" style="display: none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="login-error-message">Credenciais inválidas.</span>
          </div>

          <!-- Seleção Rápida por Persona (Demo RBAC) -->
          <div class="login-persona-section">
            <div class="persona-section-title">
              <span>Rápido Acesso por Perfil (Simulação Demo):</span>
            </div>
            <div class="login-persona-grid">
              ${PERSONAS.map(p => {
                const isSelected = p.id === currentSelectedPersonaId;
                const roleColorClass = p.role === 'GESTORA_RH' ? 'role-rh' : p.role === 'BP' ? 'role-bp' : 'role-rec';
                return `
                  <button type="button" class="login-persona-card ${isSelected ? 'active' : ''}" data-persona-id="${p.id}">
                    <div class="persona-card-header">
                      <span class="persona-avatar-circle">${p.name.charAt(0)}</span>
                      <span class="persona-role-pill ${roleColorClass}">${p.role}</span>
                    </div>
                    <div class="persona-card-body">
                      <div class="persona-card-name">${p.name}</div>
                      <div class="persona-card-dept">${p.department}</div>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Formulário de Login Tradicional -->
          <form id="form-login-ats" class="login-form">
            <div class="form-group">
              <label for="login-email" class="required">E-mail Institucional</label>
              <div class="input-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input type="email" id="login-email" required placeholder="seu.email@plurix.com.br" value="${PERSONAS[0].email}" />
              </div>
            </div>

            <div class="form-group">
              <label for="login-password" class="required">Senha de Acesso</label>
              <div class="input-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type="password" id="login-password" required placeholder="••••••••" value="123456" />
                <button type="button" id="btn-toggle-password" class="btn-toggle-pw" title="Mostrar/Ocultar Senha">
                  <svg id="pw-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg id="pw-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>

            <div class="login-options-row">
              <label class="checkbox-label">
                <input type="checkbox" id="login-remember" checked />
                <span>Manter conectado nesta sessão</span>
              </label>
              <a href="#" id="link-forgot-pw" class="forgot-link" onclick="event.preventDefault(); alert('Em caso de perda de credenciais, entre em contato com a equipe de Governança de RH (gestora.rh@plurix.com.br).');">Esqueceu a senha?</a>
            </div>

            <!-- Resumo das Permissões do Perfil Selecionado -->
            <div id="login-privilege-box" class="login-privilege-box">
              <!-- Rendered dynamically -->
            </div>

            <button type="submit" class="btn btn-primary btn-login-submit">
              <span>Acessar Painel Plurix 360°</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </form>

        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const form = document.getElementById('form-login-ats');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const rememberCheckbox = document.getElementById('login-remember');
  const errorAlert = document.getElementById('login-error-alert');
  const errorMessage = document.getElementById('login-error-message');
  const privilegeBox = document.getElementById('login-privilege-box');
  const togglePwBtn = document.getElementById('btn-toggle-password');
  const pwIconShow = document.getElementById('pw-icon-show');
  const pwIconHide = document.getElementById('pw-icon-hide');

  // Helper to update privilege box
  const updatePrivilegeDisplay = (email) => {
    const foundPersona = PERSONAS.find(p => p.email.toLowerCase() === (email || '').trim().toLowerCase());
    const persona = foundPersona || authService.getPersona();
    const privileges = authService.getRolePrivileges(persona.role);

    privilegeBox.innerHTML = `
      <div class="privilege-header">
        <span class="privilege-badge">${persona.role}</span>
        <strong>${privileges.title}</strong>
      </div>
      <p class="privilege-desc">${privileges.description}</p>
      <div class="privilege-tags">
        ${privileges.badges.map(b => `<span class="privilege-tag">✓ ${b}</span>`).join('')}
      </div>
    `;
  };

  // Set initial selected persona email & password
  const initialPersona = PERSONAS.find(p => p.id === currentSelectedPersonaId) || PERSONAS[0];
  emailInput.value = initialPersona.email;
  updatePrivilegeDisplay(initialPersona.email);

  // Persona card clicks
  const personaCards = container.querySelectorAll('.login-persona-card');
  personaCards.forEach(card => {
    card.addEventListener('click', () => {
      const personaId = card.getAttribute('data-persona-id');
      const p = PERSONAS.find(item => item.id === personaId);
      if (p) {
        personaCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        emailInput.value = p.email;
        passwordInput.value = '123456';
        updatePrivilegeDisplay(p.email);
        errorAlert.style.display = 'none';

        // Auto login on persona click
        const result = authService.loginAsPersona(p.id, rememberCheckbox.checked);
        if (result.success && onLoginSuccess) {
          onLoginSuccess();
        }
      }
    });
  });

  // Email input change listener
  emailInput.addEventListener('input', (e) => {
    updatePrivilegeDisplay(e.target.value);
  });

  // Toggle password visibility
  togglePwBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      pwIconShow.style.display = 'none';
      pwIconHide.style.display = 'inline-block';
    } else {
      passwordInput.type = 'password';
      pwIconShow.style.display = 'inline-block';
      pwIconHide.style.display = 'none';
    }
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;

    const result = authService.login(email, password, remember);
    if (result.success) {
      errorAlert.style.display = 'none';
      if (onLoginSuccess) onLoginSuccess();
    } else {
      errorMessage.textContent = result.error || 'Falha ao realizar login.';
      errorAlert.style.display = 'flex';
    }
  });
}
