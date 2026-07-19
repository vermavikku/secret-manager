/**
 * Secrets Manager — Admin UI Client
 * Fetches secrets from the API with environment support, pagination and search.
 */

const API_BASE = '/api/secrets';

// ─── State ────────────────────────────────────────────────────────────────────

let secrets = [];
let revealedKeys = new Set();
let deleteTarget = null;
let deleteTargetEnv = null;
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let currentSearch = '';
let currentEnvironment = 'development';
let importPreviewData = [];

// ─── DOM References ───────────────────────────────────────────────────────────

const secretsTbody = document.getElementById('secrets-tbody');
const secretForm = document.getElementById('secret-form');
const secretKeyInput = document.getElementById('secret-key');
const secretValueInput = document.getElementById('secret-value');
const secretDescInput = document.getElementById('secret-description');
const addMessage = document.getElementById('add-message');
let dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const importMessage = document.getElementById('import-message');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const paginationInfo = document.getElementById('pagination-info');
const paginationControls = document.getElementById('pagination-controls');
const deleteModal = document.getElementById('delete-modal');
const deleteKeyName = document.getElementById('delete-key-name');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const editModal = document.getElementById('edit-modal');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');
const importPreviewModal = document.getElementById('import-preview-modal');
const importPreviewList = document.getElementById('import-preview-list');
const cancelImportPreviewBtn = document.getElementById('cancel-import-preview');
const confirmImportPreviewBtn = document.getElementById('confirm-import-preview');
const envToggle = document.getElementById('env-toggle');

// ─── Environment Toggle ───────────────────────────────────────────────────────

if (envToggle) {
  envToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.env-btn');
    if (!btn) return;

    const env = btn.dataset.env;
    if (env === currentEnvironment) return;

    // Update active state
    envToggle.querySelectorAll('.env-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    currentEnvironment = env;

    // Reload secrets for the new environment
    currentPage = 1;
    loadSecrets(1, currentSearch);
  });
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 401) {
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Render Pagination ────────────────────────────────────────────────────────

function renderPagination(page, totalPages, total) {
  currentPage = page;
  totalPages = totalPages;
  totalItems = total;

  if (totalPages <= 1) {
    paginationControls.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;

  // Show pages with ellipsis
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-ellipsis">...</span>`;
    }
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  html += `<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>›</button>`;

  paginationControls.innerHTML = html;

  // Attach event listeners
  paginationControls.querySelectorAll('.page-btn:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pageNum = parseInt(btn.dataset.page);
      if (pageNum >= 1 && pageNum <= totalPages) {
        loadSecrets(pageNum, currentSearch);
      }
    });
  });
}

// ─── Toggle Reveal ────────────────────────────────────────────────────────────

function toggleReveal(key) {
  if (revealedKeys.has(key)) {
    revealedKeys.delete(key);
  } else {
    revealedKeys.add(key);
  }
  renderSecrets(secrets);
}

// ─── Render Secrets Table ─────────────────────────────────────────────────────

function renderSecrets(secretsToRender = secrets) {
  if (secretsToRender.length === 0) {
    secretsTbody.innerHTML = `
      <tr class="state-empty">
        <td colspan="6">No secrets found for ${currentEnvironment}</td>
      </tr>
    `;
    paginationInfo.textContent = 'Showing 0 secrets';
    paginationControls.innerHTML = '';
    return;
  }

  secretsTbody.innerHTML = secretsToRender
    .map((secret, idx) => {
      const isRevealed = revealedKeys.has(secret.key);
      const displayValue = isRevealed
        ? secret.value
        : '••••••••••••••••••••••••••';
      const updatedDate = new Date(secret.updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const globalIndex = (currentPage - 1) * 10 + idx + 1;

      return `
        <tr data-key="${escapeHtml(secret.key)}">
          <td class="row-num-cell">${globalIndex}</td>
          <td><span class="key-tag">${escapeHtml(secret.key)}</span></td>
          <td class="value-cell">
            <span class="masked-value">${escapeHtml(displayValue)}</span>
            <button class="btn-reveal ${isRevealed ? 'revealed' : ''}" data-key="${escapeHtml(secret.key)}">
              ${isRevealed ? '🙈 Hide' : '👁️ Reveal'}
            </button>
          </td>
          <td class="desc-cell" title="${escapeHtml(secret.description || '')}">${escapeHtml(secret.description || '—')}</td>
          <td class="date-cell">${updatedDate}</td>
          <td class="actions-cell">
            <button class="action-btn edit" data-key="${escapeHtml(secret.key)}" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn delete" data-key="${escapeHtml(secret.key)}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  // Update pagination info
  const start = totalItems === 0 ? 0 : (currentPage - 1) * 10 + 1;
  const end = Math.min(currentPage * 10, totalItems);
  paginationInfo.textContent = `Showing ${start} to ${end} of ${totalItems} secrets (${currentEnvironment})`;

  // Render pagination controls
  renderPagination(currentPage, totalPages, totalItems);
}

// ─── Load Secrets (with environment, pagination + search) ─────────────────────

async function loadSecrets(page = 1, search = '') {
  try {
    secretsTbody.innerHTML = `
      <tr class="state-loading">
        <td colspan="6">Loading secrets for ${currentEnvironment}...</td>
      </tr>
    `;

    const result = await apiFetch(`${API_BASE}?page=${page}&limit=10&search=${encodeURIComponent(search)}&environment=${currentEnvironment}`);
    
    if (result.success) {
      secrets = result.secrets || [];
      currentPage = result.page || 1;
      totalPages = result.totalPages || 1;
      totalItems = result.total || 0;
      currentSearch = search;
      renderSecrets(secrets);
    } else {
      throw new Error(result.error || 'Failed to load secrets');
    }
  } catch (err) {
    secretsTbody.innerHTML = `
      <tr class="state-error">
        <td colspan="6">Error: ${escapeHtml(err.message)}</td>
      </tr>
    `;
  }
}

// ─── Add / Update Secret ──────────────────────────────────────────────────────

secretForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const key = secretKeyInput.value.trim();
  const value = secretValueInput.value.trim();
  const description = secretDescInput.value.trim();

  if (!key || !value) return;

  addMessage.textContent = 'Saving...';
  addMessage.className = 'message info';

  try {
    await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify({ key, value, description, environment: currentEnvironment }),
    });

    addMessage.textContent = `✓ Secret "${key.toUpperCase()}" saved to ${currentEnvironment}!`;
    addMessage.className = 'message success';

    // Clear form
    secretKeyInput.value = '';
    secretValueInput.value = '';
    secretDescInput.value = '';

    // Reload table (preserve search and go to page 1)
    await loadSecrets(1, currentSearch);
  } catch (err) {
    addMessage.textContent = `✗ Error: ${err.message}`;
    addMessage.className = 'message error';
  }
});

// ─── Edit Secret Modal ────────────────────────────────────────────────────────

function openEditModal(key) {
  const secret = secrets.find((s) => s.key === key);
  if (!secret) return;

  document.getElementById('edit-key').value = secret.key;
  document.getElementById('edit-value').value = secret.value;
  document.getElementById('edit-description').value = secret.description || '';
  editModal.classList.add('active');
}

async function saveEdit() {
  const key = document.getElementById('edit-key').value;
  const value = document.getElementById('edit-value').value.trim();
  const description = document.getElementById('edit-description').value.trim();

  if (!value) {
    alert('Value is required');
    return;
  }

  try {
    await apiFetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify({ key, value, description, environment: currentEnvironment }),
    });

    editModal.classList.remove('active');
    await loadSecrets(currentPage, currentSearch);
  } catch (err) {
    alert(`Failed to save: ${err.message}`);
  }
}

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', () => {
  editModal.classList.remove('active');
});

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.classList.remove('active');
  }
});

// ─── Import Preview Modal ─────────────────────────────────────────────────────

function showImportPreview(parsedEnv) {
  importPreviewData = Object.entries(parsedEnv).map(([key, value]) => ({
    key: key.trim(),
    value: value || '',
    hidden: true,
  }));

  renderImportPreview();
  importPreviewModal.classList.add('active');
}

function renderImportPreview() {
  importPreviewList.innerHTML = importPreviewData
    .map((item, idx) => {
      const inputType = item.hidden ? 'password' : 'text';
      return `
        <div class="import-preview-item">
          <div class="import-preview-key">${escapeHtml(item.key)}</div>
          <div class="import-preview-value-wrapper">
            <input type="${inputType}" class="import-preview-value" data-idx="${idx}" value="${escapeHtml(item.value)}">
            <button class="btn-toggle-visibility" data-idx="${idx}" title="${item.hidden ? 'Show' : 'Hide'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                ${item.hidden 
                  ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' 
                  : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 01-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                }
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach toggle listeners
  importPreviewList.querySelectorAll('.btn-toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      toggleImportValueVisibility(idx);
    });
  });

  // Update data when input values change
  importPreviewList.querySelectorAll('.import-preview-value').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx);
      if (importPreviewData[idx]) {
        importPreviewData[idx].value = input.value;
      }
    });
  });
}

function toggleImportValueVisibility(idx) {
  const item = importPreviewData[idx];
  if (!item) return;

  item.hidden = !item.hidden;
  renderImportPreview();
}

async function confirmImportPreview() {
  try {
    let imported = 0;
    for (const item of importPreviewData) {
      const value = item.value.trim();
      if (value) {
        await apiFetch(API_BASE, {
          method: 'POST',
          body: JSON.stringify({ key: item.key, value, description: `Imported from .env file (${currentEnvironment})`, environment: currentEnvironment }),
        });
        imported++;
      }
    }

    importPreviewModal.classList.remove('active');
    importMessage.textContent = `✓ Imported ${imported} secrets into ${currentEnvironment}`;
    importMessage.className = 'message success';

    await loadSecrets(1, currentSearch);
    fileInput.value = '';
  } catch (err) {
    alert(`Failed to import: ${err.message}`);
  }
}

cancelImportPreviewBtn.addEventListener('click', () => {
  importPreviewModal.classList.remove('active');
  importPreviewData = [];
});

confirmImportPreviewBtn.addEventListener('click', confirmImportPreview);

importPreviewModal.addEventListener('click', (e) => {
  if (e.target === importPreviewModal) {
    importPreviewModal.classList.remove('active');
    importPreviewData = [];
  }
});

// ─── Delete Secret with Modal ─────────────────────────────────────────────────

function promptDelete(key) {
  deleteTarget = key;
  deleteTargetEnv = currentEnvironment;
  deleteKeyName.textContent = key;
  deleteModal.classList.add('active');
}

async function confirmDelete() {
  if (!deleteTarget) return;

  try {
    await apiFetch(`${API_BASE}/${encodeURIComponent(deleteTarget)}?environment=${deleteTargetEnv}`, {
      method: 'DELETE',
    });

    revealedKeys.delete(deleteTarget);
    deleteTarget = null;
    deleteTargetEnv = null;
    deleteModal.classList.remove('active');
    await loadSecrets(currentPage, currentSearch);
  } catch (err) {
    alert(`Failed to delete: ${err.message}`);
    deleteModal.classList.remove('active');
  }
}

confirmDeleteBtn.addEventListener('click', confirmDelete);
cancelDeleteBtn.addEventListener('click', () => {
  deleteTarget = null;
  deleteTargetEnv = null;
  deleteModal.classList.remove('active');
});

// Close modal on overlay click
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteTarget = null;
    deleteTargetEnv = null;
    deleteModal.classList.remove('active');
  }
});

// ─── Drag & Drop .env Import ──────────────────────────────────────────────────

// Click to open file picker
const browseLink = document.querySelector('.browse-link');
if (browseLink) {
  browseLink.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
}

// Click anywhere on dropzone to open file picker
const importSection = document.getElementById('drop-zone');
if (importSection && fileInput) {
  dropZone = importSection;
  dropZone.addEventListener('click', (e) => {
    if (e.target === browseLink || browseLink?.contains(e.target)) return;
    if (e.target.tagName === 'BUTTON') return;
    fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleEnvFile(files[0]);
    }
  });
}

// File picker
if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleEnvFile(fileInput.files[0]);
    }
  });
}

// ─── Simple .env Parser (browser-safe, no require needed) ────────────────────

function parseEnvFile(text) {
  const result = {};
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Find the first = sign
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

// ─── Drag & Drop .env Import ──────────────────────────────────────────────────

async function handleEnvFile(file) {
  importMessage.textContent = `Reading ${file.name}...`;
  importMessage.className = 'message info';

  try {
    const text = await file.text();

    if (!text.trim()) {
      importMessage.textContent = '✗ File is empty.';
      importMessage.className = 'message error';
      return;
    }

    // Parse the .env file using our browser-safe parser
    const parsed = parseEnvFile(text);
    const keys = Object.keys(parsed);

    if (keys.length === 0) {
      importMessage.textContent = '✗ No valid key=value pairs found.';
      importMessage.className = 'message error';
      return;
    }

    // Show preview modal
    showImportPreview(parsed);

  } catch (err) {
    importMessage.textContent = `✗ Error: ${err.message}`;
    importMessage.className = 'message error';
  }
}

// ─── Search (DB-level) ────────────────────────────────────────────────────────

let searchDebounce;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const query = searchInput.value.trim();
      currentSearch = query;
      // Always reset to page 1 when searching
      loadSecrets(1, query);
    }, 300);
  });
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.7';
    await loadSecrets(currentPage, currentSearch);
    refreshBtn.disabled = false;
    refreshBtn.style.opacity = '1';
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Event Delegation for Table Actions ──────────────────────────────────────

secretsTbody.addEventListener('click', (e) => {
  const target = e.target.nodeType === 1 ? e.target : e.target.parentElement;
  
  const revealBtn = target.closest('.btn-reveal');
  const editBtn = target.closest('.action-btn.edit');
  const deleteBtn = target.closest('.action-btn.delete');

  if (revealBtn) {
    const key = revealBtn.dataset.key;
    toggleReveal(key);
  }

  if (editBtn) {
    const key = editBtn.dataset.key;
    openEditModal(key);
  }

  if (deleteBtn) {
    const key = deleteBtn.dataset.key;
    promptDelete(key);
  }
});

// ─── Load Database Info ──────────────────────────────────────────────────────

async function loadDbInfo() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      const dbNameEl = document.getElementById('db-name');
      const dbHostEl = document.getElementById('db-host');
      if (dbNameEl) {
        dbNameEl.textContent = data.data.databaseName || 'secrets-manager';
      }
      if (dbHostEl) {
        dbHostEl.textContent = data.data.host || 'localhost:27017';
      }
    }
  } catch (err) {
    const dbNameEl = document.getElementById('db-name');
    const dbHostEl = document.getElementById('db-host');
    if (dbNameEl) {
      dbNameEl.textContent = 'secrets-manager';
    }
    if (dbHostEl) {
      dbHostEl.textContent = 'localhost:27017';
    }
  }
}

// ─── Initialize ───────────────────────────────────────────────────────────────

loadSecrets();
loadDbInfo();
