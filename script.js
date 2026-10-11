'use strict';

/* ---------- Logica di conversione ---------- */

const DIGITS = '0123456789ABCDEF';
const BASE_NAMES = { 2: 'binario', 8: 'ottale', 10: 'decimale', 16: 'esadecimale' };
const POW2_BITS = { 2: 1, 4: 2, 8: 3, 16: 4 };
const AUTO_BITS = [4, 8, 16, 32, 64];
const MAX_FRAC = 12;     // cifre dopo la virgola mostrate quando l'espansione non termina
const EXACT_FRAC = 260;  // oltre questa lunghezza l'espansione è considerata non terminante
const MINUS = '−';
const FORMAT_MSG = 'Formato non valido: usa una sola virgola e il segno − soltanto all\'inizio.';

function clean(raw) {
  return String(raw).replace(/[\s_]/g, '').toUpperCase().replace(/−/g, '-').replace(/\./g, ',');
}

function invalidDigitMessage(ch, base) {
  const max = DIGITS[base - 1];
  const range = base <= 10 ? `0–${max}` : `0–9 e A–${max}`;
  return `«${ch}» non è una cifra valida in base ${base} (cifre ammesse: ${range}).`;
}

function digitsToBig(str, b) {
  let value = 0n;
  for (const ch of str) value = value * b + BigInt(DIGITS.indexOf(ch));
  return value;
}

// Restituisce { empty } | { error } | il numero come frazione esatta num/den con il segno a parte.
function parseNumber(raw, base) {
  const s = clean(raw);
  const m = /^([+-]?)([^,+-]*)(?:,([^,+-]*))?$/.exec(s);
  if (!m) return { error: { format: true } };
  const [, sign, rawInt, rawFrac = ''] = m;
  if (!rawInt && !rawFrac) return { empty: true };
  for (const ch of rawInt + rawFrac) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { error: { ch } };
  }
  const intDigits = rawInt.replace(/^0+/, '') || '0';
  const fracDigits = rawFrac.replace(/0+$/, '');
  const b = BigInt(base);
  const num = digitsToBig(intDigits + fracDigits, b);
  return {
    hasSign: sign === '-',
    neg: sign === '-' && num > 0n,
    rawInt: rawInt || '0', rawFrac, intDigits, fracDigits,
    num, den: b ** BigInt(fracDigits.length),
  };
}

function intToBase(value, base) {
  if (value === 0n) return '0';
  const b = BigInt(base);
  let out = '';
  for (let n = value; n > 0n; n /= b) out = DIGITS[Number(n % b)] + out;
  return out;
}

// Moltiplicazioni successive della parte frazionaria num/den (< 1) per la base.
function fracToBase(num, den, base, max) {
  const b = BigInt(base);
  const rows = [];
  let digits = '';
  while (num > 0n && digits.length < max) {
    const prod = num * b;
    const digit = Number(prod / den);
    rows.push({ num, prod, den, digit });
    digits += DIGITS[digit];
    num = prod % den;
  }
  return { digits, rows, exact: num === 0n };
}

// Espansione completa se termina, altrimenti troncata a `limit` cifre.
function expandFrac(num, den, base, limit) {
  const full = fracToBase(num, den, base, EXACT_FRAC);
  if (full.exact) return full;
  return { digits: full.digits.slice(0, limit), rows: full.rows.slice(0, limit), exact: false };
}

function joinParts(int, frac) {
  return frac ? `${int},${frac}` : int;
}

function fmt(int, fr) {
  return joinParts(int, fr.digits) + (fr.exact ? '' : '…');
}

function decStr(num, den, max = 8) {
  return fmt(String(num / den), fracToBase(num % den, den, 10, max));
}

function withComma(bits, f) {
  return f ? `${bits.slice(0, -f)},${bits.slice(-f)}` : bits;
}

// Numero di bit della parte intera per rappresentare −scaled/2^f in complemento a 2.
function pickBits(scaled, f, bits) {
  const fits = n => scaled <= 1n << BigInt(n - 1 + f);
  if (bits !== 'auto') return fits(bits) ? bits : null;
  let n = AUTO_BITS.find(fits);
  if (!n) for (n = 65; !fits(n); n++);
  return n;
}

// Legge una stringa di bit come numero in complemento a 2 (il primo bit è il segno).
function readTwos(rawInt, rawFrac) {
  const bits = rawInt + rawFrac;
  const f = rawFrac.length;
  const u = BigInt('0b' + bits);
  const den = 1n << BigInt(f);
  if (rawInt[0] !== '1') return { neg: false, num: u, den };
  const full = 1n << BigInt(bits.length);
  const str = v => withComma(v.toString(2).padStart(bits.length, '0'), f);
  return { neg: true, num: full - u, den, inverted: str(full - 1n - u), magnitude: str(full - u) };
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

function digitCell(v) {
  return v > 9 ? `${v} → ${DIGITS[v]}` : `${v}`;
}

function table(head, rows) {
  const th = head.map((h, i) => `<th${i === head.length - 1 ? ' class="r"' : ''}>${h}</th>`).join('');
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function toDecimalStep(srcInt, srcFrac, base, total) {
  const b = BigInt(base);
  const terms = [];
  const row = (ch, pos) => {
    const d = BigInt(DIGITS.indexOf(ch));
    const val = pos >= 0 ? String(d * b ** BigInt(pos)) : decStr(d, b ** BigInt(-pos));
    terms.push(val);
    return `<tr><td>${digitLabel(ch)}</td><td>${d} × ${base}<sup>${pos < 0 ? MINUS + -pos : pos}</sup></td><td class="r">${val}</td></tr>`;
  };
  const rows = [...srcInt].map((ch, i) => row(ch, srcInt.length - 1 - i)).join('')
    + [...srcFrac].map((ch, i) => row(ch, -(i + 1))).join('');
  const how = srcFrac
    ? `Moltiplica ogni cifra per ${base} elevato alla sua posizione: a sinistra della virgola le posizioni partono da 0 e crescono, a destra sono negative (${MINUS}1, ${MINUS}2, …). Poi somma i risultati.`
    : `Moltiplica ogni cifra per ${base} elevato alla sua posizione (contando da 0 a partire da destra), poi somma i risultati.`;
  const sum = terms.length > 1 ? `${terms.join(' + ')} = ` : '';
  return `<p>${how}</p>${table(['Cifra', 'Calcolo', 'Valore'], rows)}
    <p class="line mono">${sum}<strong>${total}</strong></p>`;
}

function intDivisionStep(value, base, tInt) {
  if (value === 0n) return '<p>La parte intera è 0 e resta 0.</p>';
  const b = BigInt(base);
  let rows = '';
  for (let n = value; n > 0n; n /= b) {
    rows += `<tr><td>${n} ÷ ${base}</td><td>${n / b}</td><td class="r hl">${digitCell(Number(n % b))}</td></tr>`;
  }
  return `<p>Dividi ripetutamente per ${base} annotando ogni resto, finché il quoziente diventa 0.</p>
    ${table(['Divisione', 'Quoziente', 'Resto'], rows)}
    <p class="line">Leggi i resti dal basso verso l'alto: <strong class="mono">${tInt}</strong></p>`;
}

function fracMultiplyStep(fr, base, magnitude) {
  const rows = fr.rows.map(r =>
    `<tr><td>${decStr(r.num, r.den)} × ${base}</td><td>${decStr(r.prod, r.den)}</td><td class="r hl">${digitCell(r.digit)}</td></tr>`).join('');
  const stop = fr.exact ? '' :
    `<p class="line">La parte frazionaria non si esaurisce: ci si ferma dopo ${fr.digits.length} cifre.</p>`;
  return `<p>Moltiplica la parte frazionaria per ${base}: la parte intera del prodotto è la cifra successiva. Ripeti con la parte frazionaria rimasta, finché diventa 0.</p>
    ${table(['Calcolo', 'Prodotto', 'Cifra'], rows)}
    <p class="line">Leggi le parti intere dall'alto verso il basso: <strong class="mono">0,${fr.digits}${fr.exact ? '' : '…'}</strong></p>${stop}
    <p class="line">Unisci parte intera e parte frazionaria: <strong class="mono">${magnitude}</strong></p>`;
}

// Metodo rapido tra basi potenze di 2: si passa dal binario raggruppando i bit.
function shortcutStep(srcInt, srcFrac, from, to) {
  const kFrom = POW2_BITS[from];
  const kTo = POW2_BITS[to];
  const comma = '<tr><td class="dim" colspan="2">virgola</td></tr>';
  let html = '';
  let intBits = srcInt, fracBits = srcFrac;

  if (from !== 2) {
    const expand = s => [...s].map(ch => DIGITS.indexOf(ch).toString(2).padStart(kFrom, '0'));
    const rows = (s, groups) => [...s].map((ch, i) => `<tr><td>${digitLabel(ch)}</td><td class="r">${groups[i]}</td></tr>`).join('');
    const gi = expand(srcInt), gf = expand(srcFrac);
    intBits = gi.join('');
    fracBits = gf.join('');
    html += `<p>${from} = 2<sup>${kFrom}</sup>, quindi ogni cifra in base ${from} corrisponde esattamente a ${kFrom} bit.</p>
      ${table(['Cifra', 'Binario'], rows(srcInt, gi) + (srcFrac ? comma + rows(srcFrac, gf) : ''))}
      <p class="line">In binario: <strong class="mono">${joinParts(gi.join(' '), gf.join(' '))}</strong></p>`;
  }

  intBits = intBits.replace(/^0+(?=.)/, '');
  fracBits = fracBits.replace(/0+$/, '');

  if (to !== 2) {
    const size = len => Math.ceil(len / kTo) * kTo;
    const split = s => s.match(new RegExp(`.{${kTo}}`, 'g')) || [];
    const rows = groups => groups.map(g => `<tr><td>${g}</td><td class="r hl">${digitCell(parseInt(g, 2))}</td></tr>`).join('');
    const gi = split(intBits.padStart(size(intBits.length), '0'));
    const gf = split(fracBits.padEnd(size(fracBits.length), '0'));
    const how = srcFrac
      ? `raggruppa i bit a ${kTo} a ${kTo} partendo dalla virgola, verso sinistra per la parte intera e verso destra per quella frazionaria (aggiungendo zeri alle estremità se servono), poi converti ogni gruppo.`
      : `raggruppa i bit a ${kTo} a ${kTo} partendo da destra (aggiungendo zeri a sinistra se servono) e converti ogni gruppo.`;
    html += `<p${from !== 2 ? ' style="margin-top:14px"' : ''}>${to} = 2<sup>${kTo}</sup>: ${how}</p>
      ${table(['Gruppo', 'Cifra'], rows(gi) + (gf.length ? comma + rows(gf) : ''))}`;
  } else {
    html += `<p class="line">Togli gli zeri superflui: <strong class="mono">${joinParts(intBits, fracBits)}</strong></p>`;
  }
  return html;
}

function renderSteps(blocks, final, allowSolo = true) {
  const solo = allowSolo && blocks.length === 1;
  let n = 0;
  const html = blocks.map(b =>
    `<div class="step${solo ? ' solo' : ''}"><h3><span class="n">${b.mark || ++n}</span>${b.title}</h3>${b.body}</div>`).join('');
  return `${html}<p class="final">${final}</p>`;
}

function note(text, final) {
  return `<div class="step"><p>${text}</p></div><p class="final">${final}</p>`;
}

/*
 * Converte `raw` dalla base `from` alla base `to` e costruisce i passaggi.
 * opts.signedIn  — un numero binario in ingresso va letto in complemento a 2
 * opts.bits      — bit della parte intera per il complemento a 2 in uscita ('auto' o un numero)
 * opts.fracLimit — cifre dopo la virgola a cui fermarsi se l'espansione non termina
 */
function solve(raw, from, to, opts = {}) {
  const p = parseNumber(raw, from);
  if (p.empty) return { empty: true };
  if (p.error) return { error: p.error.format ? FORMAT_MSG : invalidDigitMessage(p.error.ch, from) };

  const signedIn = !!opts.signedIn && from === 2;
  const tag = ' <span class="dim">(complemento a 2)</span>';
  const blocks = [];
  let { neg, num, den } = p;
  let source = (p.neg ? MINUS : '') + joinParts(p.intDigits, p.fracDigits);
  let srcInt = p.intDigits, srcFrac = p.fracDigits;

  if (signedIn) {
    if (p.hasSign) return { error: `In complemento a 2 il segno è dato dal primo bit: togli il ${MINUS}.` };
    const t = readTwos(p.rawInt, p.rawFrac);
    ({ neg, num, den } = t);
    source = joinParts(p.rawInt, p.rawFrac);
    srcInt = (num / den).toString(2);
    srcFrac = fracToBase(num % den, den, 2, 1000).digits;
    blocks.push({
      title: 'Segno e valore assoluto',
      body: neg
        ? `<p>Il primo bit è 1, quindi il numero è negativo. Per ricavare il valore assoluto inverti tutti i bit e somma 1${p.rawFrac ? ' all\'ultimo bit dopo la virgola' : ''}.</p>
          ${table(['Operazione', 'Bit'], `<tr><td>Numero</td><td class="r">${source}</td></tr><tr><td>Bit invertiti</td><td class="r">${t.inverted}</td></tr><tr><td>+ 1</td><td class="r hl">${t.magnitude}</td></tr>`)}
          <p class="line">Il valore assoluto è <strong class="mono">${joinParts(srcInt, srcFrac)}</strong>: lo si converte e si mette il ${MINUS} davanti al risultato.</p>`
        : '<p>Il primo bit è 0, quindi il numero è positivo e si converte normalmente.</p>',
    });
  }

  const value = { neg, num, den };
  const sourceHTML = withBase(source, from) + (signedIn ? tag : '');
  const done = (display, steps, extra) => ({
    display, steps, value, source,
    copy: display.replace('…', '').replace(MINUS, '-'),
    twosBits: null,
    ...extra,
  });

  if (num === 0n) {
    return done('0', note('Lo zero si scrive 0 in qualsiasi base.', `${sourceHTML} = ${withBase('0', to)}`));
  }
  if (from === to) {
    return done(source, note('La base di partenza e quella di arrivo coincidono: il numero resta invariato.', `${sourceHTML} = ${sourceHTML}`));
  }

  const I = num / den, R = num % den;
  const fr = expandFrac(R, den, to, opts.fracLimit || MAX_FRAC);
  const tInt = intToBase(I, to);
  const magnitude = fmt(tInt, fr);
  const hasFrac = R > 0n;

  // Complemento a 2 in uscita
  let twos = null;
  if (neg && to === 2) {
    const f = fr.digits.length;
    const scaled = (I << BigInt(f)) + (f ? BigInt('0b' + fr.digits) : 0n);
    if (scaled > 0n) {
      const n = pickBits(scaled, f, opts.bits || 'auto');
      if (!n) {
        const lim = 1n << BigInt(opts.bits - 1);
        return { error: `Il numero non è rappresentabile in complemento a 2 su ${opts.bits} bit (intervallo da ${MINUS}${lim} a ${lim - 1n}).`, wantsBits: true };
      }
      const len = n + f, full = 1n << BigInt(len);
      const str = v => withComma(v.toString(2).padStart(len, '0'), f);
      twos = { n, padded: str(scaled), inverted: str(full - 1n - scaled), result: str(full - scaled) };
    }
  }
  const display = twos ? twos.result + (fr.exact ? '' : '…') : (neg ? MINUS : '') + magnitude;

  if (neg && !signedIn) {
    blocks.push({
      title: 'Segno',
      body: `<p>Il numero è negativo: metti da parte il segno e lavora sul valore assoluto <span class="mono">${joinParts(srcInt, srcFrac)}</span>. ${
        twos ? 'Alla fine il segno si esprime con il complemento a 2.' : `Alla fine rimetti il ${MINUS} davanti al risultato.`}</p>`,
    });
  }
  if (from !== 10) {
    blocks.push({
      title: `Da base ${from} a base 10`,
      body: toDecimalStep(srcInt, srcFrac, from, fmt(String(I), expandFrac(R, den, 10, MAX_FRAC))),
    });
  }
  if (to !== 10) {
    blocks.push({
      title: hasFrac ? `Parte intera in base ${to}` : `Da base 10 a base ${to}`,
      body: intDivisionStep(I, to, tInt),
    });
    if (hasFrac) {
      blocks.push({ title: `Parte frazionaria in base ${to}`, body: fracMultiplyStep(fr, to, magnitude) });
    }
  }
  if (POW2_BITS[from] && POW2_BITS[to] && fr.exact) {
    blocks.push({ mark: '+', title: 'Metodo rapido', body: shortcutStep(srcInt, srcFrac, from, to) });
  }
  if (twos) {
    blocks.push({
      title: `Complemento a 2 su ${twos.n} bit`,
      body: `<p>Scrivi il valore assoluto con ${twos.n} bit${hasFrac ? ' di parte intera' : ''} (aggiungendo zeri a sinistra), inverti tutti i bit e somma 1${fr.digits ? ' all\'ultimo bit dopo la virgola' : ''}. Il primo bit a 1 indica che il numero è negativo.</p>
        ${table(['Operazione', 'Bit'], `<tr><td>Valore assoluto</td><td class="r">${twos.padded}</td></tr><tr><td>Bit invertiti</td><td class="r">${twos.inverted}</td></tr><tr><td>+ 1</td><td class="r hl">${twos.result}</td></tr>`)}`,
    });
  }

  const steps = renderSteps(blocks, `${sourceHTML} = ${withBase(display, to)}${twos ? tag : ''}`);
  return done(display, steps, {
    truncated: !fr.exact,
    hasFrac,
    twosBits: twos ? twos.n : null,
    wantsBits: neg && to === 2,
  });
}

/* ---------- Operazioni tra numeri della stessa base ---------- */

const OP_SIGN = { '+': '+', '-': MINUS, '*': '×', '/': '÷' };

function digitValue(ch) {
  return Math.max(0, DIGITS.indexOf(ch));
}

// Intero `v` con le ultime `f` cifre dopo la virgola, senza zeri superflui.
function scaledToStr(v, f, base) {
  const s = intToBase(v, base).padStart(f + 1, '0');
  return joinParts(s.slice(0, s.length - f), s.slice(s.length - f).replace(/0+$/, ''));
}

// Disposizione in colonna: ogni riga è { text, op, cls } con testi della stessa lunghezza.
function colTable(rows, f) {
  const body = rows.map(r => {
    const cells = [...r.text].map((ch, i) => {
      const sep = f && i === r.text.length - f - 1 ? `<td class="sep">${r.cls === 'carry' || ch === ' ' ? '' : ','}</td>` : '';
      return `<td>${ch === ' ' ? '' : ch}</td>${sep}`;
    }).join('');
    return `<tr${r.cls ? ` class="${r.cls}"` : ''}><td class="op">${r.op || ''}</td>${cells}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="cols"><tbody>${body}</tbody></table></div>`;
}

function power(base, pos) {
  return `${base}<sup>${pos < 0 ? MINUS + -pos : pos}</sup>`;
}

function columnAdd(x, y, base, f) {
  const W = Math.max(intToBase(x + y, base).length, f + 1);
  const str = v => intToBase(v, base).padStart(f + 1, '0').padStart(W, ' ');
  const xs = str(x), ys = str(y);
  const carries = Array(W).fill(' ');
  let rows = '', carry = 0;
  for (let i = W - 1; i >= 0; i--) {
    const blank = xs[i] === ' ' && ys[i] === ' ';
    if (blank && !carry) break;
    const a = digitValue(xs[i]), b = digitValue(ys[i]);
    const s = a + b + carry, d = s % base, c = (s - d) / base;
    const calc = blank
      ? `${carry} <span class="dim">(riporto)</span>`
      : `${a} + ${b}${carry ? ` + ${carry}` : ''} = ${s}${c ? ` = ${c} × ${base} + ${d}` : ''}`;
    rows += `<tr><td>${power(base, W - 1 - i - f)}</td><td>${calc}</td><td class="hl">${DIGITS[d]}</td><td class="r">${c || ''}</td></tr>`;
    if (c && i > 0) carries[i - 1] = String(c);
    carry = c;
  }
  return {
    layout: colTable([
      { text: carries.join(''), cls: 'carry' },
      { text: xs },
      { text: ys, op: '+' },
      { text: str(x + y), cls: 'line' },
    ], f),
    details: table(['Colonna', 'Calcolo', 'Scrivi', 'Riporto'], rows),
  };
}

// Sottrazione in colonna, con x ≥ y.
function columnSub(x, y, base, f) {
  const W = Math.max(intToBase(x, base).length, f + 1);
  const str = v => intToBase(v, base).padStart(f + 1, '0').padStart(W, ' ');
  const xs = str(x), ys = str(y);
  const borrows = Array(W).fill(' ');
  let rows = '', borrow = 0;
  for (let i = W - 1; i >= 0; i--) {
    const a = digitValue(xs[i]), b = digitValue(ys[i]);
    const t = a - borrow - b, lend = t < 0, d = lend ? t + base : t;
    const calc = `${a}${borrow ? ` ${MINUS} 1` : ''} ${MINUS} ${b}${lend ? ` → ${a - borrow + base} ${MINUS} ${b}` : ''} = ${d}`;
    rows += `<tr><td>${power(base, W - 1 - i - f)}</td><td>${calc}</td><td class="hl">${DIGITS[d]}</td><td class="r">${lend ? 1 : ''}</td></tr>`;
    if (lend && i > 0) borrows[i - 1] = '1';
    borrow = lend ? 1 : 0;
  }
  return {
    layout: colTable([
      { text: borrows.join(''), cls: 'carry' },
      { text: xs },
      { text: ys, op: MINUS },
      { text: str(x - y), cls: 'line' },
    ], f),
    details: table(['Colonna', 'Calcolo', 'Scrivi', 'Prestito'], rows),
  };
}

function columnMul(x, y, base) {
  const b = BigInt(base);
  const xs = intToBase(x, base), ys = intToBase(y, base), total = intToBase(x * y, base);
  const W = Math.max(xs.length, ys.length, total.length);
  const pad = s => s.padStart(W, ' ');
  const partials = [];
  [...ys].reverse().forEach((ch, j) => {
    const d = digitValue(ch);
    if (d) partials.push({ ch, j, text: intToBase(x * BigInt(d) * b ** BigInt(j), base) });
  });
  const layout = [{ text: pad(xs) }, { text: pad(ys), op: '×' }];
  partials.forEach((p, i) => layout.push({ text: pad(p.text), cls: i === 0 ? 'line' : '', op: i ? '+' : '' }));
  if (partials.length > 1) layout.push({ text: pad(total), cls: 'line' });
  const rows = partials.map(p =>
    `<tr><td>${xs} × ${digitLabel(p.ch)}${p.j ? ` × ${power(base, p.j)}` : ''}</td><td class="r">${p.text}</td></tr>`).join('');
  return { layout: colTable(layout, 0), details: table(['Calcolo', 'Prodotto parziale'], rows), total };
}

// Divisione lunga tra interi; dopo l'ultima cifra continua abbassando zeri.
function longDivision(N, D, base) {
  const b = BigInt(base);
  const str = v => intToBase(v, base);
  const row = (partial, d, rem) =>
    `<tr><td>${str(partial)}</td><td class="hl">${DIGITS[Number(d)]}</td><td>${str(d * D)}</td><td class="r">${str(rem)}</td></tr>`;
  const ns = str(N);
  let rem = 0n, q = '', rows = '', started = false;
  [...ns].forEach((ch, i) => {
    const partial = rem * b + BigInt(digitValue(ch));
    const d = partial / D;
    rem = partial % D;
    q += DIGITS[Number(d)];
    if (d > 0n || started || i === ns.length - 1) {
      started = true;
      rows += row(partial, d, rem);
    }
  });
  const intRem = rem;
  let digits = '';
  if (rem > 0n) rows += '<tr><td class="dim" colspan="4">virgola: da qui si abbassano zeri</td></tr>';
  while (rem > 0n && digits.length < MAX_FRAC) {
    const partial = rem * b;
    const d = partial / D;
    rem = partial % D;
    digits += DIGITS[Number(d)];
    rows += row(partial, d, rem);
  }
  return {
    qInt: q.replace(/^0+(?=.)/, ''), digits, exact: rem === 0n, intRem: str(intRem),
    table: table(['Parziale', 'Cifra', 'Cifra × divisore', 'Resto'], rows),
  };
}

// Esegue `a op b` nella base indicata e costruisce i passaggi.
function solveOp(rawA, rawB, base, op) {
  const a = parseNumber(rawA, base), b = parseNumber(rawB, base);
  for (const [p, field] of [[a, 'a'], [b, 'b']]) {
    if (p.error) return { error: p.error.format ? FORMAT_MSG : invalidDigitMessage(p.error.ch, base), field };
  }
  if (a.empty || b.empty) return { empty: true };
  if (op === '/' && b.num === 0n) return { error: 'Non si può dividere per zero.', field: 'b' };

  const B = BigInt(base);
  const fa = a.fracDigits.length, fb = b.fracDigits.length;
  const magA = joinParts(a.intDigits, a.fracDigits), magB = joinParts(b.intDigits, b.fracDigits);
  const mono = s => `<span class="mono">${s}</span>`;
  const blocks = [];
  let neg, magnitude, truncated = false;

  if (op === '+' || op === '-') {
    const f = Math.max(fa, fb);
    const x = a.num * B ** BigInt(f - fa), y = b.num * B ** BigInt(f - fb);
    const sa = a.neg ? -1n : 1n, sb = (b.neg ? -1n : 1n) * (op === '-' ? -1n : 1n);
    const r = sa * x + sb * y;
    neg = r < 0n;
    magnitude = scaledToStr(neg ? -r : r, f, base);
    const same = sa === sb;
    const swap = y > x;
    const expr = same ? `${magA} + ${magB}` : swap ? `${magB} ${MINUS} ${magA}` : `${magA} ${MINUS} ${magB}`;
    if (a.neg || b.neg || (!same && swap)) {
      blocks.push({
        title: 'Segni',
        body: `<p>Tenendo conto dei segni l'operazione diventa ${mono(neg ? `${MINUS}(${expr})` : expr)}: si lavora sui valori assoluti e il segno si mette alla fine.</p>`,
      });
    }
    const col = same ? columnAdd(x, y, base, f) : swap ? columnSub(y, x, base, f) : columnSub(x, y, base, f);
    blocks.push({
      title: same ? 'Somma in colonna' : 'Sottrazione in colonna',
      body: `<p>${f ? `Allinea le virgole, poi ${same ? 'somma' : 'sottrai'}` : same ? 'Somma' : 'Sottrai'}${same
        ? ` colonna per colonna partendo da destra: quando il totale arriva a ${base} o lo supera, scrivi il resto e riporta 1 nella colonna a sinistra.`
        : ` colonna per colonna partendo da destra: quando la cifra sopra è più piccola, chiedi in prestito 1 dalla colonna a sinistra, che qui vale ${base}.`}</p>
        ${col.layout}<p>La riga in piccolo indica ${same ? 'i riporti' : 'i prestiti'}.</p>`,
    });
    blocks.push({ title: 'Colonna per colonna', body: `<p>I calcoli sono scritti con i valori decimali delle cifre.</p>${col.details}` });
  } else if (op === '*') {
    const f = fa + fb;
    const prod = a.num * b.num;
    neg = a.neg !== b.neg && prod > 0n;
    magnitude = scaledToStr(prod, f, base);
    const notes = [];
    if (a.neg || b.neg) notes.push(`Segni ${a.neg === b.neg ? 'concordi: il risultato è positivo' : 'discordi: il risultato è negativo'}.`);
    if (f) notes.push(`Togli le virgole e moltiplica ${mono(intToBase(a.num, base))} × ${mono(intToBase(b.num, base))} come numeri interi: nel risultato vanno poi separate ${fa} + ${fb} = ${f} ${f === 1 ? 'cifra' : 'cifre'} dopo la virgola.`);
    if (notes.length) blocks.push({ title: 'Segni e virgole', body: `<p>${notes.join(' ')}</p>` });
    if (prod === 0n) {
      blocks.push({ title: 'Moltiplicazione', body: '<p>Qualsiasi numero moltiplicato per 0 dà 0.</p>' });
    } else {
      const col = columnMul(a.num, b.num, base);
      blocks.push({
        title: 'Moltiplicazione in colonna',
        body: `<p>Moltiplica il primo numero per ogni cifra del secondo, partendo da destra e spostando ogni prodotto di un posto a sinistra; poi somma i prodotti parziali.</p>${col.layout}`,
      });
      blocks.push({
        title: 'Prodotti parziali',
        body: `${col.details}<p class="line">Totale: <strong class="mono">${col.total}</strong>${f ? ` → con la virgola: <strong class="mono">${magnitude}</strong>` : ''}</p>`,
      });
    }
  } else {
    const k = Math.max(fa, fb);
    const N = a.num * B ** BigInt(k - fa), D = b.num * B ** BigInt(k - fb);
    const div = longDivision(N, D, base);
    neg = a.neg !== b.neg && N > 0n;
    truncated = !div.exact;
    magnitude = fmt(div.qInt, div);
    const notes = [];
    if (a.neg || b.neg) notes.push(`Segni ${a.neg === b.neg ? 'concordi: il risultato è positivo' : 'discordi: il risultato è negativo'}.`);
    if (k) notes.push(`Sposta la virgola di ${k} ${k === 1 ? 'posto' : 'posti'} a destra in entrambi i numeri: la divisione diventa ${mono(`${intToBase(N, base)} ÷ ${intToBase(D, base)}`)}.`);
    if (notes.length) blocks.push({ title: 'Segni e virgole', body: `<p>${notes.join(' ')}</p>` });
    blocks.push({
      title: 'Divisione',
      body: `<p>Abbassa una cifra alla volta: trova quante volte il divisore ${mono(intToBase(D, base))} sta nel dividendo parziale, scrivi quella cifra nel quoziente, sottrai il prodotto e porta il resto alla riga successiva. Tutti i numeri sono in base ${base}.</p>
        ${div.table}
        <p class="line">Quoziente intero <strong class="mono">${div.qInt}</strong>, resto <strong class="mono">${div.intRem}</strong>.</p>
        ${div.digits ? `<p class="line">Proseguendo dopo la virgola: <strong class="mono">${magnitude}</strong></p>` : ''}
        ${truncated ? `<p class="line">La divisione non termina: ci si ferma dopo ${div.digits.length} cifre.</p>` : ''}`,
    });
  }

  const display = (neg ? MINUS : '') + magnitude;
  const shown = (p, mag, wrap) => {
    const s = withBase((p.neg ? MINUS : '') + mag, base);
    return wrap && p.neg ? `(${s})` : s;
  };
  let final = `${shown(a, magA)} ${OP_SIGN[op]} ${shown(b, magB, true)} = ${withBase(display, base)}`;

  if (base !== 10) {
    // Verifica in base 10 con frazioni esatte
    const an = a.neg ? -a.num : a.num, bn = b.neg ? -b.num : b.num;
    let [rn, rd] = op === '+' ? [an * b.den + bn * a.den, a.den * b.den]
      : op === '-' ? [an * b.den - bn * a.den, a.den * b.den]
      : op === '*' ? [an * bn, a.den * b.den]
      : [an * b.den, a.den * bn];
    if (rd < 0n) [rn, rd] = [-rn, -rd];
    const dec = (n, d, wrap) => {
      const s = (n < 0n ? MINUS : '') + decStr(n < 0n ? -n : n, d, MAX_FRAC);
      return wrap && n < 0n ? `(${s})` : s;
    };
    final += `<br><span class="dim">In base 10: ${dec(an, a.den)} ${OP_SIGN[op]} ${dec(bn, b.den, true)} = ${dec(rn, rd)}</span>`;
  }

  return {
    display, truncated,
    copy: display.replace('…', '').replace(MINUS, '-'),
    steps: renderSteps(blocks, final, false),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { parseNumber, solve, readTwos, solveOp };
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

  /* Schede */

  const tabs = [$('tab-convert'), $('tab-train'), $('tab-ops')];

  function selectTab(tab) {
    if (tab.getAttribute('aria-selected') === 'true') return;
    const index = tabs.indexOf(tab);
    const current = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    // Il pannello entra dal lato verso cui scorre l'indicatore delle schede.
    $(tab.getAttribute('aria-controls')).dataset.dir = index > current ? 'right' : 'left';
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
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  /* Convertitore */

  const cInput = $('c-input'), cFrom = $('c-from'), cTo = $('c-to');
  const cOpts = $('c-opts'), cSigned = $('c-signed'), cSignedWrap = $('c-signed-wrap');
  const cBits = $('c-bits'), cBitsWrap = $('c-bits-wrap');
  const cOutput = $('c-output'), cError = $('c-error'), cCopy = $('c-copy');
  const cSteps = $('c-steps'), cStepsBody = $('c-steps-body');
  let cResult = null;

  fillBases(cFrom, 2);
  fillBases(cTo, 10);

  function convert() {
    const from = Number(cFrom.value), to = Number(cTo.value);
    const res = solve(cInput.value, from, to, {
      signedIn: cSigned.checked,
      bits: cBits.value === 'auto' ? 'auto' : Number(cBits.value),
    });
    const ok = res.display !== undefined;
    cResult = ok ? res : null;

    cSignedWrap.hidden = from !== 2;
    cBitsWrap.hidden = !res.wantsBits;
    cOpts.hidden = cSignedWrap.hidden && cBitsWrap.hidden;
    cInput.classList.toggle('invalid', !!res.error && !res.wantsBits);
    cError.hidden = !res.error;
    cCopy.hidden = !ok;
    cSteps.hidden = !ok;

    if (!ok) {
      cOutput.textContent = '—';
      if (res.error) cError.textContent = res.error;
      return;
    }
    cOutput.innerHTML = withBase(res.display, to);
    cStepsBody.innerHTML = res.steps;
  }

  for (const el of [cFrom, cTo, cSigned, cBits]) el.addEventListener('change', convert);
  cInput.addEventListener('input', convert);

  $('c-swap').addEventListener('click', () => {
    const from = cFrom.value;
    cFrom.value = cTo.value;
    cTo.value = from;
    if (cResult) {
      cInput.value = cResult.copy;
      // Un risultato in complemento a 2 va riletto come tale.
      cSigned.checked = cResult.twosBits !== null;
    }
    convert();
  });

  function wireCopy(button, getText) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(getText());
        button.textContent = 'Copiato';
      } catch {
        button.textContent = 'Non riuscito';
      }
      setTimeout(() => { button.textContent = 'Copia'; }, 1400);
    });
  }

  wireCopy(cCopy, () => cResult.copy);

  /* Allenamento */

  const tFrom = $('t-from'), tTo = $('t-to'), tLevel = $('t-level');
  const tNeg = $('t-neg'), tFrac = $('t-frac');
  const tPrompt = $('t-prompt'), tNumber = $('t-number'), tNote = $('t-note'), tAnswer = $('t-answer');
  const tCheck = $('t-check'), tFeedback = $('t-feedback');
  const tSteps = $('t-steps'), tStepsBody = $('t-steps-body'), tScore = $('t-score');

  const COMMON_BASES = [2, 8, 10, 16];
  // [minimo, massimo, massimo esponente del denominatore 2^m della parte frazionaria]
  const LEVELS = { easy: [4, 255, 2], medium: [256, 4095, 3], hard: [4096, 65535, 4] };
  const TRAIN_FRAC = 4;  // cifre richieste quando la parte frazionaria non termina
  const score = { right: 0, total: 0 };
  let exercise = null;
  let prev = { from: 'random', to: '10' };

  fillBases(tFrom, 'random', true);
  fillBases(tTo, 10);

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // Parte frazionaria nella base di partenza; quando possibile termina anche in quella di arrivo.
  function randomFraction(from, to, maxPow) {
    const m = randomInt(1, maxPow);
    const k = BigInt(2 * randomInt(0, 2 ** (m - 1) - 1) + 1);
    const den = 1n << BigInt(m);
    const src = fracToBase(k, den, from, 8);
    if (src.exact && fracToBase(k, den, to, 8).exact) return src.digits;
    let digits = '';
    for (let i = randomInt(1, 2); i > 1; i--) digits += DIGITS[randomInt(0, from - 1)];
    return digits + DIGITS[randomInt(1, from - 1)];
  }

  function newExercise() {
    const to = Number(tTo.value);
    let from = Number(tFrom.value);
    if (tFrom.value === 'random') {
      const pool = COMMON_BASES.filter(b => b !== to);
      from = pool[randomInt(0, pool.length - 1)];
    }
    const [min, max, maxPow] = LEVELS[tLevel.value];
    const neg = tNeg.checked;
    const frac = tFrac.checked ? randomFraction(from, to, maxPow) : '';
    let raw = joinParts(intToBase(BigInt(randomInt(min, max)), from), frac);

    // Un negativo in base 2 viene proposto già in complemento a 2.
    const signedIn = neg && from === 2;
    if (signedIn) {
      const f = frac.length;
      const scaled = BigInt('0b' + raw.replace(',', ''));
      const len = pickBits(scaled, f, 'auto') + f;
      raw = withComma(((1n << BigInt(len)) - scaled).toString(2).padStart(len, '0'), f);
    } else if (neg) {
      raw = '-' + raw;
    }

    const sol = solve(raw, from, to, { signedIn, bits: 'auto', fracLimit: TRAIN_FRAC });
    exercise = { from, to, sol, done: false };

    const notes = [];
    if (signedIn) notes.push('Il numero è scritto in complemento a 2.');
    if (sol.twosBits) notes.push(`Rispondi in complemento a 2 su ${sol.twosBits} bit${sol.hasFrac ? ' di parte intera' : ''}.`);
    if (sol.truncated) notes.push(`Fermati a ${TRAIN_FRAC} cifre dopo la virgola.`);

    tPrompt.textContent = `Converti in base ${to}`;
    tNumber.innerHTML = withBase(sol.source, from);
    tNote.textContent = notes.join(' ');
    tNote.hidden = !notes.length;
    tAnswer.value = '';
    tAnswer.disabled = false;
    tCheck.disabled = false;
    tFeedback.hidden = true;
    tSteps.hidden = true;
    tSteps.open = false;
  }

  // Restituisce '' se la risposta è giusta, altrimenti il motivo dell'errore.
  function judge(answer) {
    const { to, sol } = exercise;
    const p = parseNumber(answer, to);
    if (p.error) return p.error.format ? FORMAT_MSG : invalidDigitMessage(p.error.ch, to);
    let a = p;
    if (sol.twosBits) {
      if (p.hasSign) return `In complemento a 2 non si usa il segno ${MINUS}: il segno è dato dal primo bit.`;
      a = readTwos(p.rawInt, p.rawFrac);
    }
    const v = sol.value;
    let same = a.neg === v.neg;
    if (same && sol.truncated) {
      const s = BigInt(to) ** BigInt(TRAIN_FRAC);
      same = a.num * s / a.den === v.num * s / v.den;
    } else if (same) {
      same = a.num * v.den === v.num * a.den;
    }
    return same ? '' : `La tua risposta: <span class="mono">${esc(clean(answer).replace('-', MINUS))}</span>`;
  }

  function checkAnswer() {
    if (!exercise || exercise.done) return;
    if (parseNumber(tAnswer.value, exercise.to).empty) {
      tAnswer.focus();
      return;
    }
    const { from, to, sol } = exercise;
    const why = judge(tAnswer.value);
    const correct = !why;

    exercise.done = true;
    score.total++;
    if (correct) score.right++;

    tAnswer.disabled = true;
    tCheck.disabled = true;
    tFeedback.hidden = false;
    tFeedback.className = `feedback ${correct ? 'ok' : 'bad'}`;
    tFeedback.innerHTML = correct
      ? `<strong>Corretto!</strong><span class="mono">${withBase(sol.source, from)} = ${withBase(sol.display, to)}</span>`
      : `<strong>Non è corretto.</strong><span>${why}</span><span>Risposta giusta: <strong class="mono">${withBase(sol.display, to)}</strong></span>`;

    tStepsBody.innerHTML = sol.steps;
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
  for (const el of [tLevel, tNeg, tFrac]) el.addEventListener('change', newExercise);
  $('t-new').addEventListener('click', () => { newExercise(); tAnswer.focus(); });
  $('t-form').addEventListener('submit', e => { e.preventDefault(); checkAnswer(); });

  newExercise();

  /* Operazioni */

  const oA = $('o-a'), oB = $('o-b'), oOp = $('o-op'), oBase = $('o-base');
  const oOutput = $('o-output'), oError = $('o-error'), oCopy = $('o-copy');
  const oSteps = $('o-steps'), oStepsBody = $('o-steps-body');
  let oResult = null;

  fillBases(oBase, 2);

  function operate() {
    const base = Number(oBase.value);
    const res = solveOp(oA.value, oB.value, base, oOp.value);
    const ok = res.display !== undefined;
    oResult = ok ? res : null;

    oA.classList.toggle('invalid', res.field === 'a');
    oB.classList.toggle('invalid', res.field === 'b');
    oError.hidden = !res.error;
    oCopy.hidden = !ok;
    oSteps.hidden = !ok;

    if (!ok) {
      oOutput.textContent = '—';
      if (res.error) oError.textContent = res.error;
      return;
    }
    oOutput.innerHTML = withBase(res.display, base);
    oStepsBody.innerHTML = res.steps;
  }

  for (const el of [oA, oB]) el.addEventListener('input', operate);
  for (const el of [oOp, oBase]) el.addEventListener('change', operate);
  wireCopy(oCopy, () => oResult.copy);
}
