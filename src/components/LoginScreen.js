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
          <div class="login-brand-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <svg version="1.1" viewBox="0 0 1920 1080" style="height: 34px; width: auto;" aria-label="Plurix Logo Login">
              <g fill="#00147E">
                <path d="M564.2,371.8H626v331.7h-61.9V371.8z"/>
                <path d="M962.2,456.5v246.5h-61.4v-82c-17,50.2-56.9,87.4-116.1,87.4c-79.8,0-110.7-55.6-110.7-116.1V456.5h61.9v128.2c0,45.3,23.3,69.9,66.8,69.9c56.9,0,98.2-43.5,98.2-134v-64.1L962.2,456.5L962.2,456.5z"/>
                <path d="M1225.3,459.4c-13.8-4.2-30.5-6.9-47.6-6.9c-56.5,0-92.8,35-109.4,82v-78h-61.9v246.5h61.9v-68.1c0-82,39.4-129.1,104-129.1c22.4,0,40,5.2,52.9,11.3V459.4L1225.3,459.4z"/>
                <g><path d="M1269.6,456.5h61.9v246.5h-61.9V456.5L1269.6,456.5z"/><circle cx="1300.5" cy="406.3" r="35"/></g>
                <path d="M1554.4,601.7l24.4-22.5l120.1-123.3h-79.3l-83.8,86.4c-9.1-51.1-53.2-89.9-106.4-89.9c-18.9,0-36.8,3.6-53.3,10.1v60.3c15.7-9,33.9-14.2,53.3-14.2c37.7,0,70.8,19.5,90.2,49l-22.8,21.6l-120.6,123.3h79.8l82.9-86.3c8,52.4,52.8,92.6,106.8,92.6c18.9,0,36.8-3.6,53.3-10.1v-60.3c-15.7,9-33.9,14.2-53.3,14.2C1607.3,652.5,1573.6,632.2,1554.4,601.7L1554.4,601.7L1554.4,601.7z"/>
                <path d="M389.2,371.4H221.1v331.1h65.3V562.2c30.4,9,65.9,14.2,103.9,14.2c76.7,0.5,126.4-45.8,126.4-105.5S460.9,371.4,389.2,371.4L389.2,371.4z M440,505.1c-12.8,12.8-33.3,19.8-58,19.8h-0.8c-29.4,0-58-3.9-82.7-11.2l-12.1-4.6v-86h93.9c48.3,0,73.6,24.2,73.6,48.2C453.9,484.5,449.2,495.9,440,505.1L440,505.1L440,505.1z"/>
              </g>
            </svg>
            <span style="font-size: 13px; font-weight: 700; color: var(--bg-main-default); background: var(--bg-main-tertiary); padding: 2px 8px; border-radius: 4px;">360°</span>
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
                <p class="feature-desc">Histórico temporal gravado em stage_history a cada transição de etapa.</p>
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
