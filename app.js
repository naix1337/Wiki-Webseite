// API functions for backend communication
async function apiRequest(endpoint, options = {}) {
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Load content from backend
async function loadContent(section, path) {
  try {
    const docs = await apiRequest(`/${section}`);
    return docs.find(doc => doc.path === path);
  } catch (error) {
    console.error('Failed to load content:', error);
    return null;
  }
}

// Save document to backend
async function saveDocumentToBackend(section, document) {
  try {
    if (document.id) {
      // Update existing document
      return await apiRequest(`/${section}/${document.id}`, {
        method: 'PUT',
        body: JSON.stringify(document)
      });
    } else {
      // Create new document
      return await apiRequest(`/${section}`, {
        method: 'POST',
        body: JSON.stringify(document)
      });
    }
  } catch (error) {
    console.error('Failed to save document:', error);
    throw error;
  }
}

// Helper functions
function getUser() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('user');
  navigate('/');
  renderTabs();
  renderSidebar();
  showNotification('Erfolgreich abgemeldet!', 'success');
}

// Enhanced renderTabs with navigation buttons
function renderTabs() {
  const tabsContainer = document.querySelector('.tabs');
  const navButtonsContainer = document.getElementById('nav-buttons');
  const user = getUser();
  
  if (!tabsContainer || !navButtonsContainer) return;
  
  // Render main tabs
  const tabs = ['docs', 'guides', 'reference', 'faq', 'account'];
  tabsContainer.innerHTML = tabs.map(tab => {
    if (tab === 'account' && !user) return '';
    
    const isActive = state.activeTab === tab;
    const tabName = tab.charAt(0).toUpperCase() + tab.slice(1);
    
    return `
      <button class="tab ${isActive ? 'active' : ''}" onclick="switchTab('${tab}')">
        ${tabName === 'Faq' ? 'FAQ' : tabName}
      </button>
    `;
  }).join('');
  
  // Render navigation buttons
  if (user) {
    navButtonsContainer.innerHTML = `
      <span class="nav-btn secondary">Willkommen, ${user.name}</span>
      ${user.role === 'admin' ? '<button class="nav-btn" onclick="navigate(\'/account/admin\');">Admin</button>' : ''}
      ${user.role === 'editor' || user.role === 'admin' ? '<button class="nav-btn" onclick="navigate(\'/account/editor\');">Editor</button>' : ''}
      <button class="nav-btn" onclick="navigate('/account/profile')">Profil</button>
      <button class="nav-btn secondary" onclick="logout()">Logout</button>
    `;
  } else {
    navButtonsContainer.innerHTML = `
      <button class="nav-btn" onclick="navigate('/account/login')">Login</button>
      <button class="nav-btn secondary" onclick="navigate('/account/register')">Registrieren</button>
    `;
  }
}

// Switch tab
function switchTab(tab) {
  state.activeTab = tab;
  renderTabs();
  renderSidebar();
  
  // Navigate to first item in tab
  const firstItem = state.sidebar[tab][0];
  if (firstItem) {
    navigate(firstItem.path);
  }
}

// Render sidebar
function renderSidebar() {
  const sidebarContainer = document.querySelector('.sidebar');
  if (!sidebarContainer) return;
  
  const user = getUser();
  const items = state.sidebar[state.activeTab] || [];
  
  sidebarContainer.innerHTML = items.map(item => {
    // Check role permissions
    if (item.role && (!user || user.role !== item.role)) {
      return '';
    }
    
    const isActive = window.location.pathname === item.path;
    return `
      <a href="${item.path}" class="sidebar-item ${isActive ? 'active' : ''}" onclick="navigate('${item.path}'); return false;">
        ${item.title}
      </a>
    `;
  }).join('');
}

// Render content
async function renderContent(params) {
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  const path = window.location.pathname;
  let section = path.split('/')[1] || 'docs';
  let docPath = path;
  
  // Handle root path - default to first doc
  if (path === '/' || path === '/index.html') {
    section = 'docs';
    docPath = '/docs/getting-started';
  }
  
  // Show loading state
  contentContainer.innerHTML = '<div class="loading">Lade Inhalt...</div>';
  
  // Load content from backend
  const doc = await loadContent(section, docPath);
  
  if (!doc) {
    // Try to load the first document from the section
    try {
      const docs = await apiRequest(`/${section}`);
      if (docs && docs.length > 0) {
        const firstDoc = docs[0];
        // Update URL to match the first document
        window.history.replaceState(null, '', firstDoc.path);
        renderContent(); // Recursive call with updated path
        return;
      }
    } catch (error) {
      console.error('Failed to load fallback content:', error);
    }
    contentContainer.innerHTML = '<div class="error">Seite nicht gefunden</div>';
    return;
  }
  
  // Render markdown content
  const htmlContent = marked.parse(doc.content);
  const sanitizedContent = DOMPurify.sanitize(htmlContent);
  
  const user = getUser();
  const canEdit = user && (user.role === 'editor' || user.role === 'admin');
  
  contentContainer.innerHTML = `
    <div class="content-header">
      <h1>${doc.title}</h1>
      <div class="content-actions">
        ${canEdit ? `<button onclick="navigate('/editor?section=${section}&path=${encodeURIComponent(docPath)}')" class="btn btn-primary animate-btn">
          <i class="icon-edit"></i> Bearbeiten
        </button>` : ''}
        ${canEdit ? `<button onclick="createNewDocument('${section}')" class="btn btn-success animate-btn">
          <i class="icon-plus"></i> Neu erstellen
        </button>` : ''}
      </div>
    </div>
    <div class="content-body animate-fade-in">
      ${sanitizedContent}
    </div>
    <div class="content-meta">
      <small>Autor: ${doc.author} | Erstellt: ${new Date(doc.createdAt).toLocaleDateString('de-DE')}</small>
    </div>
  `;
  
  // Enhance code blocks
  enhanceCodeBlocks();
  
  // Style tables
  styleTables();
}

// Enhance code blocks
function enhanceCodeBlocks() {
  const codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    block.classList.add('hljs');
    
    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Kopieren';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(block.textContent);
      copyBtn.textContent = 'Kopiert!';
      setTimeout(() => copyBtn.textContent = 'Kopieren', 2000);
    };
    
    block.parentElement.style.position = 'relative';
    block.parentElement.appendChild(copyBtn);
  });
}

// Style tables
function styleTables() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    table.classList.add('styled-table');
    
    // Wrap table for responsive scrolling
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

// Authentication functions
function renderLogin() {
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="auth-container">
      <h2>Anmelden</h2>
      <form id="loginForm" class="auth-form">
        <div class="form-group">
          <label for="email">E-Mail:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Passwort:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" class="btn btn-primary">Anmelden</button>
        <p class="auth-link">
          Noch kein Konto? <a href="/account/register" onclick="navigate('/account/register'); return false;">Registrieren</a>
        </p>
      </form>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function renderRegister() {
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="auth-container">
      <h2>Registrieren</h2>
      <form id="registerForm" class="auth-form">
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="email">E-Mail:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Passwort:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" class="btn btn-primary">Registrieren</button>
        <p class="auth-link">
          Bereits ein Konto? <a href="/account/login" onclick="navigate('/account/login'); return false;">Anmelden</a>
        </p>
      </form>
    </div>
  `;
  
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

function renderSettings() {
  const user = getUser();
  if (!user) {
    navigate('/account/login');
    return;
  }
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="settings-container">
      <h2>Einstellungen</h2>
      <div class="settings-info">
        <p>Hier können Sie Ihre Kontoeinstellungen verwalten.</p>
      </div>
    </div>
  `;
}

function renderProfile() {
  const user = getUser();
  if (!user) {
    navigate('/account/login');
    return;
  }
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  // Generate a unique UID based on user ID or email
  const uid = user.id ? `#${user.id.toString().padStart(6, '0')}` : `#${user.email.split('@')[0].toUpperCase()}`;
  
  // Generate avatar initials
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Calculate member since date
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : 'Unbekannt';
  const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('de-DE') : 'Nie';
  
  // Role badge color
  const roleColors = {
    'admin': '#dc3545',
    'editor': '#28a745',
    'user': '#6c757d'
  };
  
  contentContainer.innerHTML = `
    <div class="profile-container animate-fade-in">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-circle" style="background: linear-gradient(135deg, ${roleColors[user.role] || '#6c757d'}, ${roleColors[user.role] || '#6c757d'}aa)">
            ${initials}
          </div>
          <div class="profile-status online"></div>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">${user.name}</h2>
          <p class="profile-uid">${uid}</p>
          <div class="profile-role">
            <span class="role-badge" style="background-color: ${roleColors[user.role] || '#6c757d'}">
              ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
        </div>
      </div>
      
      <div class="profile-stats">
        <div class="stat-item">
          <div class="stat-value">${memberSince}</div>
          <div class="stat-label">Mitglied seit</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${lastLogin}</div>
          <div class="stat-label">Letzter Login</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${user.active ? 'Aktiv' : 'Inaktiv'}</div>
          <div class="stat-label">Status</div>
        </div>
      </div>
      
      <div class="profile-details">
        <h3>Kontoinformationen</h3>
        <div class="detail-row">
          <span class="detail-label">E-Mail:</span>
          <span class="detail-value">${user.email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Benutzer-ID:</span>
          <span class="detail-value">${user.id || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Berechtigung:</span>
          <span class="detail-value">${user.role === 'admin' ? 'Administrator' : user.role === 'editor' ? 'Editor' : 'Benutzer'}</span>
        </div>
      </div>
      
      <div class="profile-actions">
        <button onclick="navigate('/account/settings')" class="btn btn-primary">
          <i class="icon-settings"></i> Einstellungen
        </button>
        <button onclick="logout()" class="btn btn-secondary">
          <i class="icon-logout"></i> Abmelden
        </button>
      </div>
    </div>
  `;
}

async function renderAdmin() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    navigate('/account/login');
    return;
  }
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  try {
    // Fetch all users from backend
    const users = await apiRequest('/users');
    
    contentContainer.innerHTML = `
      <div class="admin-container animate-fade-in">
        <h2>Admin-Panel</h2>
        
        <div class="admin-stats">
          <div class="stat-card">
            <div class="stat-number">${users.length}</div>
            <div class="stat-label">Benutzer gesamt</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${users.filter(u => u.active).length}</div>
            <div class="stat-label">Aktive Benutzer</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${users.filter(u => u.role === 'admin').length}</div>
            <div class="stat-label">Administratoren</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${users.filter(u => u.role === 'editor').length}</div>
            <div class="stat-label">Editoren</div>
          </div>
        </div>
        
        <div class="admin-section">
          <h3>Benutzerverwaltung</h3>
          <div class="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Erstellt</th>
                  <th>Letzter Login</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr class="${u.active ? '' : 'inactive'}">
                    <td>#${u.id}</td>
                    <td>
                      <div class="user-info">
                        <div class="user-avatar-small">
                          ${u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        ${u.name}
                      </div>
                    </td>
                    <td>${u.email}</td>
                    <td>
                      <select onchange="updateUserRole('${u.id}', this.value)" ${u.id === user.id ? 'disabled' : ''}>
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Benutzer</option>
                        <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                      </select>
                    </td>
                    <td>
                      <span class="status-badge ${u.active ? 'active' : 'inactive'}">
                        ${u.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td>${new Date(u.createdAt).toLocaleDateString('de-DE')}</td>
                    <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('de-DE') : 'Nie'}</td>
                    <td class="actions">
                      ${u.id !== user.id ? `
                        <button onclick="toggleUserStatus('${u.id}', ${!u.active})" 
                                class="btn btn-sm ${u.active ? 'btn-warning' : 'btn-success'}">
                          ${u.active ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                        <button onclick="deleteUser('${u.id}')" class="btn btn-sm btn-danger">
                          Löschen
                        </button>
                      ` : '<span class="text-muted">Eigenes Konto</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="admin-section">
          <h3>System-Aktionen</h3>
          <div class="admin-actions">
            <button onclick="navigate('/editor/new?section=docs&new=true')" class="btn btn-primary">
              Neues Dokument erstellen
            </button>
            <button onclick="exportData()" class="btn btn-secondary">
              Daten exportieren
            </button>
            <button onclick="showSystemInfo()" class="btn btn-info">
              System-Info
            </button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load admin panel:', error);
    contentContainer.innerHTML = `
      <div class="admin-container">
        <h2>Admin-Panel</h2>
        <div class="error-message">
          Fehler beim Laden der Admin-Daten. Bitte versuchen Sie es später erneut.
        </div>
      </div>
    `;
  }
}

function renderEditor() {
  const user = getUser();
  if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
    navigate('/account/login');
    return;
  }
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="editor-container animate-fade-in">
      <h2>Editor-Bereich</h2>
      <p>Willkommen im Editor-Bereich! Hier können Sie neue Inhalte erstellen und verwalten.</p>
      
      <div class="editor-actions">
        <div class="action-card">
          <h3>Neues Dokument</h3>
          <p>Erstellen Sie ein neues Dokument in der Dokumentation.</p>
          <button onclick="navigate('/editor/new?section=docs&new=true')" class="btn btn-primary">
            Dokument erstellen
          </button>
        </div>
        
        <div class="action-card">
          <h3>Neue Anleitung</h3>
          <p>Erstellen Sie eine neue Anleitung für Benutzer.</p>
          <button onclick="navigate('/editor/new?section=guides&new=true')" class="btn btn-primary">
            Anleitung erstellen
          </button>
        </div>
        
        <div class="action-card">
          <h3>FAQ-Eintrag</h3>
          <p>Fügen Sie einen neuen FAQ-Eintrag hinzu.</p>
          <button onclick="navigate('/editor/new?section=faq&new=true')" class="btn btn-primary">
            FAQ erstellen
          </button>
        </div>
      </div>
      
      <div class="editor-info">
        <h3>Editor-Berechtigung</h3>
        <p>Als Editor haben Sie folgende Möglichkeiten:</p>
        <ul>
          <li>Neue Dokumente, Anleitungen und FAQ-Einträge erstellen</li>
          <li>Bestehende Inhalte bearbeiten</li>
          <li>Markdown-Formatierung verwenden</li>
          <li>Inhalte in verschiedenen Kategorien organisieren</li>
        </ul>
      </div>
    </div>
  `;
}

// Create new document function
function createNewDocument(section) {
  navigate(`/editor?section=${section}&new=true`);
}

// Authentication functions with backend integration
async function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = formData.get('email');
  const password = formData.get('password');
  
  try {
    // Get users from backend
    const users = await apiRequest('/users');
    const user = users.find(u => u.email === email && u.password === password && u.active);
    
    if (user) {
      // Update last login
      await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lastLogin: new Date().toISOString() })
      });
      
      // Store user without password
      const { password: _, ...userWithoutPassword } = user;
      setUser(userWithoutPassword);
      
      navigate('/account/profile');
      renderTabs();
      renderSidebar();
      
      showNotification('Erfolgreich angemeldet!', 'success');
    } else {
      showNotification('Ungültige Anmeldedaten!', 'error');
    }
  } catch (error) {
    console.error('Login failed:', error);
    showNotification('Anmeldung fehlgeschlagen!', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');
  
  try {
    // Check if user already exists
    const users = await apiRequest('/users');
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      showNotification('E-Mail bereits registriert!', 'error');
      return;
    }
    
    // Create new user
    const newUser = {
      name,
      email,
      password,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      active: true
    };
    
    const createdUser = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(newUser)
    });
    
    // Store user without password
    const { password: _, ...userWithoutPassword } = createdUser;
    setUser(userWithoutPassword);
    
    navigate('/account/profile');
    renderTabs();
    renderSidebar();
    
    showNotification('Erfolgreich registriert!', 'success');
  } catch (error) {
    console.error('Registration failed:', error);
    showNotification('Registrierung fehlgeschlagen!', 'error');
  }
}

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type} animate-slide-in`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('animate-slide-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Admin panel functions
async function renderAdmin() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    navigate('/account/login');
    return;
  }
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = '<div class="loading">Lade Admin-Panel...</div>';
  
  try {
    const users = await apiRequest('/users');
    
    contentContainer.innerHTML = `
      <div class="admin-container">
        <h2>Admin-Panel</h2>
        <div class="admin-stats">
          <div class="stat-card animate-fade-in">
            <h3>${users.length}</h3>
            <p>Benutzer gesamt</p>
          </div>
          <div class="stat-card animate-fade-in">
            <h3>${users.filter(u => u.active).length}</h3>
            <p>Aktive Benutzer</p>
          </div>
          <div class="stat-card animate-fade-in">
            <h3>${users.filter(u => u.role === 'admin').length}</h3>
            <p>Administratoren</p>
          </div>
        </div>
        
        <div class="users-management">
          <h3>Benutzerverwaltung</h3>
          <div class="users-table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Letzter Login</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr class="animate-fade-in">
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>
                      <select onchange="updateUserRole(${u.id}, this.value)" class="role-select">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                      </select>
                    </td>
                    <td>
                      <span class="status-badge ${u.active ? 'active' : 'inactive'}">
                        ${u.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td>${new Date(u.lastLogin).toLocaleDateString('de-DE')}</td>
                    <td>
                      <button onclick="toggleUserStatus(${u.id}, ${!u.active})" class="btn btn-sm ${u.active ? 'btn-warning' : 'btn-success'} animate-btn">
                        ${u.active ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                      ${u.id !== user.id ? `<button onclick="deleteUser(${u.id})" class="btn btn-sm btn-danger animate-btn">Löschen</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load admin panel:', error);
    contentContainer.innerHTML = '<div class="error">Fehler beim Laden des Admin-Panels</div>';
  }
}

// Admin functions
async function updateUserRole(userId, newRole) {
  try {
    await apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole })
    });
    showNotification('Benutzerrolle aktualisiert!', 'success');
  } catch (error) {
    console.error('Failed to update user role:', error);
    showNotification('Fehler beim Aktualisieren der Rolle!', 'error');
  }
}

async function toggleUserStatus(userId, active) {
  try {
    await apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
    showNotification(`Benutzer ${active ? 'aktiviert' : 'deaktiviert'}!`, 'success');
    renderAdmin(); // Refresh the admin panel
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    showNotification('Fehler beim Ändern des Status!', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
    return;
  }
  
  try {
    await apiRequest(`/users/${userId}`, {
      method: 'DELETE'
    });
    showNotification('Benutzer gelöscht!', 'success');
    renderAdmin(); // Refresh the admin panel
  } catch (error) {
    console.error('Failed to delete user:', error);
    showNotification('Fehler beim Löschen des Benutzers!', 'error');
  }
}

// Old authentication functions removed - replaced with backend-integrated versions above

// Enhanced renderContentEditor with create new functionality
function renderContentEditor(params) {
  const user = getUser();
  if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
    navigate('/account/login');
    return;
  }
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const section = urlParams.get('section') || 'docs';
  const path = urlParams.get('path') || '';
  const isNew = urlParams.get('new') === 'true';
  
  let title = '';
  let content = '';
  let docPath = '';
  
  // If editing existing document
  if (path && !isNew) {
    docPath = path;
    
    // Find document in sidebar
    const doc = state.sidebar[section].find(d => d.path === path);
    if (doc) {
      title = doc.title;
    }
    
    // Check if we have content in state.documents
    if (state.documents[section] && state.documents[section][path]) {
      content = state.documents[section][path].content;
    } else {
      // In a real app, we would fetch content from server
      content = `# ${title}\n\nInhalt hier eingeben...`;
    }
  } else {
    // New document
    title = '';
    content = '# Neues Dokument\n\nInhalt hier eingeben...';
  }
  
  // Update current document state
  state.currentDocument = {
    section,
    path: docPath,
    title,
    content,
    isNew
  };
  
  const contentContainer = document.querySelector('.content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="document-editor animate-fade-in">
      <h2>${isNew ? 'Neues Dokument erstellen' : 'Dokument bearbeiten'}</h2>
      
      <form id="editor-form">
        <div class="row">
          <label for="doc-title">Titel:</label>
          <input type="text" id="doc-title" value="${escapeHtml(title)}" placeholder="Dokumenttitel eingeben" required>
        </div>
        
        <div class="row">
          <label for="doc-section">Bereich:</label>
          <select id="doc-section" ${!isNew ? 'disabled' : ''}>
            <option value="docs" ${section === 'docs' ? 'selected' : ''}>Dokumentation</option>
            <option value="guides" ${section === 'guides' ? 'selected' : ''}>Anleitungen</option>
            <option value="faq" ${section === 'faq' ? 'selected' : ''}>FAQ</option>
          </select>
        </div>
        
        <div class="row">
          <label for="doc-content">Inhalt (Markdown):</label>
          <textarea id="doc-content" placeholder="Markdown-Inhalt hier eingeben...">${escapeHtml(content)}</textarea>
        </div>
        
        <div class="editor-actions">
          <button type="submit" class="btn btn-primary animate-btn">
            ${isNew ? 'Dokument erstellen' : 'Änderungen speichern'}
          </button>
          <button type="button" class="btn btn-secondary animate-btn" onclick="history.back()">
            Abbrechen
          </button>
          <button type="button" class="btn btn-success animate-btn" onclick="previewDocument()">
            Vorschau
          </button>
        </div>
      </form>
      
      <div id="preview-container" style="display: none;">
        <h3>Vorschau:</h3>
        <div id="preview-content" class="content-preview"></div>
      </div>
    </div>
  `;
  
  // Add form submit handler
  document.getElementById('editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveDocument();
  });
}

// Preview function for editor
function previewDocument() {
  const content = document.getElementById('doc-content').value;
  const previewContainer = document.getElementById('preview-container');
  const previewContent = document.getElementById('preview-content');
  
  if (previewContainer.style.display === 'none') {
    previewContent.innerHTML = marked.parse(content);
    previewContainer.style.display = 'block';
    previewContainer.classList.add('animate-fade-in');
  } else {
    previewContainer.style.display = 'none';
  }
}

// Enhanced save document function with backend integration
async function saveDocument() {
  const title = document.getElementById('doc-title').value.trim();
  const section = document.getElementById('doc-section').value;
  const content = document.getElementById('doc-content').value.trim();
  
  if (!title || !content) {
    showNotification('Bitte füllen Sie alle Felder aus!', 'error');
    return;
  }
  
  try {
    const user = getUser();
    const document = {
      title,
      content,
      author: user.name,
      authorId: user.id,
      createdAt: state.currentDocument.isNew ? new Date().toISOString() : state.currentDocument.createdAt,
      updatedAt: new Date().toISOString(),
      section
    };
    
    let savedDoc;
    if (state.currentDocument.isNew) {
      // Create new document
      savedDoc = await saveDocumentToBackend(section, document);
      
      // Add to sidebar
      const newPath = `/${section}/${savedDoc.id}`;
      state.sidebar[section].push({
        title: savedDoc.title,
        path: newPath
      });
    } else {
      // Update existing document
      savedDoc = await apiRequest(`/${section}/${state.currentDocument.path.split('/').pop()}`, {
        method: 'PATCH',
        body: JSON.stringify(document)
      });
    }
    
    // Update local state
    const docPath = state.currentDocument.isNew ? `/${section}/${savedDoc.id}` : state.currentDocument.path;
    if (!state.documents[section]) {
      state.documents[section] = {};
    }
    state.documents[section][docPath] = savedDoc;
    
    showNotification(
      state.currentDocument.isNew ? 'Dokument erfolgreich erstellt!' : 'Dokument erfolgreich gespeichert!',
      'success'
    );
    
    // Navigate to the document
    navigate(docPath);
    renderSidebar();
    
  } catch (error) {
    console.error('Save failed:', error);
    showNotification('Fehler beim Speichern des Dokuments!', 'error');
  }
}

// App state
const state = {
  activeTab: 'docs',
  sidebar: {
    docs: [
      { title: 'Getting Started', path: '/docs/getting-started' },
      { title: 'Installation', path: '/docs/installation' },
      { title: 'Configuration', path: '/docs/configuration' },
      { title: 'Deployment', path: '/docs/deployment' },
    ],
    guides: [
      { title: 'Basic Usage', path: '/guides/basic-usage' },
      { title: 'Advanced Features', path: '/guides/advanced-features' },
      { title: 'Troubleshooting', path: '/guides/troubleshooting' },
    ],
    reference: [
      { title: 'API Reference', path: '/reference/api' },
      { title: 'CLI Commands', path: '/reference/cli' },
      { title: 'Configuration Options', path: '/reference/config' },
    ],
    faq: [
      { title: 'Common Issues', path: '/faq/common-issues' },
      { title: 'Performance', path: '/faq/performance' },
      { title: 'Security', path: '/faq/security' },
    ],
    account: [
      { title: 'Profile', path: '/account/profile' },
      { title: 'Settings', path: '/account/settings' },
      { title: 'Admin', path: '/account/admin', role: 'admin' },
      { title: 'Editor', path: '/account/editor', role: 'editor' },
    ]
  },
  documents: {
    docs: {},
    guides: {},
    faq: {}
  },
  currentDocument: {
    section: '',
    path: '',
    title: '',
    content: '',
    isNew: true
  },
  routes: {
    '/': renderContent,
    '/docs/getting-started': renderContent,
    '/docs/installation': renderContent,
    '/docs/configuration': renderContent,
    '/docs/deployment': renderContent,
    '/guides/basic-usage': renderContent,
    '/guides/advanced-features': renderContent,
    '/guides/troubleshooting': renderContent,
    '/reference/api': renderContent,
    '/reference/cli': renderContent,
    '/reference/config': renderContent,
    '/faq/common-issues': renderContent,
    '/faq/performance': renderContent,
    '/faq/security': renderContent,
    '/account/profile': renderProfile,
    '/account/settings': renderSettings,
    '/account/admin': renderAdmin,
    '/account/editor': renderEditor,
    '/account/login': renderLogin,
    '/account/register': renderRegister,
    '/editor/new': renderContentEditor,
    '/editor/edit': renderContentEditor,
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup navigation
  window.navigate = (path, params = {}) => {
    const route = state.routes[path];
    if (route) {
      history.pushState(null, '', path);
      route(params);
      renderSidebar();
    } else {
      console.error(`Route not found: ${path}`);
    }
  };
  
  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    const path = window.location.pathname;
    const route = state.routes[path];
    if (route) {
      route();
      renderSidebar();
    }
  });
  
  // Initial render
  renderTabs();
  renderSidebar();
  
  const path = window.location.pathname;
  const route = state.routes[path] || state.routes['/'];
  route();
});


