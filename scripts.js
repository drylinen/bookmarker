'use strict';

(function initBookmarkr() {
  /**
   * Data model:
   * Link = { id, title, url, category, emojiCode?, color? }
   * CategoryKey in CATEGORIES keys
   */
  /** @typedef {{id: string, title: string, url: string, category: string, emojiCode?: string, color?: string}} Link */

  /** @type {Record<string, {label: string, emoji: string, color: string}>} */
  const CATEGORIES = {
    ai:            { label: 'AI',            emoji: '🤖', color: '#8e44ad' },
    documents:     { label: 'Documents',     emoji: '📄', color: '#cccccc' },
    education:     { label: 'Education',     emoji: '🎓', color: '#2980b9' },
    entertainment: { label: 'Entertainment', emoji: '🎬', color: '#a82e2c' },
    finance:       { label: 'Finance',       emoji: '💰', color: '#ff50b0' },
    map:           { label: 'Map',           emoji: '🗺️', color: '#27ae60' },
    news:          { label: 'News',          emoji: '📰', color: '#e74c3c' },
    shopping:      { label: 'Shopping',      emoji: '🛍️', color: '#e67e22' },
    tool:          { label: 'Tool',          emoji: '🔧', color: '#95a5a6' },
    travel:        { label: 'Travel',        emoji: '✈️', color: '#f4c430' }
  };

  const STORAGE_KEY = 'bookmarkr.links';
  const BREAK_CATEGORY = '__break__';

  /** @type {HTMLElement|null} */
  const gridEl = document.getElementById('grid');
  /** @type {HTMLButtonElement|null} */
  const newLinkBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('newLinkBtn'));
  /** @type {HTMLButtonElement|null} */
  const addBreakBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('addBreakBtn'));
  /** @type {HTMLButtonElement|null} */
  const helpBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('helpBtn'));
  /** @type {HTMLButtonElement|null} */
  const resetBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('resetBtn'));
  /** @type {HTMLElement|null} */
  const helpModal = document.getElementById('helpModal');
  /** @type {HTMLButtonElement|null} */
  const helpCloseBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('helpCloseBtn'));

  // Modal elements
  /** @type {HTMLElement|null} */
  const modalEl = document.getElementById('modal');
  /** @type {HTMLFormElement|null} */
  const formEl = /** @type {HTMLFormElement|null} */ (document.getElementById('linkForm'));
  /** @type {HTMLInputElement|null} */
  const idInput = /** @type {HTMLInputElement|null} */ (document.getElementById('linkId'));
  /** @type {HTMLSelectElement|null} */
  const emojiSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('emojiPreset'));
  const colorSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('colorPreset'));
  const emojiInput = /** @type {HTMLInputElement|null} */ (document.getElementById('emojiCode'));
  const colorInput = /** @type {HTMLInputElement|null} */ (document.getElementById('colorCode'));
  const emojiPreview = document.getElementById('emojiPreview');
  const colorPreview = document.getElementById('colorPreview');
  const emojiError = document.getElementById('emojiError');
  const colorError = document.getElementById('colorError');
  /** @type {HTMLInputElement|null} */
  const titleInput = /** @type {HTMLInputElement|null} */ (document.getElementById('title'));
  /** @type {HTMLInputElement|null} */
  const urlInput = /** @type {HTMLInputElement|null} */ (document.getElementById('url'));
  /** @type {HTMLButtonElement|null} */
  const saveBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('saveBtn'));
  /** @type {HTMLButtonElement|null} */
  const cancelBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('cancelBtn'));
  /** @type {HTMLButtonElement|null} */
  const deleteBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('deleteBtn'));
  /** @type {HTMLElement|null} */
  const modalTitleEl = document.getElementById('modalTitle');
  /** @type {HTMLElement|null} */
  const previewTile = document.getElementById('previewTile');
  /** @type {HTMLElement|null} */
  const previewIcon = document.getElementById('previewIcon');
  /** @type {HTMLAnchorElement|null} */
  const previewLink = /** @type {HTMLAnchorElement|null} */ (document.getElementById('previewLink'));
  /** @type {HTMLElement|null} */
  const previewTitle = document.getElementById('previewTitle');

  if (!gridEl || !newLinkBtn || !addBreakBtn || !helpBtn || !resetBtn || !helpModal || !helpCloseBtn || !modalEl || !formEl || !idInput || !emojiSelect || !colorSelect || !emojiInput || !colorInput || !emojiPreview || !colorPreview || !emojiError || !colorError || !titleInput || !urlInput || !saveBtn || !cancelBtn || !deleteBtn || !modalTitleEl || !previewTile || !previewIcon || !previewLink || !previewTitle) {
    // Missing essential elements: abort setup gracefully.
    return;
  }

  /** @type {Link[]} */
  let links = loadLinks();
  /** @type {string|null} */
  let draggingId = null;

  // Emoji and color presets are independent choices.
  (function populateAppearanceSelects() {
    Object.keys(CATEGORIES).forEach((key) => {
      const preset = CATEGORIES[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${preset.emoji} ${preset.label}`;
      emojiSelect.appendChild(opt);
      const colorOpt = document.createElement('option');
      colorOpt.value = preset.color;
      colorOpt.textContent = `${preset.label} (${preset.color})`;
      colorSelect.appendChild(colorOpt);
    });
  })();

  // Event wiring
  newLinkBtn.addEventListener('click', () => {
    openModalForCreate();
  });
  addBreakBtn.addEventListener('click', () => {
    addBreakTile();
  });
  helpBtn.addEventListener('click', () => openHelpModal());
  resetBtn.addEventListener('click', resetBoard);
  helpCloseBtn.addEventListener('click', () => closeHelpModal());
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
  });
  saveBtn.addEventListener('click', onSave);
  cancelBtn.addEventListener('click', () => closeModal());
  deleteBtn.addEventListener('click', onDeleteCurrent);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });
  emojiSelect.addEventListener('change', () => {
    if (emojiSelect.value) emojiInput.value = toUnicodeCode(CATEGORIES[emojiSelect.value].emoji);
    else { emojiInput.focus(); return; }
    updatePreview();
  });
  colorSelect.addEventListener('change', () => {
    if (colorSelect.value) colorInput.value = colorSelect.value;
    else { colorInput.focus(); return; }
    updatePreview();
  });
  emojiInput.addEventListener('input', updatePreview);
  colorInput.addEventListener('input', updatePreview);
  titleInput.addEventListener('input', updatePreview);
  urlInput.addEventListener('input', updatePreview);

  // Render initial state
  render();

  // Functions
  function resetBoard() {
    if (!window.confirm("Reset the board? All bookmarks, line breaks, and saved customizations in Bookmark'r will be deleted from this browser. This cannot be undone.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      window.alert('Unable to clear saved data. The board has not been reset.');
      return;
    }
    links = [];
    draggingId = null;
    closeModal();
    closeHelpModal();
    render();
    resetBtn.focus();
  }

  function loadLinks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Basic shape guard
      return parsed.filter((x) => x && typeof x.id === 'string' && typeof x.title === 'string' && typeof x.url === 'string' && typeof x.category === 'string');
    } catch (_) {
      return [];
    }
  }
  function saveLinks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }
  function render() {
    gridEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    links.forEach((link) => {
      frag.appendChild(createTile(link));
    });
    gridEl.appendChild(frag);
  }

  /** @param {Link} link */
  function createTile(link) {
    if (isBreak(link)) {
      return createBreakTile(link);
    }
    const tile = document.createElement('div');
    tile.className = `tile draggable category-${sanitizeCategory(link.category)}`;
    tile.tabIndex = 0;
    tile.setAttribute('role', 'group');
    tile.dataset.id = link.id;
    tile.draggable = true;
    const color = getLinkColor(link);
    if (color) {
      tile.style.borderColor = color;
    }

    const a = document.createElement('a');
    a.href = ensureUrl(link.url);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', link.title);

    const icon = document.createElement('span');
    icon.className = 'category-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = getLinkEmoji(link);
    a.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'tile-title';
    title.textContent = link.title;

    tile.appendChild(a);
    tile.appendChild(title);
    attachDragHandle(tile, link);

    // Long-press to edit
    attachLongPress(tile, () => openModalForEdit(link.id));

    // Drag & drop
    tile.addEventListener('dragstart', (e) => {
      draggingId = link.id;
      tile.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', link.id);
      // Limit drag image to tile for better UX
      try { e.dataTransfer?.setDragImage(tile, tile.clientWidth / 2, tile.clientHeight / 2); } catch (_) { /* noop */ }
    });
    tile.addEventListener('dragend', () => {
      draggingId = null;
      tile.classList.remove('dragging');
      clearDropHighlights();
    });
    tile.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggingId || draggingId === link.id) return;
      tile.classList.add('drop-target');
    });
    tile.addEventListener('dragleave', () => {
      tile.classList.remove('drop-target');
    });
    tile.addEventListener('drop', (e) => {
      e.preventDefault();
      tile.classList.remove('drop-target');
      const fromId = draggingId || e.dataTransfer?.getData('text/plain');
      if (!fromId || fromId === link.id) return;
      reorderByIds(fromId, link.id);
    });

    return tile;
  }

  /** @param {Link} link */
  function createBreakTile(link) {
    const tile = document.createElement('div');
    tile.className = 'tile break draggable';
    tile.dataset.id = link.id;
    tile.draggable = false;
    tile.setAttribute('role', 'group');
    tile.setAttribute('aria-label', 'Line break');
    attachDragHandle(tile, link);

    // Long-press to delete break quickly
    attachLongPress(tile, () => {
      const idx = links.findIndex((l) => l.id === link.id);
      if (idx >= 0) {
        const confirmed = window.confirm('Remove line break?');
        if (confirmed) {
          links.splice(idx, 1);
          saveLinks();
          render();
        }
      }
    });

    // Drag & drop behavior same as normal tiles
    tile.addEventListener('dragstart', (e) => {
      draggingId = link.id;
      tile.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', link.id);
      try { e.dataTransfer?.setDragImage(tile, tile.clientWidth / 2, tile.clientHeight / 2); } catch (_) { /* noop */ }
    });
    tile.addEventListener('dragend', () => {
      draggingId = null;
      tile.classList.remove('dragging');
      clearDropHighlights();
    });
    tile.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggingId || draggingId === link.id) return;
      tile.classList.add('drop-target');
    });
    tile.addEventListener('dragleave', () => {
      tile.classList.remove('drop-target');
    });
    tile.addEventListener('drop', (e) => {
      e.preventDefault();
      tile.classList.remove('drop-target');
      const fromId = draggingId || e.dataTransfer?.getData('text/plain');
      if (!fromId || fromId === link.id) return;
      reorderByIds(fromId, link.id);
    });

    return tile;
  }

  function clearDropHighlights() {
    const tiles = gridEl.querySelectorAll('.tile.drop-target');
    tiles.forEach((t) => t.classList.remove('drop-target'));
  }

  /**
   * Pointer capture keeps mouse, touch and pen drags on the handle or break, while the
   * rest of the tile remains available for scrolling, links and long-presses.
   * @param {HTMLElement} tile
   * @param {Link} link
   */
  function attachDragHandle(tile, link) {
    const breakTile = isBreak(link);
    const handle = breakTile ? tile : document.createElement('button');
    if (breakTile) {
      tile.tabIndex = 0;
    } else {
      handle.type = 'button';
      handle.className = 'drag-handle';
      handle.textContent = '⠿';
      tile.appendChild(handle);
    }
    handle.setAttribute('aria-label', `Reorder ${isBreak(link) ? 'line break' : link.title}`);
    handle.title = breakTile ? 'Drag to reorder, use arrow keys, or hold to remove' : 'Drag to reorder, or use arrow keys';

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let x = 0;
    let y = 0;
    let active = false;
    let targetId = null;
    let scrollFrame = null;

    function updateTarget() {
      clearDropHighlights();
      const target = document.elementFromPoint(x, y)?.closest('.tile[data-id]');
      targetId = target && gridEl.contains(target) && target !== tile ? target.dataset.id : null;
      if (targetId) target.classList.add('drop-target');
    }

    function autoScroll() {
      if (!active) return;
      // Keep distant rows reachable without lifting a finger.
      const edge = 48;
      const speed = y < edge ? -12 : y > window.innerHeight - edge ? 12 : 0;
      if (speed) {
        window.scrollBy(0, speed);
        updateTarget();
      }
      scrollFrame = window.requestAnimationFrame(autoScroll);
    }

    function finish(commit) {
      if (pointerId === null) return;
      const capturedId = pointerId;
      const destination = active && commit ? targetId : null;
      pointerId = null;
      active = false;
      targetId = null;
      draggingId = null;
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
      tile.classList.remove('dragging');
      clearDropHighlights();
      if (handle.hasPointerCapture(capturedId)) handle.releasePointerCapture(capturedId);
      if (destination) reorderByIds(link.id, destination);
    }

    handle.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || e.button !== 0 || pointerId !== null || draggingId) return;
      e.preventDefault();
      e.stopPropagation();
      pointerId = e.pointerId;
      startX = x = e.clientX;
      startY = y = e.clientY;
      handle.setPointerCapture(pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      x = e.clientX;
      y = e.clientY;
      if (!active && Math.hypot(x - startX, y - startY) < 6) return;
      e.preventDefault();
      if (!active) {
        active = true;
        draggingId = link.id;
        tile.classList.add('dragging');
        scrollFrame = window.requestAnimationFrame(autoScroll);
      }
      updateTarget();
    });
    handle.addEventListener('pointerup', (e) => {
      if (e.pointerId !== pointerId) return;
      x = e.clientX;
      y = e.clientY;
      if (active) updateTarget();
      finish(true);
    });
    handle.addEventListener('pointercancel', (e) => {
      if (e.pointerId === pointerId) finish(false);
    });
    handle.addEventListener('lostpointercapture', () => finish(false));
    // Avoid starting native HTML dragging or opening a touch context menu.
    ['dragstart', 'contextmenu', 'click'].forEach((name) => {
      handle.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    handle.addEventListener('keydown', (e) => {
      const offset = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!offset || pointerId !== null) return;
      e.preventDefault();
      const index = links.findIndex((item) => item.id === link.id);
      const destination = links[index + offset];
      if (!destination) return;
      reorderByIds(link.id, destination.id);
      const moved = Array.from(gridEl.children).find((item) => item.dataset.id === link.id);
      (breakTile ? moved : moved?.querySelector('.drag-handle'))?.focus();
    });
  }

  function reorderByIds(srcId, dstId) {
    const fromIdx = links.findIndex((l) => l.id === srcId);
    const toIdx = links.findIndex((l) => l.id === dstId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = links.splice(fromIdx, 1);
    links.splice(toIdx, 0, moved);
    saveLinks();
    render();
  }

  function openModalForCreate() {
    idInput.value = '';
    titleInput.value = '';
    urlInput.value = 'https://www.example.com';
    emojiInput.value = toUnicodeCode(CATEGORIES.ai.emoji);
    colorInput.value = CATEGORIES.ai.color;
    updatePreview();
    deleteBtn.hidden = true;
    modalTitleEl.textContent = 'New link';
    openModal();
  }
  function openModalForEdit(id) {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    if (isBreak(link)) {
      // Breaks have no editable fields; no-op
      return;
    }
    idInput.value = link.id;
    titleInput.value = link.title;
    urlInput.value = link.url;
    emojiInput.value = toUnicodeCode(getLinkEmoji(link));
    colorInput.value = getLinkColor(link);
    deleteBtn.hidden = false;
    modalTitleEl.textContent = 'Edit link';
    updatePreview();
    openModal();
  }
  function openModal() {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
    try { titleInput.focus(); } catch (_) { /* noop */ }
  }
  function closeModal() {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }
  function openHelpModal() {
    helpModal.classList.add('open');
    helpModal.setAttribute('aria-hidden', 'false');
    try { helpCloseBtn.focus(); } catch (_) { /* noop */ }
  }
  function closeHelpModal() {
    helpModal.classList.remove('open');
    helpModal.setAttribute('aria-hidden', 'true');
    try { helpBtn.focus(); } catch (_) { /* noop */ }
  }
  function updatePreview() {
    const emoji = parseUnicodeCode(emojiInput.value);
    const color = parseHexColor(colorInput.value);
    emojiSelect.value = Object.keys(CATEGORIES).find((key) => CATEGORIES[key].emoji === emoji) || '';
    colorSelect.value = Object.values(CATEGORIES).some((preset) => preset.color === color) ? color : '';
    emojiInput.setAttribute('aria-invalid', String(!emoji));
    colorInput.setAttribute('aria-invalid', String(!color));
    emojiError.textContent = emoji ? '' : 'Enter valid Unicode codes, e.g. U+1F916.';
    colorError.textContent = color ? '' : 'Enter a 3- or 6-digit hex color.';
    emojiPreview.textContent = emoji || '?';
    emojiPreview.setAttribute('aria-label', emoji ? `Emoji: ${toUnicodeCode(emoji)}` : 'Invalid Unicode code');
    colorPreview.style.backgroundColor = color || 'transparent';
    colorPreview.setAttribute('aria-label', color ? `Color: ${color}` : 'Invalid hex color');
    const title = titleInput.value || 'Title';
    const url = ensureUrl(urlInput.value || '#');
    previewTile.className = 'tile preview-tile';
    previewTitle.textContent = title;
    previewIcon.textContent = emoji || '?';
    previewIcon.setAttribute('aria-label', emoji ? `Icon: ${toUnicodeCode(emoji)}` : 'Invalid Unicode code');
    previewLink.href = url;
    previewTile.style.borderColor = color || 'transparent';
  }
  /** @param {MouseEvent} e */
  function onSave(e) {
    e.preventDefault();
    const title = titleInput.value.trim();
    let url = urlInput.value.trim();
    const emoji = parseUnicodeCode(emojiInput.value);
    const color = parseHexColor(colorInput.value);
    updatePreview();

    if (!title || !url) {
      // Basic validation feedback via focus
      if (!title) try { titleInput.focus(); } catch (_) { /* noop */ }
      else if (!url) try { urlInput.focus(); } catch (_) { /* noop */ }
      return;
    }
    if (!emoji || !color) {
      (emoji ? colorInput : emojiInput).focus();
      return;
    }
    const emojiCode = toUnicodeCode(emoji);
    const existing = links.find((link) => link.id === idInput.value);
    const category = emojiSelect.value || sanitizeCategory(existing?.category || 'ai');
    url = ensureUrl(url);
    const existingId = idInput.value;
    if (existingId) {
      // Update
      const idx = links.findIndex((l) => l.id === existingId);
      if (idx >= 0) {
        links[idx] = { ...links[idx], title, url, category, emojiCode, color };
      }
    } else {
      // Create
      const newLink = {
        id: generateId(),
        title,
        url,
        category,
        emojiCode,
        color
      };
      links.push(newLink);
    }
    saveLinks();
    render();
    closeModal();
  }
  function onDeleteCurrent(e) {
    e.preventDefault();
    const existingId = idInput.value;
    if (!existingId) return;
    const idx = links.findIndex((l) => l.id === existingId);
    if (idx >= 0) {
      links.splice(idx, 1);
      saveLinks();
      render();
    }
    closeModal();
  }

  // Utilities
  function toUnicodeCode(text) {
    return Array.from(text, (character) => `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ');
  }
  function parseUnicodeCode(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const codes = value.trim().split(/\s+/);
    const points = [];
    for (const code of codes) {
      const match = /^(?:U\+|0x)?([0-9a-f]{1,6})$/i.exec(code);
      if (!match) return null;
      const point = parseInt(match[1], 16);
      if (point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return null;
      points.push(point);
    }
    return points.map((point) => String.fromCodePoint(point)).join('');
  }
  function parseHexColor(value) {
    if (typeof value !== 'string') return null;
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
    if (!match) return null;
    const hex = match[1].toLowerCase();
    return `#${hex.length === 3 ? Array.from(hex, (digit) => digit + digit).join('') : hex}`;
  }
  /** @param {Link} link */
  function getLinkEmoji(link) {
    return parseUnicodeCode(link.emojiCode) || CATEGORIES[sanitizeCategory(link.category)].emoji;
  }
  /** @param {Link} link */
  function getLinkColor(link) {
    return parseHexColor(link.color) || getCategoryColor(link.category);
  }
  function generateId() {
    // Simple unique-ish id
    const rnd = Math.floor(Math.random() * 1e9).toString(36);
    return `l_${Date.now().toString(36)}_${rnd}`;
  }
  function ensureUrl(url) {
    if (!url) return '#';
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }
  function sanitizeCategory(key) {
    return Object.prototype.hasOwnProperty.call(CATEGORIES, key) ? key : 'news';
  }
  function getCategoryColor(key) {
    const k = sanitizeCategory(key);
    const def = CATEGORIES[k];
    return def && typeof def.color === 'string' ? def.color : '';
  }
  /** @param {Link} link */
  function isBreak(link) {
    return link.category === BREAK_CATEGORY;
  }
  function addBreakTile() {
    const breaker = { id: generateId(), title: '', url: '', category: BREAK_CATEGORY };
    links.push(breaker);
    saveLinks();
    render();
  }
  /**
   * Attach long-press handler to an element. Press ~600ms to trigger.
   * @param {HTMLElement} el
   * @param {() => void} onPress
   */
  function attachLongPress(el, onPress) {
    let timer = /** @type {number|null} */ (null);
    let startX = 0;
    let startY = 0;
    const MOVE_THRESHOLD = 6; // px

    function beginTimer() {
      clearTimer();
      timer = window.setTimeout(() => {
        timer = null;
        onPress();
      }, 600);
    }
    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }
    function cancel() { clearTimer(); }

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.drag-handle')) return;
      if (!e.isPrimary || e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      beginTimer();
    });
    el.addEventListener('pointermove', (e) => {
      if (timer === null) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) >= MOVE_THRESHOLD) {
        clearTimer();
      }
    });
    // Cancel on end/cancel/leave and when native drag starts
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('lostpointercapture', cancel);
    el.addEventListener('dragstart', cancel);
  }
})();


