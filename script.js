'use strict';

/* ---------- Logica di conversione ---------- */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE_NAMES = { 2: 'binario', 8: 'ottale', 10: 'decimale', 16: 'esadecimale' };
const POW2_BITS = { 2: 1, 4: 2, 8: 3, 16: 4 };

function clean(raw) {
  return String(raw).replace(/[\s_]/g, '').toUpperCase();
}

// Restituisce { empty } | { error: carattere non valido } | { value: BigInt, digits: stringa normalizzata }
function parseNumber(raw, base) {
  const s = clean(raw);
  if (!s) return { empty: true };
  const b = BigInt(base);
  let value = 0n;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { error: ch };
    value = value * b + BigInt(d);
  }
  return { value, digits: s.replace(/^0+(?=.)/, '') };
}

function toBase(value, base) {
  if (value === 0n) return '0';
  const b = BigInt(base);
  let out = '';
  for (let n = value; n > 0n; n /= b) out = DIGITS[Number(n % b)] + out;
  return out;
}

/* ---------- Passaggi ---------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function withBase(digits, base) {
  return `${digits}<sub class="base">${base}</sub>`;
}

// Cifra con il suo valore tra parentesi quando è una lettera: "A (10)"
function digitLabel(ch) {
  const v = DIGITS.indexOf(ch);
  return v > 9 ? `${ch} <span class="dim">(${v})</span>` : ch;
}

function stepBlock(n, title, body, solo) {
  return `<div class="step${solo ? ' solo' : ''}"><h3><span class="n">${n}</span>${title}</h3>${body}</div>`;
}

function toDecimalStep(digits, base, value) {
  const b = BigInt(base);
  const last = digits.length - 1;
  const products = [];
  const rows = [...digits].map((ch, i) => {
    const pos = last - i;
    const d = BigInt(DIGITS.indexOf(ch));
    const product = d * b ** BigInt(pos);
    products.push(product);
    return `<tr><td>${digitLabel(ch)}</td><td>${d} × ${base}<sup>${pos}</sup></td><td class="r">${product}</td></tr>`;
  }).join('');
  const sum = products.length > 1 ? `${products.join(' + ')} = ` : '';
  return `
    <p>Moltiplica ogni cifra per ${base} elevato alla sua posizione (contando da 0 a partire da destra), poi somma i risultati.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Cifra</th><th>Calcolo</th><th class="r">Valore</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="line mono">${sum}<strong>${value}</strong></p>`;
}

function fromDecimalStep(value, base) {
  const b = BigInt(base);
  let rows = '';
  for (let n = value; n > 0n; n /= b) {
    const r = Number(n % b);
    const digit = r > 9 ? `${r} → ${DIGITS[r]}` : `${r}`;
    rows += `<tr><td>${n} ÷ ${base}</td><td>${n / b}</td><td class="r hl">${digit}</td></tr>`;
  }
  return `
    <p>Dividi ripetutamente per ${base} annotando ogni resto, finché il quoziente diventa 0.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Divisione</th><th>Quoziente</th><th class="r">Resto</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="line">Leggi i resti dal basso verso l'alto: <strong class="mono">${toBase(value, base)}</strong></p>`;
}

// Metodo rapido tra basi potenze di 2: si passa dal binario raggruppando i bit.
function shortcutStep(digits, from, to) {
  const kFrom = POW2_BITS[from];
  const kTo = POW2_BITS[to];
  let html = '';
  let bits = digits;

  if (from !== 2) {
    const groups = [...digits].map(ch => DIGITS.indexOf(ch).toString(2).padStart(kFrom, '0'));
    const rows = [...digits].map((ch, i) => `<tr><td>${digitLabel(ch)}</td><td class="r">${groups[i]}</td></tr>`).join('');
    bits = groups.join('');
    html += `
      <p>${from} = 2<sup>${kFrom}</sup>, quindi ogni cifra in base ${from} corrisponde esattamente a ${kFrom} bit.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Cifra</th><th class="r">Binario</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="line">In binario: <strong class="mono">${groups.join(' ')}</strong></p>`;
  }

  if (to !== 2) {
    bits = bits.replace(/^0+(?=.)/, '');
    const padded = bits.padStart(Math.ceil(bits.length / kTo) * kTo, '0');
    const groups = padded.match(new RegExp(`.{${kTo}}`, 'g'));
    const rows = groups.map(g => {
      const v = parseInt(g, 2);
      return `<tr><td>${g}</td><td class="r hl">${v > 9 ? `${v} → ${DIGITS[v]}` : v}</td></tr>`;
    }).join('');
    html += `
      <p${from !== 2 ? ' style="margin-top:14px"' : ''}>${to} = 2<sup>${kTo}</sup>: raggruppa i bit a ${kTo} a ${kTo} partendo da destra (aggiungendo zeri a sinistra se servono) e converti ogni gruppo.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Gruppo</th><th class="r">Cifra</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  } else {
    html += `<p class="line">Togli gli eventuali zeri iniziali: <strong class="mono">${bits.replace(/^0+(?=.)/, '')}</strong></p>`;
  }
  return html;
}

function buildSteps(digits, from, to, value) {
  const result = toBase(value, to);
  const final = `<p class="final">${withBase(digits, from)} = ${withBase(result, to)}</p>`;

  if (from === to) {
    return `<div class="step"><p>La base di partenza e quella di arrivo coincidono: il numero resta invariato.</p></div>${final}`;
  }
  if (value === 0n) {
    return `<div class="step"><p>Lo zero si scrive 0 in qualsiasi base.</p></div>${final}`;
  }

  const blocks = [];
  if (from !== 10) {
    blocks.push([`Da base ${from} a base 10`, toDecimalStep(digits, from, value)]);
  }
  if (to !== 10) {
    blocks.push([`Da base 10 a base ${to}`, fromDecimalStep(value, to)]);
  }
  let html = blocks.map(([title, body], i) => stepBlock(i + 1, title, body, blocks.length === 1)).join('');
  if (POW2_BITS[from] && POW2_BITS[to]) {
    html += stepBlock('+', 'Metodo rapido', shortcutStep(digits, from, to));
  }
  return html + final;
}

if (typeof module !== 'undefined') {
  module.exports = { parseNumber, toBase, buildSteps };
}

/* ---------- Interfaccia ---------- */

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);

  function fillBases(select, selected, withRandom) {
    let html = withRandom ? '<option value="random">Casuale</option>' : '';
    for (let b = 2; b <= 16; b++) {
      html += `<option value="${b}">${b}${BASE_NAMES[b] ? ` · ${BASE_NAMES[b]}` : ''}</option>`;
    }
    select.innerHTML = html;
    select.value = String(selected);
  }

  function invalidDigitMessage(ch, base) {
    if (ch === '-' || ch === ',' || ch === '.') return 'Sono ammessi solo numeri interi non negativi.';
    const max = DIGITS[base - 1];
    const range = base <= 10 ? `0–${max}` : `0–9 e A–${max}`;
    return `«${ch}» non è una cifra valida in base ${base} (cifre ammesse: ${range}).`;
  }

  /* Schede */

  const tabs = [$('tab-convert'), $('tab-train')];

  function selectTab(tab) {
    if (tab.getAttribute('aria-selected') === 'true') return;
    const index = tabs.indexOf(tab);
    // Il pannello entra dal lato verso cui scorre l'indicatore delle schede.
    $(tab.getAttribute('aria-controls')).dataset.dir = index > 0 ? 'right' : 'left';
    tab.parentElement.style.setProperty('--i', index);
    for (const t of tabs) {
      const active = t === tab;
      t.setAttribute('aria-selected', active);
      t.tabIndex = active ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !active;
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + 1) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  /* Convertitore */

  const cInput = $('c-input'), cFrom = $('c-from'), cTo = $('c-to');
  const cOutput = $('c-output'), cError = $('c-error'), cCopy = $('c-copy');
  const cSteps = $('c-steps'), cStepsBody = $('c-steps-body');
  let cResult = '';

  fillBases(cFrom, 2);
  fillBases(cTo, 10);

  function convert() {
    const from = Number(cFrom.value), to = Number(cTo.value);
    const parsed = parseNumber(cInput.value, from);
    const ok = parsed.value !== undefined;

    cInput.classList.toggle('invalid', !!parsed.error);
    cError.hidden = !parsed.error;
    cCopy.hidden = !ok;
    cSteps.hidden = !ok;

    if (!ok) {
      cResult = '';
      cOutput.textContent = '—';
      if (parsed.error) cError.textContent = invalidDigitMessage(parsed.error, from);
      return;
    }
    cResult = toBase(parsed.value, to);
    cOutput.innerHTML = withBase(cResult, to);
    cStepsBody.innerHTML = buildSteps(parsed.digits, from, to, parsed.value);
  }

  cInput.addEventListener('input', convert);
  cFrom.addEventListener('change', convert);
  cTo.addEventListener('change', convert);

  $('c-swap').addEventListener('click', () => {
    const from = cFrom.value;
    cFrom.value = cTo.value;
    cTo.value = from;
    if (cResult) cInput.value = cResult;
    convert();
  });

  cCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cResult);
      cCopy.textContent = 'Copiato';
    } catch {
      cCopy.textContent = 'Non riuscito';
    }
    setTimeout(() => { cCopy.textContent = 'Copia'; }, 1400);
  });

  /* Allenamento */

  const tFrom = $('t-from'), tTo = $('t-to'), tLevel = $('t-level');
  const tPrompt = $('t-prompt'), tNumber = $('t-number'), tAnswer = $('t-answer');
  const tCheck = $('t-check'), tFeedback = $('t-feedback');
  const tSteps = $('t-steps'), tStepsBody = $('t-steps-body'), tScore = $('t-score');

  const COMMON_BASES = [2, 8, 10, 16];
  const LEVELS = { easy: [4, 255], medium: [256, 4095], hard: [4096, 65535] };
  const score = { right: 0, total: 0 };
  let exercise = null;
  let prev = { from: 'random', to: '10' };

  fillBases(tFrom, 'random', true);
  fillBases(tTo, 10);

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function newExercise() {
    const to = Number(tTo.value);
    let from = Number(tFrom.value);
    if (tFrom.value === 'random') {
      const pool = COMMON_BASES.filter(b => b !== to);
      from = pool[randomInt(0, pool.length - 1)];
    }
    const [min, max] = LEVELS[tLevel.value];
    const value = BigInt(randomInt(min, max));
    exercise = { from, to, value, digits: toBase(value, from), done: false };

    tPrompt.textContent = `Converti in base ${to}`;
    tNumber.innerHTML = withBase(exercise.digits, from);
    tAnswer.value = '';
    tAnswer.disabled = false;
    tAnswer.classList.remove('invalid');
    tCheck.disabled = false;
    tFeedback.hidden = true;
    tSteps.hidden = true;
    tSteps.open = false;
  }

  function checkAnswer() {
    if (!exercise || exercise.done) return;
    const { from, to, value, digits } = exercise;
    const parsed = parseNumber(tAnswer.value, to);
    if (parsed.empty) {
      tAnswer.focus();
      return;
    }
    const correct = parsed.value === value;
    const solution = toBase(value, to);

    exercise.done = true;
    score.total++;
    if (correct) score.right++;

    tAnswer.disabled = true;
    tCheck.disabled = true;
    tFeedback.hidden = false;
    tFeedback.className = `feedback ${correct ? 'ok' : 'bad'}`;
    if (correct) {
      tFeedback.innerHTML = `<strong>Corretto!</strong><span class="mono">${withBase(digits, from)} = ${withBase(solution, to)}</span>`;
    } else {
      const why = parsed.error
        ? `<span>${esc(invalidDigitMessage(parsed.error, to))}</span>`
        : `<span>La tua risposta: <span class="mono">${esc(clean(tAnswer.value))}</span></span>`;
      tFeedback.innerHTML = `<strong>Non è corretto.</strong>${why}<span>Risposta giusta: <strong class="mono">${withBase(solution, to)}</strong></span>`;
    }

    tStepsBody.innerHTML = buildSteps(digits, from, to, value);
    tSteps.hidden = false;
    tSteps.open = !correct;

    tScore.textContent = `${score.right} / ${score.total}`;
    $('t-new').focus();
  }

  // Le due basi non possono coincidere: se succede, l'altra prende il valore precedente.
  function onBaseChange(changed, other, prevChanged) {
    if (changed.value === other.value) {
      other.value = prevChanged !== 'random' ? prevChanged : (changed.value === '10' ? '2' : '10');
    }
    prev = { from: tFrom.value, to: tTo.value };
    newExercise();
  }

  tFrom.addEventListener('change', () => onBaseChange(tFrom, tTo, prev.from));
  tTo.addEventListener('change', () => onBaseChange(tTo, tFrom, prev.to));
  tLevel.addEventListener('change', newExercise);
  $('t-new').addEventListener('click', () => { newExercise(); tAnswer.focus(); });
  $('t-form').addEventListener('submit', e => { e.preventDefault(); checkAnswer(); });

  newExercise();
}
