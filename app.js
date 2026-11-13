'use strict';

/* ---------- Constants ---------- */
const STORE_KEY = 'campus-safety-demo-v1';
const CATEGORIES = ['Harassment', 'Theft', 'Facilities hazard', 'Lighting', 'Medical', 'Other'];
const STATUSES = ['New', 'In review', 'Resolved'];
const PUBLIC_MESSAGES = {
  'New': 'Received. Waiting for staff review.',
  'In review': 'A staff member is reviewing this report.',
  'Resolved': 'This report has been resolved.'
};

/* Synthetic sample records (no real people or incidents) */
const SEED_REPORTS = [
  { id: 'CSR-1001', category: 'Lighting', location: 'Parking lot B', date: '2026-10-02', severity: 'Medium',
    description: 'Two lamp posts near the east entrance have been off for a week.', status: 'In review',
    notes: [{ text: 'Work order sent to facilities.', at: '2026-10-03 09:10' }] },
  { id: 'CSR-1002', category: 'Theft', location: 'Library, ground floor', date: '2026-10-05', severity: 'Medium',
    description: 'A backpack left at a study desk was gone after a 10 minute break.', status: 'New', notes: [] },
  { id: 'CSR-1003', category: 'Facilities hazard', location: 'Block C stairwell', date: '2026-10-07', severity: 'High',
    description: 'A handrail is loose on the second landing and moves when pulled.', status: 'In review',
    notes: [{ text: 'Area coned off. Repair booked.', at: '2026-10-07 14:30' }] },
  { id: 'CSR-1004', category: 'Harassment', location: 'Cafeteria entrance', date: '2026-10-09', severity: 'High',
    description: 'A group repeatedly made unwanted comments toward people queuing at lunch.', status: 'New',
    notes: [] },
  { id: 'CSR-1005', category: 'Medical', location: 'Sports ground', date: '2026-10-12', severity: 'High',
    description: 'A player fainted and there was no first aid kit at the pavilion.', status: 'Resolved',
    notes: [{ text: 'Kit placed at pavilion. Checked.', at: '2026-10-13 11:00' }] },
  { id: 'CSR-1006', category: 'Lighting', location: 'Hostel path', date: '2026-10-15', severity: 'Low',
    description: 'The path between the hostel and main gate is very dark after 8 pm.', status: 'New', notes: [] },
  { id: 'CSR-1007', category: 'Facilities hazard', location: 'Lab 3', date: '2026-10-18', severity: 'Medium',
    description: 'A water leak near a power strip under the third bench.', status: 'Resolved',
    notes: [{ text: 'Pipe fixed, strip replaced.', at: '2026-10-19 16:45' }] },
  { id: 'CSR-1008', category: 'Other', location: 'Bus stop', date: '2026-10-21', severity: 'Low',
    description: 'The shelter roof has a gap and rain lands directly on the bench.', status: 'New', notes: [] }
];

/* ---------- State ---------- */
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.reports) && Array.isArray(parsed.audit)) {
        /* Keep only well-formed records, since stored data can be edited by the user */
        parsed.reports = parsed.reports.filter(isValidReport);
        if (parsed.reports.length > 0) return parsed;
      }
    }
  } catch (err) { /* storage blocked or corrupt: fall back to seed */ }
  return freshState();
}

function isValidReport(r) {
  return r && typeof r.id === 'string' && /^CSR-\d+$/.test(r.id) &&
    CATEGORIES.includes(r.category) && STATUSES.includes(r.status) &&
    ['Low', 'Medium', 'High'].includes(r.severity) &&
    typeof r.location === 'string' && typeof r.date === 'string' &&
    typeof r.description === 'string' && Array.isArray(r.notes) &&
    r.notes.every((n) => n && typeof n.text === 'string' && typeof n.at === 'string');
}

function freshState() {
  return { reports: JSON.parse(JSON.stringify(SEED_REPORTS)), audit: [] };
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
}

/* ---------- Helpers ---------- */
const $ = (sel) => document.querySelector(sel);

function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function todayISO() { return now().slice(0, 10); }

function currentRole() { return $('#role').value; }

function logAudit(action) {
  state.audit.unshift({ at: now(), role: currentRole(), action });
  state.audit = state.audit.slice(0, 50);
}

function nextId() {
  const nums = state.reports.map((r) => parseInt(r.id.replace('CSR-', ''), 10) || 1000);
  return 'CSR-' + (Math.max(1000, ...nums) + 1);
}

/* Build elements with textContent only, so user text is never parsed as HTML */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function fillSelect(select, values) {
  values.forEach((v) => {
    const o = el('option', v);
    o.value = v;
    select.appendChild(o);
  });
}

/* ---------- Role views ---------- */
function showRole() {
  const role = currentRole();
  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== role;
  });
  render();
}

/* ---------- Report form (reporter) ---------- */
const FIELD_NAMES = ['category', 'location', 'date', 'description'];

function setError(name, message) {
  const input = $('#' + name);
  $('#' + name + '-err').textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validateReport(data) {
  const errors = {};
  if (!CATEGORIES.includes(data.category)) errors.category = 'Choose a category from the list.';
  if (data.location.length < 3) errors.location = 'Enter a location of at least 3 characters.';
  if (!data.date) errors.date = 'Choose the date it happened.';
  else if (data.date > todayISO()) errors.date = 'The date cannot be in the future.';
  if (data.description.length < 20) errors.description = 'Describe what happened in at least 20 characters.';
  else if (data.description.length > 500) errors.description = 'Keep the description under 500 characters.';
  return errors;
}

function handleReportSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = {
    category: form.elements.category.value,
    location: form.elements.location.value.trim(),
    date: form.elements.date.value,
    severity: form.elements.severity.value,
    description: form.elements.description.value.trim()
  };

  const errors = validateReport(data);
  FIELD_NAMES.forEach((name) => setError(name, errors[name] || ''));
  const firstBad = FIELD_NAMES.find((name) => errors[name]);
  if (firstBad) {
    $('#confirm').hidden = true;
    $('#' + firstBad).focus();
    return;
  }

  const report = {
    id: nextId(),
    category: data.category,
    location: data.location,
    date: data.date,
    severity: data.severity,
    description: data.description,
    status: 'New',
    notes: []
  };
  state.reports.push(report);
  logAudit(`Report ${report.id} submitted (${report.category}, ${report.severity})`);
  saveState();

  const box = $('#confirm');
  box.hidden = false;
  box.textContent = `Report received. Your tracking ID is ${report.id}. Keep it to check the status later.`;
  form.reset();
  $('#count').textContent = '0';
  render();
}

function handleTrack(event) {
  event.preventDefault();
  const out = $('#track-result');
  const id = $('#track-id').value.trim().toUpperCase();
  if (!id) { out.textContent = 'Enter a tracking ID.'; return; }
  const report = state.reports.find((r) => r.id === id);
  if (!report) { out.textContent = `No report found for "${id}". Check the ID and try again.`; return; }
  /* Reporter sees status only. Staff notes are never shown here. */
  out.textContent = `${report.id} (${report.category}): ${report.status}. ${PUBLIC_MESSAGES[report.status]}`;
}

/* ---------- Staff dashboard ---------- */
function getFilters() {
  return {
    text: $('#f-search').value.trim().toLowerCase(),
    category: $('#f-category').value,
    status: $('#f-status').value,
    severity: $('#f-severity').value
  };
}

function filterReports(f) {
  return state.reports.filter((r) =>
    (!f.category || r.category === f.category) &&
    (!f.status || r.status === f.status) &&
    (!f.severity || r.severity === f.severity) &&
    (!f.text || `${r.id} ${r.location} ${r.description}`.toLowerCase().includes(f.text))
  );
}

const SEVERITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function buildCard(r) {
  const card = el('article', undefined, `card sev-${r.severity}`);
  card.dataset.id = r.id;

  card.appendChild(el('span', r.status, `badge badge-${r.status.replace(' ', '')}`));
  card.appendChild(el('h3', `${r.id}: ${r.category}`));
  card.appendChild(el('p', `${r.severity} severity | ${r.location} | ${r.date}`, 'meta'));
  card.appendChild(el('p', r.description));

  const row = el('div', undefined, 'status-row');
  const label = el('label', 'Status');
  const selectId = `status-${r.id}`;
  label.htmlFor = selectId;
  const select = el('select', undefined, 'status-select');
  select.id = selectId;
  fillSelect(select, STATUSES);
  select.value = r.status;
  row.append(label, select);
  card.appendChild(row);

  card.appendChild(el('h4', 'Staff notes'));
  if (r.notes.length === 0) {
    card.appendChild(el('p', 'No notes yet.', 'hint'));
  } else {
    const ul = el('ul', undefined, 'notes');
    r.notes.forEach((n) => ul.appendChild(el('li', `${n.text} (${n.at})`)));
    card.appendChild(ul);
  }

  const form = el('form', undefined, 'note-form');
  const noteLabel = el('label', 'Add a note');
  const noteInput = el('input');
  noteInput.type = 'text';
  noteInput.required = true;
  noteInput.minLength = 3;
  noteInput.maxLength = 200;
  noteInput.id = `note-${r.id}`;
  noteLabel.htmlFor = noteInput.id;
  const err = el('p', '', 'error');
  err.setAttribute('role', 'alert');
  err.id = `note-error-${r.id}`;
  noteInput.setAttribute('aria-describedby', err.id);
  const btn = el('button', 'Save note', 'btn secondary');
  btn.type = 'submit';
  form.append(noteLabel, noteInput, err, btn);
  card.appendChild(form);

  return card;
}

function renderStaff() {
  const list = $('#staff-list');
  list.replaceChildren();
  const results = filterReports(getFilters())
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id));

  $('#staff-count').textContent = `Showing ${results.length} of ${state.reports.length} reports, highest severity first.`;

  if (results.length === 0) {
    list.appendChild(el('p', 'No reports match these filters. Clear a filter or change your search.', 'empty'));
    return;
  }
  results.forEach((r) => list.appendChild(buildCard(r)));
}

function renderAudit() {
  const ol = $('#audit-list');
  ol.replaceChildren();
  if (state.audit.length === 0) {
    ol.appendChild(el('li', 'No changes recorded yet.'));
    return;
  }
  state.audit.forEach((a) => ol.appendChild(el('li', `${a.at} | ${a.role} | ${a.action}`)));
}

function handleStaffChange(event) {
  if (!event.target.classList.contains('status-select')) return;
  const id = event.target.closest('.card').dataset.id;
  const report = state.reports.find((r) => r.id === id);
  if (!report || !STATUSES.includes(event.target.value)) return;
  const old = report.status;
  if (old === event.target.value) return;
  report.status = event.target.value;
  logAudit(`${id} status changed from ${old} to ${report.status}`);
  saveState();
  render();
  document.getElementById(`status-${id}`)?.focus();
}

function handleNoteSubmit(event) {
  if (!event.target.classList.contains('note-form')) return;
  event.preventDefault();
  const card = event.target.closest('.card');
  const input = event.target.querySelector('input');
  const err = event.target.querySelector('.error');
  const text = input.value.trim();
  if (text.length < 3) { err.textContent = 'Write a note of at least 3 characters.'; input.focus(); return; }
  const report = state.reports.find((r) => r.id === card.dataset.id);
  report.notes.push({ text, at: now() });
  logAudit(`Note added to ${report.id}`);
  saveState();
  render();
  document.getElementById(`note-${report.id}`)?.focus();
}

/* ---------- Public summary (counts only) ---------- */
function renderPublic() {
  const stats = $('#public-status');
  stats.replaceChildren();
  STATUSES.forEach((s) => {
    const count = state.reports.filter((r) => r.status === s).length;
    const box = el('div', undefined, `stat stat-${s.replace(' ', '')}`);
    const num = el('strong', '0');
    box.append(num, el('span', s));
    stats.appendChild(box);
    animateCount(num, count);
  });

  const body = $('#public-table');
  body.replaceChildren();
  CATEGORIES.forEach((c) => {
    const count = state.reports.filter((r) => r.category === c).length;
    const tr = el('tr');
    tr.append(el('td', c), el('td', String(count)));
    body.appendChild(tr);
  });
}

/* Count up to a number; jumps straight to it if the user prefers reduced motion */
function animateCount(node, target) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) {
    node.textContent = String(target);
    return;
  }
  const duration = 700;
  const start = performance.now();
  function step(t) {
    const progress = Math.min((t - start) / duration, 1);
    node.textContent = String(Math.round(target * progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Render ---------- */
function render() {
  const role = currentRole();
  if (role === 'staff') { renderStaff(); renderAudit(); }
  if (role === 'public') renderPublic();
}

/* ---------- Init ---------- */
function init() {
  fillSelect($('#category'), CATEGORIES);
  fillSelect($('#f-category'), CATEGORIES);
  fillSelect($('#f-status'), STATUSES);
  $('#date').max = todayISO();

  $('#role').addEventListener('change', showRole);
  $('#report-form').addEventListener('submit', handleReportSubmit);
  $('#track-form').addEventListener('submit', handleTrack);
  $('#report-form').addEventListener('input', (event) => {
    const name = event.target.name;
    if (FIELD_NAMES.includes(name)) setError(name, '');
    $('#confirm').hidden = true;
    $('#count').textContent = $('#description').value.length;
  });
  $('#filters').addEventListener('submit', (event) => event.preventDefault());

  ['#f-search', '#f-category', '#f-status', '#f-severity'].forEach((sel) => {
    $(sel).addEventListener('input', renderStaff);
  });
  $('#f-clear').addEventListener('click', () => {
    $('#filters').reset();
    renderStaff();
  });

  const list = $('#staff-list');
  list.addEventListener('change', handleStaffChange);
  list.addEventListener('submit', handleNoteSubmit);

  $('#reset').addEventListener('click', () => {
    if (confirm('Reset all demo data back to the sample records?')) {
      state = freshState();
      logAudit('Demo data reset');
      saveState();
      render();
    }
  });

  showRole();
}

document.addEventListener('DOMContentLoaded', init);
