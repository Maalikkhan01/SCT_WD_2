document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const displayEl = document.getElementById('display');
  const startStopBtn = document.getElementById('startStop');
  const lapBtn = document.getElementById('lap');
  const resetBtn = document.getElementById('reset');
  const lapsList = document.getElementById('lapsList');
  const lapCountEl = document.getElementById('lapCount');
  const fastestLapEl = document.getElementById('fastestLap');
  const slowestLapEl = document.getElementById('slowestLap');
  const themeToggle = document.getElementById('themeToggle');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const exportLapsBtn = document.getElementById('exportLaps');
  const clearLapsBtn = document.getElementById('clearLaps');
  const timeFormatSelect = document.getElementById('timeFormat');
  const showMsCheckbox = document.getElementById('showMilliseconds');
  const enableSoundsCheckbox = document.getElementById('enableSounds');
  const enableVibrationCheckbox = document.getElementById('enableVibration');
  const ringCycleMsInput = document.getElementById('ringCycleMs');
  const clickSound = document.getElementById('clickSound');
  const lapSound = document.getElementById('lapSound');
  const ringCircle = document.querySelector('.progress-ring-circle');

  // State
  let isRunning = false;
  let startEpoch = 0;
  let elapsedMs = 0;                  // total elapsed
  let timerId = null;
  let laps = [];                      // array of lap intervals (ms)
  let lastLapCumulative = 0;          // cumulative at last lap for quick diff
  const r = 100;
  const circumference = 2 * Math.PI * r;

  // Init ring
  ringCircle.style.strokeDasharray = `${circumference}`;
  ringCircle.style.strokeDashoffset = `${circumference}`;

  // Theme init
  const savedTheme = localStorage.getItem('stopwatch_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Load settings
  const saved = JSON.parse(localStorage.getItem('stopwatch_settings') || '{}');
  if (saved.timeFormat) timeFormatSelect.value = saved.timeFormat;
  if (typeof saved.showMs === 'boolean') showMsCheckbox.checked = saved.showMs;
  if (typeof saved.sounds === 'boolean') enableSoundsCheckbox.checked = saved.sounds;
  if (typeof saved.vibrate === 'boolean') enableVibrationCheckbox.checked = saved.vibrate;
  if (typeof saved.ringCycleMs === 'number') ringCycleMsInput.value = saved.ringCycleMs;

  // Helpers
  const now = () => Date.now();

  function formatTime(ms) {
    const showMs = showMsCheckbox.checked;
    const fmt = timeFormatSelect.value;

    if (fmt === 'ss') {
      const totalSec = Math.floor(ms / 1000);
      const msPart = ms % 1000;
      return showMs ? `${totalSec}.${String(msPart).padStart(3,'0')}` : String(totalSec);
    }

    if (fmt === 'mmss') {
      const totalMin = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      const msPart = ms % 1000;
      const base = `${totalMin}:${String(sec).padStart(2,'0')}`;
      return showMs ? `${base}.${String(msPart).padStart(3,'0')}` : base;
    }

    // hhmmss
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const msPart = ms % 1000;
    const base = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return showMs ? `${base}.${String(msPart).padStart(3,'0')}` : base;
  }

  function updateDisplay() {
    displayEl.textContent = formatTime(elapsedMs);
    updateRing();
  }

  function updateRing() {
    const cycle = Math.max(1000, Number(ringCycleMsInput.value) || 60000);
    const progress = elapsedMs % cycle;
    const offset = circumference - (progress / cycle) * circumference;
    ringCircle.style.strokeDashoffset = `${offset}`;
  }

  function play(audio) {
    if (!enableSoundsCheckbox.checked) return;
    try { audio.currentTime = 0; audio.play(); } catch {}
  }

  function vibrate(ms) {
    if (enableVibrationCheckbox.checked && navigator.vibrate) navigator.vibrate(ms);
  }

  function tick() {
    elapsedMs = now() - startEpoch;
    updateDisplay();
  }

  // Controls
  function toggleStartStop() {
    play(clickSound); vibrate(30);
    if (isRunning) {
      clearInterval(timerId);
      timerId = null;
      startStopBtn.innerHTML = '<i class="fas fa-play"></i>';
      startStopBtn.classList.remove('running');
      resetBtn.disabled = false;
    } else {
      startEpoch = now() - elapsedMs;
      timerId = setInterval(tick, 16);
      startStopBtn.innerHTML = '<i class="fas fa-pause"></i>';
      startStopBtn.classList.add('running');
      resetBtn.disabled = true;
    }
    isRunning = !isRunning;
    lapBtn.disabled = !isRunning;
    animate(startStopBtn);
  }

  function addLap() {
    if (!isRunning) return;
    play(lapSound); vibrate(80);

    const interval = elapsedMs - lastLapCumulative; // interval since previous lap
    lastLapCumulative = elapsedMs;
    laps.push(interval);
    renderLaps();
    animate(lapBtn);
  }

  function resetAll() {
    play(clickSound); vibrate(30);
    if (timerId) clearInterval(timerId);
    isRunning = false;
    elapsedMs = 0;
    startEpoch = 0;
    laps = [];
    lastLapCumulative = 0;

    startStopBtn.innerHTML = '<i class="fas fa-play"></i>';
    startStopBtn.classList.remove('running');
    lapBtn.disabled = true;
    resetBtn.disabled = true;

    renderLaps();
    updateDisplay();
    animate(resetBtn);
  }

  // Laps rendering and stats
  function renderLaps() {
    lapsList.innerHTML = '';
    lapCountEl.textContent = String(laps.length);

    if (laps.length === 0) {
      fastestLapEl.textContent = '--:--.---';
      slowestLapEl.textContent = '--:--.---';
      return;
    }

    // find fastest/slowest by interval
    let fastestIdx = 0, slowestIdx = 0;
    let cum = 0;
    for (let i = 0; i < laps.length; i++) {
      if (laps[i] < laps[fastestIdx]) fastestIdx = i;
      if (laps[i] > laps[slowestIdx]) slowestIdx = i;
    }
    fastestLapEl.textContent = formatTime(laps[fastestIdx]);
    slowestLapEl.textContent = formatTime(laps[slowestIdx]);

    // Build list newest -> oldest
    cum = 0;
    const cumTotals = laps.map((v) => (cum += v)); // cumulative array

    for (let i = laps.length - 1; i >= 0; i--) {
      const li = document.createElement('li');
      const indexLabel = document.createElement('span');
      indexLabel.className = 'lap-number';
      indexLabel.textContent = `Lap ${i + 1}`;

      const times = document.createElement('span');
      times.className = 'lap-time';
      times.textContent = `${formatTime(laps[i])}`;
      const small = document.createElement('small');
      small.textContent = `(total ${formatTime(cumTotals[i])})`;
      times.appendChild(small);

      li.appendChild(indexLabel);
      li.appendChild(times);

      if (i === fastestIdx) li.classList.add('fastest-lap');
      if (i === slowestIdx) li.classList.add('slowest-lap');

      lapsList.appendChild(li);
    }
  }

  // Settings & theme
  function openSettings() {
    play(clickSound); vibrate(20);
    settingsPanel.style.display = 'grid';
    // Wrap content in inner panel for click-through prevention
    if (!settingsPanel.querySelector('.panel')) {
      const wrap = document.createElement('div');
      wrap.className = 'panel';
      // Move existing children into wrap
      const kids = Array.from(settingsPanel.childNodes);
      kids.forEach(k => wrap.appendChild(k));
      settingsPanel.appendChild(wrap);
    }
  }

  function closeSettingsPanel() {
    play(clickSound); vibrate(20);
    settingsPanel.style.display = 'none';
    saveSettings();
    updateDisplay();
  }

  function saveSettings() {
    const obj = {
      timeFormat: timeFormatSelect.value,
      showMs: showMsCheckbox.checked,
      sounds: enableSoundsCheckbox.checked,
      vibrate: enableVibrationCheckbox.checked,
      ringCycleMs: Math.max(1000, Number(ringCycleMsInput.value) || 60000)
    };
    localStorage.setItem('stopwatch_settings', JSON.stringify(obj));
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('stopwatch_theme', next);
    updateThemeIcon(next);
    play(clickSound); vibrate(20);
  }

  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }

  // CSV export
  function exportLaps() {
    play(clickSound); vibrate(20);
    if (laps.length === 0) return alert('No laps to export.');

    let csv = 'Lap Number,Lap Duration,Cumulative\n';
    let cum = 0;
    laps.forEach((lap, i) => {
      cum += lap;
      csv += `${i + 1},${formatTime(lap)},${formatTime(cum)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stopwatch_laps_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearLaps() {
    play(clickSound); vibrate(20);
    if (laps.length === 0) return;
    if (!confirm('Clear all lap times?')) return;
    laps = [];
    lastLapCumulative = elapsedMs; // keep cumulative aligned
    renderLaps();
  }

  function animate(el) {
    el.classList.add('button-press');
    setTimeout(() => el.classList.remove('button-press'), 180);
  }

  // Events
  startStopBtn.addEventListener('click', toggleStartStop);
  lapBtn.addEventListener('click', addLap);
  resetBtn.addEventListener('click', resetAll);
  themeToggle.addEventListener('click', toggleTheme);
  settingsBtn.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsPanel);
  exportLapsBtn.addEventListener('click', exportLaps);
  clearLapsBtn.addEventListener('click', clearLaps);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggleStartStop(); }
    else if (e.code === 'KeyL') { addLap(); }
    else if (e.code === 'KeyR') { resetAll(); }
    else if (e.code === 'KeyS') { openSettings(); }
    else if (e.code === 'KeyT') { toggleTheme(); }
  });

  // Click outside to close settings
  settingsPanel.addEventListener('click', (e) => {
    const panel = settingsPanel.querySelector('.panel');
    if (e.target === settingsPanel) closeSettingsPanel();
  });

  // Initial UI
  resetBtn.disabled = true;
  updateDisplay();
  renderLaps();
});
