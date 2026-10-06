'use strict';
const levels = { easy: { rows: 9, cols: 9, mines: 10 }, medium: { rows: 16, cols: 16, mines: 40 }, hard: { rows: 16, cols: 30, mines: 99 } };
const board = document.querySelector('#board');
const statusText = document.querySelector('#status');
let level = 'easy', cells = [], started = false, ended = false, flagMode = false, flags = 0, opened = 0, startTime = 0, interval;
const elapsed = () => started ? Math.floor((performance.now() - startTime) / 1000) : 0;
function neighbors(index) {
  const { rows, cols } = levels[level], r = Math.floor(index / cols), c = index % cols, result = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if ((dr || dc) && r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) result.push((r + dr) * cols + c + dc);
  }
  return result;
}
function bestTime() { try { const value = localStorage.getItem('minefield-best-' + level); return value !== null && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null; } catch { return null; } }
function updateBest() { const best = bestTime(); document.querySelector('#best').textContent = best === null ? '—' : best + ' s'; }
function updateFlags() { document.querySelector('#remaining').textContent = levels[level].mines - flags; }
function render(index) {
  const cell = cells[index], button = cell.button;
  button.className = 'cell' + (cell.open ? ' open' : '') + (cell.flag ? ' flagged' : '') + (cell.open && cell.mine ? ' mine' : '') + (cell.exploded ? ' exploded' : '');
  button.textContent = cell.open ? (cell.mine ? '✹' : cell.number || '') : cell.flag ? '⚑' : '';
  button.dataset.number = cell.open ? cell.number : '';
  button.setAttribute('aria-label', `${Math.floor(index / levels[level].cols) + 1}行 ${index % levels[level].cols + 1}列、${cell.open ? cell.mine ? '地雷' : cell.number ? '周囲の地雷 ' + cell.number : '空白' : cell.flag ? '旗' : '未開封'}`);
}
function reset() {
  clearInterval(interval); started = false; ended = false; flags = 0; opened = 0;
  const { rows, cols } = levels[level]; board.replaceChildren(); board.style.gridTemplateColumns = `repeat(${cols}, var(--unused, auto))`;
  cells = Array.from({ length: rows * cols }, (_, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cell'; button.dataset.index = i; button.tabIndex = i === 0 ? 0 : -1; board.append(button);
    return { mine: false, open: false, flag: false, number: 0, button };
  });
  cells.forEach((_, i) => render(i)); document.querySelector('#timer').textContent = '000'; updateFlags(); updateBest(); statusText.textContent = '好きなマスを開いて、スタート。';
}
function plant(first) {
  const safe = new Set([first, ...neighbors(first)]), pool = cells.map((_, i) => i).filter(i => !safe.has(i));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  pool.slice(0, levels[level].mines).forEach(i => { cells[i].mine = true; });
  cells.forEach((cell, i) => { cell.number = neighbors(i).filter(n => cells[n].mine).length; });
  started = true; startTime = performance.now(); interval = setInterval(() => { document.querySelector('#timer').textContent = String(elapsed()).padStart(3, '0'); }, 200);
  statusText.textContent = '数字を手がかりに、安全なマスを探そう。';
}
function finish(won) {
  ended = true; clearInterval(interval); const time = elapsed(); document.querySelector('#timer').textContent = String(time).padStart(3, '0');
  if (won) {
    cells.forEach((c, i) => { if (c.mine) { c.flag = true; render(i); } }); flags = levels[level].mines; updateFlags();
    const best = bestTime(); if (best === null || time < best) { try { localStorage.setItem('minefield-best-' + level, String(time)); } catch {} } updateBest();
    statusText.textContent = `クリア！ ${time}秒で、すべての安全なマスを発見。`;
  } else {
    cells.forEach((c, i) => { if (c.mine) { c.open = true; render(i); } }); statusText.textContent = '地雷を発見！「新しいゲーム」で再挑戦。';
  }
}
function reveal(index) {
  if (ended || cells[index].flag || cells[index].open) return;
  if (!started) plant(index);
  if (cells[index].mine) { cells[index].exploded = true; finish(false); return; }
  const stack = [index];
  while (stack.length) { const i = stack.pop(), cell = cells[i]; if (cell.open || cell.flag || cell.mine) continue; cell.open = true; opened++; render(i); if (cell.number === 0) stack.push(...neighbors(i)); }
  if (opened === cells.length - levels[level].mines) finish(true);
}
function toggleFlag(index) {
  const cell = cells[index]; if (ended || cell.open) return;
  if (!cell.flag && flags >= levels[level].mines) { statusText.textContent = '旗を使い切りました。ほかの旗を外すと設置できます。'; return; }
  cell.flag = !cell.flag; flags += cell.flag ? 1 : -1; render(index); updateFlags();
}
board.addEventListener('click', event => { const b = event.target.closest('.cell'); if (b) flagMode ? toggleFlag(Number(b.dataset.index)) : reveal(Number(b.dataset.index)); });
board.addEventListener('contextmenu', event => { const b = event.target.closest('.cell'); if (b) { event.preventDefault(); toggleFlag(Number(b.dataset.index)); } });
board.addEventListener('keydown', event => {
  const b = event.target.closest('.cell'); if (!b) return; const i = Number(b.dataset.index), cols = levels[level].cols;
  if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFlag(i); return; }
  let next = i;
  if (event.key === 'ArrowLeft' && i % cols > 0) next--; else if (event.key === 'ArrowRight' && i % cols < cols - 1) next++; else if (event.key === 'ArrowUp' && i >= cols) next -= cols; else if (event.key === 'ArrowDown' && i + cols < cells.length) next += cols;
  if (event.key.startsWith('Arrow')) { event.preventDefault(); cells.forEach(c => { c.button.tabIndex = -1; }); cells[next].button.tabIndex = 0; cells[next].button.focus(); }
});
document.querySelector('#restart').addEventListener('click', reset);
document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => { level = button.dataset.level; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); reset(); }));
document.querySelector('#flag-mode').addEventListener('click', event => { flagMode = !flagMode; event.currentTarget.setAttribute('aria-pressed', String(flagMode)); event.currentTarget.querySelector('span').textContent = flagMode ? 'ON' : 'OFF'; });
reset();
