const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];

function activateTab(id, updateHash = true) {
  const next = tabs.find((tab) => tab.dataset.tab === id) || tabs[0];

  tabs.forEach((tab) => {
    const active = tab === next;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  panels.forEach((panel) => {
    panel.hidden = panel.id !== next.dataset.tab;
  });

  const tabList = next.parentElement;
  if (tabList.scrollWidth > tabList.clientWidth) {
    tabList.scrollTo({
      left: next.offsetLeft - (tabList.clientWidth - next.offsetWidth) / 2,
      behavior: 'smooth'
    });
  }

  if (updateHash) history.replaceState(null, '', `#${next.dataset.tab}`);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    let targetIndex = null;
    if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = tabs.length - 1;
    if (targetIndex === null) return;
    event.preventDefault();
    activateTab(tabs[targetIndex].dataset.tab);
    tabs[targetIndex].focus();
  });
});

document.querySelectorAll('[data-open-tab], [data-tab-link]').forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    activateTab(control.dataset.openTab || control.dataset.tabLink);
  });
});

const initialTab = window.location.hash.slice(1);
if (initialTab) {
  activateTab(initialTab, false);
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

const storageKey = 'zuzu-packing-checklist-v1';
const packInputs = [...document.querySelectorAll('[data-pack]')];
const progressLabel = document.querySelector('#progress-label');
const progressBar = document.querySelector('#progress-bar');

function readPackedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function updateProgress() {
  const checked = packInputs.filter((input) => input.checked).length;
  const total = packInputs.length;
  progressLabel.textContent = window.ZUZU_I18N?.progress(checked, total) || `${checked} of ${total} packed`;
  progressBar.style.width = total ? `${(checked / total) * 100}%` : '0%';
}

const packedState = readPackedState();
packInputs.forEach((input) => {
  input.checked = Boolean(packedState[input.dataset.pack]);
  input.addEventListener('change', () => {
    packedState[input.dataset.pack] = input.checked;
    localStorage.setItem(storageKey, JSON.stringify(packedState));
    updateProgress();
  });
});
updateProgress();

document.querySelector('#reset-list')?.addEventListener('click', () => {
  const message = window.ZUZU_I18N?.t('Clear every checked packing item?') || 'Clear every checked packing item?';
  if (!window.confirm(message)) return;
  packInputs.forEach((input) => { input.checked = false; });
  localStorage.removeItem(storageKey);
  Object.keys(packedState).forEach((key) => delete packedState[key]);
  updateProgress();
});

document.querySelector('#print-list')?.addEventListener('click', () => window.print());

function appendCell(row, text, tagName = 'td') {
  const cell = document.createElement(tagName);
  cell.textContent = text;
  row.append(cell);
  return cell;
}

function renderCarSeats() {
  const body = document.querySelector('#car-seat-rows');
  const seats = window.TRIP_GUIDE?.carSeats || [];
  if (!body) return;

  seats.forEach((seat) => {
    const row = document.createElement('tr');
    if (seat.rowClass) row.className = seat.rowClass;

    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    if (seat.url) {
      const link = document.createElement('a');
      link.href = seat.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `${seat.name} ↗`;
      nameCell.append(link);
    } else {
      nameCell.textContent = seat.name;
    }
    row.append(nameCell);

    appendCell(row, seat.comfort);
    appendCell(row, seat.carry);
    appendCell(row, seat.install);
    appendCell(row, seat.limits);
    const verdictCell = appendCell(row, '');
    const badge = document.createElement('span');
    badge.className = ['table-badge', seat.badgeClass].filter(Boolean).join(' ');
    badge.textContent = seat.verdict;
    verdictCell.append(badge);
    body.append(row);
  });
}

renderCarSeats();

document.addEventListener('zuzu:languagechange', updateProgress);
