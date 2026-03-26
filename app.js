'use strict';

const inputs = {
  ppo2: document.getElementById('ppo2'),
  pct:  document.getElementById('pct'),
  pabs: document.getElementById('pabs'),
};
const status     = document.getElementById('status');
const btnReset   = document.getElementById('btn-reset');
const depthHint  = document.getElementById('depth-hint');

function updateDepth(pabsVal) {
  if (!depthHint) return;
  if (pabsVal === null || pabsVal < 1) { depthHint.textContent = ''; return; }
  const depth = Math.round((pabsVal - 1) * 10);
  depthHint.textContent = '≈ ' + depth + ' m';
}

// Garde la trace de quel champ a été modifié en dernier
// pour déterminer lequel calculer
const lastEdited = { order: [] };

function markEdited(key) {
  lastEdited.order = lastEdited.order.filter(k => k !== key);
  lastEdited.order.push(key);
  // Garde seulement les 2 derniers
  if (lastEdited.order.length > 2) lastEdited.order.shift();
}

function getValue(key) {
  const raw = inputs[key].value.replace(',', '.');
  const v = parseFloat(raw);
  return isNaN(v) ? null : v;
}

function setValue(key, value, warn) {
  const input = inputs[key];
  const rounded = Math.round(value * 1000) / 1000;
  input.value = rounded;
  input.classList.remove('computed', 'computed-warning');
  // Force reflow pour relancer l'animation
  void input.offsetWidth;
  input.classList.add(warn ? 'computed-warning' : 'computed');
}

function clearComputed(key) {
  inputs[key].classList.remove('computed', 'computed-warning');
}

function setStatus(msg, type) {
  status.textContent = msg;
  status.className = 'status-bar' + (type ? ' ' + type : '');
}

function compute() {
  const ppo2 = getValue('ppo2');
  const pct  = getValue('pct');
  const pabs = getValue('pabs');

  const filled = [
    ppo2 !== null ? 'ppo2' : null,
    pct  !== null ? 'pct'  : null,
    pabs !== null ? 'pabs' : null,
  ].filter(Boolean);

  if (filled.length < 2) {
    setStatus('Remplissez 2 champs pour calculer le 3ème', '');
    return;
  }

  // Détermine le champ à calculer : celui qui n'est PAS dans les 2 derniers édités
  // Si les 2 derniers édités sont parmi les champs remplis, on calcule le troisième
  const edited2 = lastEdited.order.slice(-2);
  let toCompute = null;

  if (filled.length === 2) {
    // Exactement 2 remplis → calculer le vide
    toCompute = ['ppo2','pct','pabs'].find(k => !filled.includes(k));
  } else {
    // 3 remplis → calculer le moins récemment édité
    toCompute = ['ppo2','pct','pabs'].find(k => !edited2.includes(k));
  }

  // Nettoie le style calculé sur les champs édités
  ['ppo2','pct','pabs'].forEach(k => {
    if (k !== toCompute) clearComputed(k);
  });

  if (toCompute === 'ppo2') {
    if (pct === null || pabs === null) return;
    if (pct < 0 || pct > 100) { setStatus('⚠️ %O₂ doit être entre 0 et 100', 'warning'); return; }
    if (pabs <= 0)             { setStatus('⚠️ Pabs doit être > 0', 'warning'); return; }
    const result = (pct / 100) * pabs;
    setValue('ppo2', result, result > 1.4);
    showWarning(result);

  } else if (toCompute === 'pct') {
    if (ppo2 === null || pabs === null) return;
    if (pabs <= 0) { setStatus('⚠️ Pabs doit être > 0', 'warning'); return; }
    const result = (ppo2 / pabs) * 100;
    if (result < 0 || result > 100) { setStatus('⚠️ Résultat %O₂ impossible (' + result.toFixed(1) + '%)', 'warning'); return; }
    setValue('pct', result, false);
    showWarning(ppo2);

  } else if (toCompute === 'pabs') {
    if (ppo2 === null || pct === null) return;
    if (pct <= 0) { setStatus('⚠️ %O₂ doit être > 0', 'warning'); return; }
    const result = ppo2 / (pct / 100);
    setValue('pabs', result, false);
    updateDepth(result);
    showWarning(ppo2);
  }

  // Mise à jour profondeur si Pabs est saisi manuellement
  if (toCompute !== 'pabs') updateDepth(pabs);
}

function showWarning(ppo2Val) {
  if (ppo2Val > 1.6) {
    setStatus('🚨 PpO₂ = ' + ppo2Val.toFixed(3) + ' bar — DANGER hyperoxie !', 'warning');
  } else if (ppo2Val > 1.4) {
    setStatus('⚠️ PpO₂ = ' + ppo2Val.toFixed(3) + ' bar — Limite déco atteinte', 'warning');
  } else {
    setStatus('✅ PpO₂ = ' + ppo2Val.toFixed(3) + ' bar — OK pour la plongée loisir', 'ok');
  }
}

function onInput(key) {
  return function () {
    markEdited(key);
    compute();
  };
}

inputs.ppo2.addEventListener('input', onInput('ppo2'));
inputs.pct.addEventListener('input',  onInput('pct'));
inputs.pabs.addEventListener('input', onInput('pabs'));

btnReset.addEventListener('click', () => {
  Object.values(inputs).forEach(inp => {
    inp.value = '';
    inp.classList.remove('computed', 'computed-warning');
  });
  lastEdited.order = [];
  depthHint.textContent = '';
  setStatus('Remplissez 2 champs pour calculer le 3ème', '');
});
