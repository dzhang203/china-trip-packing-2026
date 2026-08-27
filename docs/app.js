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
const customizationKey = 'zuzu-packing-customization-v1';
let packInputs = [];
const progressLabel = document.querySelector('#progress-label');
const progressBar = document.querySelector('#progress-bar');
const packingPanel = document.querySelector('#packing');
const editListButton = document.querySelector('#edit-list');
const restoreListButton = document.querySelector('#restore-list');
let editMode = false;

function readPackedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function readCustomizationState() {
  try {
    const saved = JSON.parse(localStorage.getItem(customizationKey)) || {};
    return {
      renamed: saved.renamed || {},
      removed: Array.isArray(saved.removed) ? saved.removed : [],
      custom: Array.isArray(saved.custom) ? saved.custom : []
    };
  } catch {
    return { renamed: {}, removed: [], custom: [] };
  }
}

function prepareDefaultPackRows() {
  document.querySelectorAll('.checklist label').forEach((oldLabel) => {
    const input = oldLabel.querySelector('[data-pack]');
    if (!input) return;
    const baseText = [...oldLabel.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.nodeValue)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const row = document.createElement('div');
    const textLabel = document.createElement('label');
    input.id ||= `pack-${input.dataset.pack}`;
    row.className = 'pack-item-row';
    row.dataset.packKey = input.dataset.pack;
    row.dataset.baseEn = baseText;
    textLabel.className = 'pack-item-text';
    textLabel.htmlFor = input.id;
    textLabel.textContent = baseText;
    row.append(input, textLabel);
    oldLabel.replaceWith(row);
  });
}

prepareDefaultPackRows();

function updateProgress() {
  const activeInputs = packInputs.filter((input) => !input.closest('.pack-item-row')?.classList.contains('pack-item-removed'));
  const checked = activeInputs.filter((input) => input.checked).length;
  const total = activeInputs.length;
  progressLabel.textContent = window.ZUZU_I18N?.progress(checked, total) || `${checked} of ${total} packed`;
  progressBar.style.width = total ? `${(checked / total) * 100}%` : '0%';
}

const packedState = readPackedState();
let customizationState = readCustomizationState();

function registerPackInput(input) {
  if (input.dataset.packBound === 'true') return;
  input.checked = Boolean(packedState[input.dataset.pack]);
  input.addEventListener('change', () => {
    packedState[input.dataset.pack] = input.checked;
    localStorage.setItem(storageKey, JSON.stringify(packedState));
    updateProgress();
  });
  input.dataset.packBound = 'true';
}

function refreshPackInputs() {
  packInputs = [...document.querySelectorAll('[data-pack]')];
  packInputs.forEach(registerPackInput);
}

function saveCustomizations() {
  localStorage.setItem(customizationKey, JSON.stringify(customizationState));
}

function currentLanguage() {
  return window.ZUZU_I18N?.language === 'zh' ? 'zh' : 'en';
}

function localizedValue(value) {
  if (typeof value === 'string') return value;
  if (!value) return '';
  const language = currentLanguage();
  return value[language] || value.en || value.zh || '';
}

function uiText(english) {
  return window.ZUZU_I18N?.t(english) || english;
}

function setButtonLabel(button, label) {
  button.textContent = label;
  button.setAttribute('aria-label', label);
}

function createPackRow(item) {
  const row = document.createElement('div');
  const input = document.createElement('input');
  const label = document.createElement('label');
  row.className = 'pack-item-row';
  row.dataset.packKey = item.id;
  row.dataset.customId = item.id;
  input.type = 'checkbox';
  input.dataset.pack = item.id;
  input.id = `pack-${item.id}`;
  label.className = 'pack-item-text';
  label.htmlFor = input.id;
  label.textContent = localizedValue(item.text);
  row.append(input, label);
  return row;
}

function findCustomItem(id) {
  return customizationState.custom.find((item) => item.id === id);
}

function renderPackRowText(row) {
  const label = row.querySelector('.pack-item-text');
  if (!label) return;
  const language = currentLanguage();
  if (row.dataset.customId) {
    label.textContent = localizedValue(findCustomItem(row.dataset.customId)?.text);
    return;
  }
  const override = customizationState.renamed[row.dataset.packKey]?.[language];
  label.textContent = override || uiText(row.dataset.baseEn);
}

function closeInlineEditor(row) {
  row.querySelector('.pack-inline-editor')?.remove();
  row.classList.remove('is-editing');
}

function openInlineEditor(row) {
  document.querySelectorAll('.pack-item-row.is-editing').forEach(closeInlineEditor);
  const form = document.createElement('form');
  const field = document.createElement('input');
  const saveButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  form.className = 'pack-inline-editor';
  field.type = 'text';
  field.required = true;
  field.value = row.querySelector('.pack-item-text')?.textContent.trim() || '';
  field.setAttribute('aria-label', uiText('Packing item name'));
  saveButton.type = 'submit';
  cancelButton.type = 'button';
  setButtonLabel(saveButton, uiText('Save'));
  setButtonLabel(cancelButton, uiText('Cancel'));
  cancelButton.addEventListener('click', () => closeInlineEditor(row));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextText = field.value.trim();
    if (!nextText) return;
    const language = currentLanguage();
    if (row.dataset.customId) {
      const item = findCustomItem(row.dataset.customId);
      if (item) item.text = { ...(typeof item.text === 'object' ? item.text : {}), [language]: nextText };
    } else {
      const key = row.dataset.packKey;
      customizationState.renamed[key] = { ...(customizationState.renamed[key] || {}), [language]: nextText };
    }
    saveCustomizations();
    renderPackRowText(row);
    closeInlineEditor(row);
  });
  form.append(field, saveButton, cancelButton);
  row.append(form);
  row.classList.add('is-editing');
  field.focus();
  field.select();
}

function deletePackRow(row) {
  const name = row.querySelector('.pack-item-text')?.textContent.trim() || '';
  const message = currentLanguage() === 'zh'
    ? `从打包清单中删除“${name}”吗？`
    : `Delete “${name}” from the packing list?`;
  if (!window.confirm(message)) return;
  const key = row.dataset.packKey;
  if (row.dataset.customId) {
    customizationState.custom = customizationState.custom.filter((item) => item.id !== row.dataset.customId);
    row.remove();
    delete packedState[key];
    localStorage.setItem(storageKey, JSON.stringify(packedState));
  } else {
    if (!customizationState.removed.includes(key)) customizationState.removed.push(key);
    row.classList.add('pack-item-removed');
  }
  saveCustomizations();
  refreshPackInputs();
  updateProgress();
}

function decoratePackRow(row) {
  if (row.dataset.editableReady === 'true') return;
  const actions = document.createElement('div');
  const editButton = document.createElement('button');
  const deleteButton = document.createElement('button');
  actions.className = 'pack-item-actions';
  editButton.type = 'button';
  editButton.dataset.packAction = 'edit';
  deleteButton.type = 'button';
  deleteButton.dataset.packAction = 'delete';
  editButton.addEventListener('click', () => openInlineEditor(row));
  deleteButton.addEventListener('click', () => deletePackRow(row));
  actions.append(editButton, deleteButton);
  row.append(actions);
  row.dataset.editableReady = 'true';
}

function renderEditorLanguage() {
  document.querySelectorAll('.pack-item-row').forEach((row) => {
    renderPackRowText(row);
    const editButton = row.querySelector('[data-pack-action="edit"]');
    const deleteButton = row.querySelector('[data-pack-action="delete"]');
    if (editButton) {
      editButton.textContent = '✎';
      editButton.setAttribute('aria-label', uiText('Edit item'));
      editButton.title = uiText('Edit item');
    }
    if (deleteButton) {
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', uiText('Delete item'));
      deleteButton.title = uiText('Delete item');
    }
  });
  document.querySelectorAll('[data-add-item]').forEach((button) => setButtonLabel(button, uiText('Add item')));
  document.querySelectorAll('.pack-add-form input').forEach((input) => {
    input.placeholder = uiText('New packing item');
    input.setAttribute('aria-label', uiText('New packing item'));
  });
  document.querySelectorAll('[data-add-save]').forEach((button) => setButtonLabel(button, uiText('Add')));
  document.querySelectorAll('[data-add-cancel]').forEach((button) => setButtonLabel(button, uiText('Cancel')));
  if (editListButton) setButtonLabel(editListButton, uiText(editMode ? 'Done editing' : 'Edit list'));
  if (restoreListButton) setButtonLabel(restoreListButton, uiText('Restore defaults'));
}

function createAddControls(card) {
  const section = card.dataset.packSection;
  const wrap = document.createElement('div');
  const trigger = document.createElement('button');
  const form = document.createElement('form');
  const field = document.createElement('input');
  const addButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  wrap.className = 'pack-add-controls';
  trigger.type = 'button';
  trigger.dataset.addItem = section;
  form.className = 'pack-add-form';
  form.hidden = true;
  field.type = 'text';
  field.required = true;
  addButton.type = 'submit';
  addButton.dataset.addSave = section;
  cancelButton.type = 'button';
  cancelButton.dataset.addCancel = section;
  trigger.addEventListener('click', () => {
    form.hidden = false;
    trigger.hidden = true;
    field.focus();
  });
  cancelButton.addEventListener('click', () => {
    form.reset();
    form.hidden = true;
    trigger.hidden = false;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = field.value.trim();
    if (!text) return;
    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, section, text: { [currentLanguage()]: text } };
    customizationState.custom.push(item);
    saveCustomizations();
    const row = createPackRow(item);
    card.querySelector('.checklist').append(row);
    decoratePackRow(row);
    refreshPackInputs();
    renderEditorLanguage();
    updateProgress();
    form.reset();
    form.hidden = true;
    trigger.hidden = false;
  });
  form.append(field, addButton, cancelButton);
  wrap.append(trigger, form);
  card.append(wrap);
}

function setEditMode(nextMode) {
  editMode = nextMode;
  packingPanel?.classList.toggle('packing-edit-mode', editMode);
  editListButton?.setAttribute('aria-pressed', String(editMode));
  if (restoreListButton) restoreListButton.hidden = !editMode;
  if (!editMode) {
    document.querySelectorAll('.pack-item-row.is-editing').forEach(closeInlineEditor);
    document.querySelectorAll('.pack-add-form').forEach((form) => { form.hidden = true; form.reset(); });
    document.querySelectorAll('[data-add-item]').forEach((button) => { button.hidden = false; });
  }
  renderEditorLanguage();
}

function restoreDefaultList() {
  const message = uiText('Restore the default packing list? Custom items and item name edits will be removed.');
  if (!window.confirm(message)) return;
  customizationState.custom.forEach((item) => { delete packedState[item.id]; });
  customizationState = { renamed: {}, removed: [], custom: [] };
  localStorage.removeItem(customizationKey);
  localStorage.setItem(storageKey, JSON.stringify(packedState));
  document.querySelectorAll('.pack-item-row[data-custom-id]').forEach((row) => row.remove());
  document.querySelectorAll('.pack-item-row').forEach((row) => {
    row.classList.remove('pack-item-removed');
    renderPackRowText(row);
  });
  refreshPackInputs();
  updateProgress();
}

function initEditableChecklist() {
  document.querySelectorAll('.checklist-card').forEach((card, index) => {
    card.dataset.packSection = String(index + 1).padStart(2, '0');
    const checklist = card.querySelector('.checklist');
    customizationState.custom
      .filter((item) => item.section === card.dataset.packSection)
      .forEach((item) => checklist.append(createPackRow(item)));
    createAddControls(card);
  });
  document.querySelectorAll('.pack-item-row').forEach((row) => {
    if (customizationState.removed.includes(row.dataset.packKey)) row.classList.add('pack-item-removed');
    decoratePackRow(row);
  });
  refreshPackInputs();
  renderEditorLanguage();
  updateProgress();
}

refreshPackInputs();
updateProgress();

document.addEventListener('DOMContentLoaded', initEditableChecklist);

editListButton?.addEventListener('click', () => setEditMode(!editMode));
restoreListButton?.addEventListener('click', restoreDefaultList);

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

document.addEventListener('zuzu:languagechange', () => {
  renderEditorLanguage();
  updateProgress();
});
