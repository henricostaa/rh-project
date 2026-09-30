// =============================================================================
// ATS PLURIX 360° | Componente Topbar & Simulador RBAC
// =============================================================================

import { PERSONAS } from '../db/schema.js';
import { authService } from '../services/authService.js';
import { store } from '../db/store.js';

export function renderTopbar(onStateChange) {
  const selectEl = document.getElementById('user-persona-select');
  const badgeEl = document.getElementById('persona-badge');
  const userNameEl = document.getElementById('current-user-name');
  const userRoleEl = document.getElementById('current-user-role');
  const resetBtn = document.getElementById('btn-reset-db');
  const logoutBtn = document.getElementById('btn-logout');
  const sidebarUserCard = document.getElementById('sidebar-user-card');

  if (!selectEl || !badgeEl) return;

  // Populate persona dropdown
  selectEl.innerHTML = PERSONAS.map(p => `
    <option value="${p.id}" ${p.id === authService.getPersona().id ? 'selected' : ''}>
      ${p.name} (${p.role}) - ${p.department}
    </option>
  `).join('');

  const updatePersonaDisplay = () => {
    const persona = authService.getPersona();
    badgeEl.textContent = `${persona.role} • ${persona.department}`;
    if (userNameEl) userNameEl.textContent = persona.name;
    if (userRoleEl) userRoleEl.textContent = persona.role === 'GESTORA_RH' ? 'GESTORA RH' : persona.role;

    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserRole = document.getElementById('sidebar-user-role');
    if (sidebarUserName) sidebarUserName.textContent = persona.name;
    if (sidebarUserRole) sidebarUserRole.textContent = persona.role === 'GESTORA_RH' ? 'GESTORA RH' : persona.role;
  };

  updatePersonaDisplay();

  selectEl.onchange = (e) => {
    authService.setPersona(e.target.value);
    updatePersonaDisplay();
    if (onStateChange) onStateChange();
  };

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Deseja restaurar todos os dados do banco para os padrões de fábrica do MVP?')) {
        store.reset();
        if (onStateChange) onStateChange();
      }
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      authService.logout();
      if (onStateChange) onStateChange();
    };
  }

  if (sidebarUserCard) {
    sidebarUserCard.onclick = () => {
      if (confirm(`Deseja sair da conta de ${authService.getPersona().name}?`)) {
        authService.logout();
        if (onStateChange) onStateChange();
      }
    };
  }
}
