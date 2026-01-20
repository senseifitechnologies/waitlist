const stateEl = document.getElementById('state');
const rowsEl = document.getElementById('rows');
const countEl = document.getElementById('count');
const refreshBtn = document.getElementById('refreshBtn');
const searchEl = document.getElementById('search');
const apiBaseEl = document.getElementById('apiBase');

// Optional: allow overriding the API base via query string:
// /admin/?apiBase=https://your-api.onrender.com
const params = new URLSearchParams(window.location.search);
const apiBase = (params.get('apiBase') || '').trim().replace(/\/+$/, '');
apiBaseEl.textContent = apiBase || 'same-origin';

function setState(message, kind = 'info') {
  stateEl.textContent = message || '';
  stateEl.classList.toggle('error', kind === 'error');
}

function formatJoined(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

let allEntries = [];

function render(entries) {
  const q = (searchEl.value || '').trim().toLowerCase();
  const filtered = q ? entries.filter((e) => String(e.email || '').toLowerCase().includes(q)) : entries;

  countEl.textContent = String(filtered.length);

  rowsEl.innerHTML = filtered
    .map((e) => {
      const email = escapeHtml(e.email || '');
      const joined = escapeHtml(formatJoined(e.created_at));
      return `<tr><td>${email}</td><td class="right">${joined}</td></tr>`;
    })
    .join('');

  if (!filtered.length) {
    rowsEl.innerHTML = `<tr><td colspan="2" style="color: rgba(255,255,255,0.55); padding: 16px;">No results.</td></tr>`;
  }
}

async function fetchWaitlist() {
  setState('Loading…');
  refreshBtn.disabled = true;

  try {
    const url = `${apiBase || ''}/waitlist`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
    }

    const json = await res.json();
    allEntries = Array.isArray(json.entries) ? json.entries : [];
    render(allEntries);
    setState('');
  } catch (err) {
    console.error(err);
    setState(`Failed to fetch waitlist. ${err.message || err}`, 'error');
    allEntries = [];
    render(allEntries);
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', fetchWaitlist);
searchEl.addEventListener('input', () => render(allEntries));

fetchWaitlist();

