'use strict';

/* ---------- Logica di conversione ---------- */

const DIGITS = '0123456789ABCDEF';
const BASE_NAMES = { 2: 'binario', 8: 'ottale', 10: 'decimale', 16: 'esadecimale' };
const POW2_BITS = { 2: 1, 4: 2, 8: 3, 16: 4 };
const AUTO_BITS = [8, 16, 32, 64];  // lunghezze standard per il complemento a 2
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

// Più piccola lunghezza standard (8, 16, 32, 64, poi multipli di 64) che contiene n bit.
function stdWidth(n) {
  return AUTO_BITS.find(w => w >= n) || Math.ceil(n / 64) * 64;
}

// Numero di bit della parte intera per rappresentare −scaled/2^f in complemento a 2.
function pickBits(scaled, f, bits) {
  const fits = n => scaled <= 1n << BigInt(n - 1 + f);
  if (bits !== 'auto') return fits(bits) ? bits : null;
  let n = AUTO_BITS.find(fits);
  if (!n) for (n = 128; !fits(n); n += 64);
  return n;
}

// Legge una stringa di bit come numero in complemento a 2. La parte intera viene prima completata
// con zeri a sinistra fino alla lunghezza standard, così gli zeri iniziali non cambiano il valore:
// il segno è il primo bit della parola completa.
function readTwos(rawInt, rawFrac) {
  const int = rawInt.padStart(stdWidth(rawInt.length), '0');
  const bits = int + rawFrac;
  const f = rawFrac.length;
  const u = BigInt('0b' + bits);
  const den = 1n << BigInt(f);
  const padded = joinParts(int, rawFrac);
  if (int[0] !== '1') return { neg: false, num: u, den, padded, width: int.length };
  const full = 1n << BigInt(bits.length);
  const str = v => withComma(v.toString(2).padStart(bits.length, '0'), f);
  return { neg: true, num: full - u, den, padded, width: int.length, inverted: str(full - 1n - u), magnitude: str(full - u) };
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

// Blocchi per passare dalla base `base` alla base 10: uno solo per gli interi,
// due distinti (parte intera e parte frazionaria) quando c'è la virgola.
function toDecimalBlocks(srcInt, srcFrac, base, I, R, den) {
  const b = BigInt(base);
  const head = ['Cifra', 'Peso', 'Cifra × peso'];
  const sumLine = (terms, total) =>
    `<p class="line mono">${terms.length > 1 ? `${terms.join(' + ')} = ` : ''}<strong>${total}</strong></p>`;

  const intTerms = [];
  const intRows = [...srcInt].map((ch, i) => {
    const pos = srcInt.length - 1 - i;
    const weight = b ** BigInt(pos);
    const val = String(BigInt(DIGITS.indexOf(ch)) * weight);
    intTerms.push(val);
    return `<tr><td>${digitLabel(ch)}</td><td>${power(base, pos)} = ${weight}</td><td class="r">${val}</td></tr>`;
  }).join('');
  const intBody = how => `<p>${how}</p>${table(head, intRows)}${sumLine(intTerms, I)}`;

  if (!srcFrac) {
    return [{
      title: `Da base ${base} a base 10`,
      body: intBody(`Ogni cifra ha un peso che dipende dalla posizione: la prima da destra vale ${power(base, 0)} = 1, la seconda ${power(base, 1)} = ${base}, la terza ${power(base, 2)} = ${base * base} e così via. Moltiplica ogni cifra per il suo peso e somma i risultati.`),
    }];
  }

  const fracTerms = [];
  const fracRows = [...srcFrac].map((ch, i) => {
    const weight = b ** BigInt(i + 1);
    const val = decStr(BigInt(DIGITS.indexOf(ch)), weight);
    fracTerms.push(val);
    return `<tr><td>${digitLabel(ch)}</td><td>${power(base, -(i + 1))} = 1/${weight}</td><td class="r">${val}</td></tr>`;
  }).join('');
  const fracTotal = fmt('0', expandFrac(R, den, 10, MAX_FRAC));
  const total = fmt(String(I), expandFrac(R, den, 10, MAX_FRAC));
  return [{
    title: `Da base ${base} a base 10 · parte intera`,
    body: intBody(`Considera solo le cifre a sinistra della virgola: <span class="mono">${srcInt}</span>. La prima da destra ha peso ${power(base, 0)} = 1, la seconda ${power(base, 1)} = ${base}, poi ${power(base, 2)} = ${base * base} e così via. Moltiplica ogni cifra per il suo peso e somma.`),
  }, {
    title: `Da base ${base} a base 10 · parte frazionaria`,
    body: `<p>Ora le cifre a destra della virgola: <span class="mono">${srcFrac}</span>. Qui l'esponente è negativo, cioè il peso è una frazione sempre più piccola: la prima cifra vale ${power(base, -1)} = 1/${base}, la seconda ${power(base, -2)} = 1/${base * base} e così via. Moltiplica ogni cifra per il suo peso e somma.</p>
      ${table(head, fracRows)}${sumLine(fracTerms, fracTotal)}
      <p class="line">Unisci parte intera e parte frazionaria: <span class="mono">${I} + ${fracTotal} = <strong>${total}</strong></span></p>`,
  }];
}

function intDivisionStep(value, base, tInt, hasFrac) {
  if (value === 0n) return '<p>La parte intera è 0 e resta 0.</p>';
  const b = BigInt(base);
  let rows = '';
  for (let n = value; n > 0n; n /= b) {
    rows += `<tr><td>${n} ÷ ${base}</td><td>${n / b}</td><td class="r hl">${digitCell(Number(n % b))}</td></tr>`;
  }
  return `<p>Prendi ${hasFrac ? 'solo la parte intera' : 'il numero'}, <span class="mono">${value}</span>, e ${hasFrac ? 'dividila' : 'dividilo'} per ${base}: il resto è una cifra del risultato, il quoziente si divide di nuovo. Continua finché il quoziente diventa 0.</p>
    ${table(['Divisione', 'Quoziente', 'Resto'], rows)}
    <p class="line">Leggi i resti dal basso verso l'alto: <strong class="mono">${tInt}</strong></p>`;
}

function fracMultiplyStep(fr, base, magnitude) {
  const rows = fr.rows.map(r =>
    `<tr><td>${decStr(r.num, r.den)} × ${base}</td><td>${decStr(r.prod, r.den)}</td><td class="r hl">${digitCell(r.digit)}</td></tr>`).join('');
  const stop = fr.exact ? '' :
    `<p class="line">La parte frazionaria non si esaurisce: ci si ferma dopo ${fr.digits.length} cifre.</p>`;
  return `<p>Prendi solo la parte dopo la virgola, <span class="mono">${decStr(fr.rows[0].num, fr.rows[0].den)}</span>, e moltiplicala per ${base}: la parte intera del prodotto è la prima cifra dopo la virgola del risultato. Togli quella parte intera e ripeti con ciò che resta, finché diventa 0.</p>
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

/* ---------- Virgola mobile (IEEE 754) ---------- */

// Bit di esponente (e), bit di mantissa (m) e bias dei due formati.
const FLOAT = { 32: { e: 8, m: 23, bias: 127 }, 64: { e: 11, m: 52, bias: 1023 } };

// Parte intera di log2(num/den), con num e den positivi.
function log2floor(num, den) {
  const e = num.toString(2).length - den.toString(2).length;
  const reaches = e >= 0 ? num >= den << BigInt(e) : num << BigInt(-e) >= den;
  return reaches ? e : e - 1;
}

// Forma normalizzata 1,xxx × 2^e di num/den (positivo), con al più `max` cifre dopo la virgola.
function normalized(num, den, max) {
  const e = log2floor(num, den);
  const [n, d] = e >= 0 ? [num, den << BigInt(e)] : [num << BigInt(-e), den];
  const fr = fracToBase(n - d, d, 2, max);
  return { e, text: `1${fr.digits ? `,${fr.digits}` : ''}${fr.exact ? '' : '…'}` };
}

// Divisione intera arrotondata al più vicino (a parità, al pari).
function roundDiv(n, d) {
  let q = n / d;
  const r = n % d;
  if (2n * r > d || (2n * r === d && q % 2n === 1n)) q++;
  return { q, exact: r === 0n };
}

function floatFields(size, sign, E, M, extra) {
  const F = FLOAT[size];
  const expBits = E.toString(2).padStart(F.e, '0');
  const mantBits = M.toString(2).padStart(F.m, '0');
  const bits = sign + expBits + mantBits;
  return {
    size, sign, expBits, mantBits, bits, E,
    text: `${sign} ${expBits} ${mantBits}`,
    hex: BigInt('0b' + bits).toString(16).toUpperCase().padStart(size / 4, '0'),
    ...extra,
  };
}

// Codifica ±num/den in virgola mobile a 32 o 64 bit.
function encodeFloat(neg, num, den, size) {
  const { m, bias } = FLOAT[size];
  const sign = neg ? '1' : '0';
  const one = 1n << BigInt(m);
  if (num === 0n) return floatFields(size, '0', 0, 0n, { kind: 'zero', exact: true });
  let e = log2floor(num, den);
  if (e < 1 - bias) {
    // Troppo piccolo per la forma normalizzata: esponente fisso al minimo, mantissa 0,xxx
    const r = roundDiv(num << BigInt(bias - 1 + m), den);
    if (r.q === 0n) return floatFields(size, sign, 0, 0n, { kind: 'zero', exact: false });
    if (r.q === one) return floatFields(size, sign, 1, 0n, { kind: 'normal', e: 1 - bias, exact: false });
    return floatFields(size, sign, 0, r.q, { kind: 'sub', e: 1 - bias, exact: r.exact });
  }
  const shift = e - m;
  const r = shift >= 0 ? roundDiv(num, den << BigInt(shift)) : roundDiv(num << BigInt(-shift), den);
  if (r.q === one << 1n) {
    r.q = one;
    e++;
  }
  if (e > bias) return { overflow: true };
  return floatFields(size, sign, e + bias, r.q - one, { kind: 'normal', e, exact: r.exact });
}

// Legge 32 o 64 bit in virgola mobile e ne ricava il valore esatto num/den.
function decodeFloat(bits) {
  const size = bits.length;
  const { e: eb, m, bias } = FLOAT[size];
  const sign = bits[0];
  const E = parseInt(bits.slice(1, 1 + eb), 2);
  const M = BigInt('0b' + bits.slice(1 + eb));
  const f = floatFields(size, sign, E, M);
  if (E === 2 ** eb - 1) return { ...f, kind: M === 0n ? 'inf' : 'nan' };
  if (E === 0) {
    return { ...f, kind: M === 0n ? 'zero' : 'sub', e: 1 - bias, num: M, den: 1n << BigInt(m + bias - 1) };
  }
  const e = E - bias;
  const full = (1n << BigInt(m)) + M;
  return e >= m
    ? { ...f, kind: 'normal', e, num: full << BigInt(e - m), den: 1n }
    : { ...f, kind: 'normal', e, num: full, den: 1n << BigInt(m - e) };
}

/*
 * Converte `raw` dalla base `from` alla base `to` e costruisce i passaggi.
 * opts.signedIn  — un numero binario in ingresso va letto in complemento a 2
 * opts.floatIn   — un numero binario in ingresso è in virgola mobile IEEE 754 (32 o 64 bit)
 * opts.floatOut  — 32 o 64: il risultato in base 2 va scritto in virgola mobile
 * opts.bits      — bit della parte intera per il complemento a 2 in uscita ('auto' o un numero)
 * opts.fracLimit — cifre dopo la virgola a cui fermarsi se l'espansione non termina
 */
function solve(raw, from, to, opts = {}) {
  const p = parseNumber(raw, from);
  if (p.empty) return { empty: true };
  if (p.error) return { error: p.error.format ? FORMAT_MSG : invalidDigitMessage(p.error.ch, from) };

  const floatIn = !!opts.floatIn && from === 2;
  const signedIn = !!opts.signedIn && from === 2 && !floatIn;
  const floatOut = to === 2 && opts.floatOut ? opts.floatOut : 0;
  const tag = ' <span class="dim">(complemento a 2)</span>';
  const floatTag = ' <span class="dim">(IEEE 754)</span>';
  const mono = s => `<span class="mono">${s}</span>`;
  const blocks = [];
  let { neg, num, den } = p;
  let source = (p.neg ? MINUS : '') + joinParts(p.intDigits, p.fracDigits);
  let srcInt = p.intDigits, srcFrac = p.fracDigits;

  if (floatIn) {
    if (p.hasSign || clean(raw).includes(',')) return { error: 'In virgola mobile si scrivono soltanto i bit, senza segno né virgola.' };
    if (!FLOAT[p.rawInt.length]) return { error: `In virgola mobile IEEE 754 servono 32 o 64 bit: ne hai scritti ${p.rawInt.length}.` };
    const d = decodeFloat(p.rawInt);
    const F = FLOAT[d.size];
    source = d.text;
    if (d.kind === 'inf' || d.kind === 'nan') {
      const display = d.kind === 'nan' ? 'NaN' : (d.sign === '1' ? MINUS : '+') + '∞';
      const why = d.kind === 'nan'
        ? 'L\'esponente ha tutti i bit a 1 e la mantissa non è zero: è un valore speciale, «non un numero» (NaN).'
        : 'L\'esponente ha tutti i bit a 1 e la mantissa è zero: è il valore speciale infinito.';
      return { display, copy: display, source, value: null, twosBits: null, floatBits: null, special: true,
        steps: note(why, `${withBase(source, 2)}${floatTag} = ${display}`) };
    }
    ({ num, den } = d);
    neg = d.sign === '1' && num > 0n;
    srcInt = (num / den).toString(2);
    srcFrac = fracToBase(num % den, den, 2, 2000).digits;
    const trimmed = d.mantBits.replace(/0+$/, '');
    const mant = (d.kind === 'sub' ? '0' : '1') + (trimmed ? `,${trimmed}` : '');
    const expMeaning = d.kind === 'sub'
      ? `tutti 0: numero denormalizzato, esponente ${MINUS}${F.bias - 1}`
      : `${d.E} ${MINUS} ${F.bias} = ${d.e < 0 ? MINUS + -d.e : d.e}`;
    blocks.push({
      title: 'Segno, esponente e mantissa',
      body: `<p>I ${d.size} bit si dividono in tre campi: 1 bit di segno, ${F.e} di esponente e ${F.m} di mantissa. All'esponente va tolto il bias ${F.bias}; davanti alla mantissa va rimesso l'1 sottinteso.</p>
        ${table(['Campo', 'Bit', 'Significato'], `<tr><td>Segno</td><td>${d.sign}</td><td class="r">${d.sign === '1' ? 'negativo' : 'positivo'}</td></tr><tr><td>Esponente</td><td>${d.expBits}</td><td class="r">${expMeaning}</td></tr><tr><td>Mantissa</td><td>${d.mantBits}</td><td class="r hl">${mant}</td></tr>`)}`,
    });
    if (num > 0n) {
      const move = d.e === 0 ? 'la virgola resta dov\'è' : `sposta la virgola di ${Math.abs(d.e)} ${Math.abs(d.e) === 1 ? 'posto' : 'posti'} a ${d.e > 0 ? 'destra' : 'sinistra'}`;
      blocks.push({
        title: 'Valore in base 2',
        body: `<p>Il numero vale mantissa × 2 elevato all'esponente: ${move}.</p>
          <p class="line mono">${mant} × ${power(2, d.e)} = <strong>${joinParts(srcInt, srcFrac)}</strong></p>
          ${neg ? `<p class="line">Il bit di segno è 1: il risultato avrà il ${MINUS} davanti.</p>` : ''}`,
      });
    }
  } else if (signedIn) {
    if (p.hasSign) return { error: `In complemento a 2 il segno è dato dal primo bit: togli il ${MINUS}.` };
    const t = readTwos(p.rawInt, p.rawFrac);
    ({ neg, num, den } = t);
    const typed = joinParts(p.rawInt, p.rawFrac);
    const fill = t.padded === typed ? '' : `Il numero si completa a ${t.width} bit${p.rawFrac ? ' di parte intera' : ''} aggiungendo zeri a sinistra: ${mono(t.padded)}. `;
    source = t.padded;
    srcInt = (num / den).toString(2);
    srcFrac = fracToBase(num % den, den, 2, 1000).digits;
    blocks.push({
      title: 'Segno e valore assoluto',
      body: neg
        ? `<p>${fill}Il primo bit è 1, quindi il numero è negativo. Per ricavare il valore assoluto inverti tutti i bit e somma 1${p.rawFrac ? ' all\'ultimo bit dopo la virgola' : ''}.</p>
          ${table(['Operazione', 'Bit'], `<tr><td>Numero</td><td class="r">${source}</td></tr><tr><td>Bit invertiti</td><td class="r">${t.inverted}</td></tr><tr><td>+ 1</td><td class="r hl">${t.magnitude}</td></tr>`)}
          <p class="line">Il valore assoluto è <strong class="mono">${joinParts(srcInt, srcFrac)}</strong>: lo si converte e si mette il ${MINUS} davanti al risultato.</p>`
        : `<p>${fill}Il primo bit è 0, quindi il numero è positivo e si converte normalmente.</p>`,
    });
  }

  const value = { neg, num, den };
  const sourceHTML = withBase(source, from) + (floatIn ? floatTag : signedIn ? tag : '');
  const done = (display, steps, extra) => ({
    display, steps, value, source,
    copy: display.replace('…', '').replace(MINUS, '-').replace(/ /g, ''),
    twosBits: null, floatBits: null,
    ...extra,
  });

  if (num === 0n) {
    if (floatOut) {
      const zero = encodeFloat(false, 0n, 1n, floatOut);
      return done(zero.text, note('In virgola mobile lo zero si scrive con tutti i bit a 0.', `${sourceHTML} = ${withBase(zero.text, 2)}${floatTag}`), { floatBits: zero.bits });
    }
    return done('0', note('Lo zero si scrive 0 in qualsiasi base.', `${sourceHTML} = ${withBase('0', to)}`));
  }
  if (from === to && !floatIn && !floatOut) {
    return done(source, note('La base di partenza e quella di arrivo coincidono: il numero resta invariato.', `${sourceHTML} = ${sourceHTML}`));
  }

  const I = num / den, R = num % den;
  const fr = expandFrac(R, den, to, floatOut ? FLOAT[floatOut].m + 8 : opts.fracLimit || MAX_FRAC);
  const tInt = intToBase(I, to);
  const magnitude = fmt(tInt, fr);
  const hasFrac = R > 0n;

  // Virgola mobile in uscita
  let enc = null;
  if (floatOut) {
    enc = encodeFloat(neg, num, den, floatOut);
    if (enc.overflow) return { error: `Il numero è troppo grande per la virgola mobile a ${floatOut} bit.` };
  }

  // Complemento a 2 in uscita
  let twos = null;
  if (neg && to === 2 && !floatOut) {
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
  const display = enc ? enc.text : twos ? twos.result + (fr.exact ? '' : '…') : (neg ? MINUS : '') + magnitude;

  if (neg && !signedIn && !floatIn) {
    blocks.push({
      title: 'Segno',
      body: `<p>Il numero è negativo: metti da parte il segno e lavora sul valore assoluto ${mono(joinParts(srcInt, srcFrac))}. ${
        enc ? 'Alla fine il segno diventa il primo bit: 1 per i negativi.'
          : twos ? 'Alla fine il segno si esprime con il complemento a 2.' : `Alla fine rimetti il ${MINUS} davanti al risultato.`}</p>`,
    });
  }
  if (from !== to) {
    if (from !== 10) {
      blocks.push(...toDecimalBlocks(srcInt, srcFrac, from, I, R, den));
    }
    if (to !== 10) {
      blocks.push({
        title: hasFrac ? `Da base 10 a base ${to} · parte intera` : `Da base 10 a base ${to}`,
        body: intDivisionStep(I, to, tInt, hasFrac),
      });
      if (hasFrac) {
        blocks.push({ title: `Da base 10 a base ${to} · parte frazionaria`, body: fracMultiplyStep(fr, to, magnitude) });
      }
    }
    if (POW2_BITS[from] && POW2_BITS[to] && fr.exact) {
      blocks.push({ mark: '+', title: 'Metodo rapido', body: shortcutStep(srcInt, srcFrac, from, to) });
    }
  }
  if (twos) {
    blocks.push({
      title: `Complemento a 2 su ${twos.n} bit`,
      body: `<p>Scrivi il valore assoluto con ${twos.n} bit${hasFrac ? ' di parte intera' : ''} (aggiungendo zeri a sinistra), inverti tutti i bit e somma 1${fr.digits ? ' all\'ultimo bit dopo la virgola' : ''}. Il primo bit a 1 indica che il numero è negativo.</p>
        ${table(['Operazione', 'Bit'], `<tr><td>Valore assoluto</td><td class="r">${twos.padded}</td></tr><tr><td>Bit invertiti</td><td class="r">${twos.inverted}</td></tr><tr><td>+ 1</td><td class="r hl">${twos.result}</td></tr>`)}`,
    });
  }
  if (enc) {
    const F = FLOAT[floatOut];
    const norm = normalized(num, den, F.m + 6);
    const signRow = `<tr><td>Segno</td><td>${neg ? 'negativo' : 'positivo'}</td><td class="r">${enc.sign}</td></tr>`;
    if (enc.kind === 'normal' && norm.e >= 1 - F.bias) {
      blocks.push({
        title: 'Forma normalizzata',
        body: `<p>In virgola fissa il numero è ${mono(magnitude)}. Sposta la virgola subito dopo il primo 1: ogni posto verso sinistra aumenta l'esponente di 1, ogni posto verso destra lo diminuisce.</p>
          <p class="line mono">${magnitude} = <strong>${norm.text} × ${power(2, norm.e)}</strong></p>`,
      });
      const rounded = enc.exact ? 'completate con zeri' : 'arrotondate';
      blocks.push({
        title: 'Segno, esponente e mantissa',
        body: `<p>All'esponente si somma il bias ${F.bias} e lo si scrive su ${F.e} bit. La mantissa sono le cifre dopo la virgola della forma normalizzata (l'1 iniziale è sottinteso), ${rounded} a ${F.m} bit.</p>
          ${table(['Campo', 'Calcolo', 'Bit'], `${signRow}<tr><td>Esponente</td><td>${norm.e < 0 ? MINUS + -norm.e : norm.e} + ${F.bias} = ${norm.e + F.bias}${enc.e !== norm.e ? `, +1 per l'arrotondamento = ${enc.E}` : ''}</td><td class="r">${enc.expBits}</td></tr><tr><td>Mantissa</td><td>${F.m} bit dopo la virgola</td><td class="r hl">${enc.mantBits}</td></tr>`)}`,
      });
    } else {
      blocks.push({
        title: 'Numero denormalizzato',
        body: `<p>Il numero è più piccolo di ${power(2, 1 - F.bias)}, il minimo che si può scrivere in forma normalizzata. Si usa allora l'esponente con tutti i bit a 0 e la mantissa contiene le cifre di 0,… × ${power(2, 1 - F.bias)}${enc.kind === 'zero' ? ': qui è così piccolo che viene arrotondato a zero' : ''}.</p>
          ${table(['Campo', 'Calcolo', 'Bit'], `${signRow}<tr><td>Esponente</td><td>${enc.E ? 'minimo' : 'tutti 0'}</td><td class="r">${enc.expBits}</td></tr><tr><td>Mantissa</td><td>${F.m} bit</td><td class="r hl">${enc.mantBits}</td></tr>`)}`,
      });
    }
    blocks[blocks.length - 1].body += `<p class="line">Unisci i tre campi: <strong class="mono">${enc.text}</strong></p>
      <p class="line">In esadecimale: <span class="mono">${enc.hex}</span></p>`;
  }

  const outTag = enc ? floatTag : twos ? tag : '';
  const steps = renderSteps(blocks, `${sourceHTML} = ${withBase(display, to)}${outTag}`);
  return done(display, steps, {
    truncated: !enc && !fr.exact,
    hasFrac,
    twosBits: twos ? twos.n : null,
    floatBits: enc ? enc.bits : null,
    wantsBits: neg && to === 2 && !floatOut,
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

function columnAdd(x, y, base, f, width = 0) {
  const zeros = Math.max(f + 1, width);
  const W = Math.max(intToBase(x + y, base).length, zeros);
  const str = v => intToBase(v, base).padStart(zeros, '0').padStart(W, ' ');
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

// Sottrazione binaria x − y sommando al minuendo il complemento a 1 o a 2 del sottraendo.
// x e y sono interi scalati con f bit dopo la virgola.
function complementSub(x, y, f, kind) {
  // Si lavora su una lunghezza standard (almeno 8 bit di parte intera), anche se i numeri sono più corti.
  const F = BigInt(f);
  const intBits = stdWidth(Math.max((x >> F).toString(2).length, (y >> F).toString(2).length));
  const n = intBits + f;
  const full = 1n << BigInt(n);
  const bits = v => withComma(v.toString(2).padStart(n, '0'), f);
  const row = (label, v, hl) => `<tr><td>${label}</td><td class="r${hl ? ' hl' : ''}">${bits(v)}</td></tr>`;
  const inverted = full - 1n - y;
  const comp = kind === 2 ? inverted + 1n : inverted;
  const sum = x + comp;
  const carry = sum >= full;
  const last = f ? ' all\'ultimo bit' : '';

  let prep = row('Minuendo', x) + row('Sottraendo', y);
  prep += kind === 2
    ? row('Bit del sottraendo invertiti', inverted) + row('+ 1 → complemento a 2', comp, true)
    : row('Bit del sottraendo invertiti → complemento a 1', comp, true);

  let mag, ending;
  if (kind === 2 && carry) {
    mag = sum - full;
    ending = `La somma produce un riporto oltre il bit più a sinistra: il riporto finale si scarta e il risultato è positivo.`;
  } else if (kind === 2) {
    mag = full - sum;
    ending = `Non c'è riporto oltre il bit più a sinistra: il risultato è negativo. Il suo valore assoluto è il complemento a 2 della somma (inverti i bit e somma 1${last}): ${bits(sum)} → ${bits(mag)}.`;
  } else if (carry) {
    mag = sum - full + 1n;
    ending = `La somma produce un riporto oltre il bit più a sinistra: il riporto finale si toglie e si somma${last} (riporto circolare), ${bits(sum - full)} + 1 = ${bits(mag)}. Il risultato è positivo.`;
  } else {
    mag = full - 1n - sum;
    ending = `Non c'è riporto oltre il bit più a sinistra: il risultato è negativo. Il suo valore assoluto si ottiene invertendo i bit della somma: ${bits(sum)} → ${bits(mag)}.`;
  }
  const neg = !carry && mag > 0n;
  const intro = kind === 2
    ? `inverti tutti i bit del sottraendo e aggiungi 1${last}`
    : 'inverti tutti i bit del sottraendo';
  return {
    value: neg ? -mag : mag,
    body: `<p>Scrivi i due numeri su ${intBits} bit${f ? ' di parte intera, allineando le virgole' : ''} (aggiungendo zeri a sinistra). Invece di sottrarre, somma al minuendo il complemento a ${kind} del sottraendo: ${intro}.</p>
      ${table(['Operazione', 'Bit'], prep)}
      <p style="margin-top:14px">Somma il minuendo e il complemento:</p>
      ${columnAdd(x, comp, 2, f, n).layout}
      <p class="line">${ending}</p>
      <p class="line">Risultato: <strong class="mono">${neg ? MINUS : ''}${scaledToStr(mag, f, 2)}</strong></p>`,
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

// Lo stesso calcolo in forma normalizzata (mantissa × 2^esponente), per i numeri binari.
function floatOpBlock(a, b, op, rn, rd) {
  if (a.num === 0n || b.num === 0n || rn === 0n) return null;
  const mono = s => `<span class="mono">${s}</span>`;
  const rNeg = rn < 0n, rAbs = rNeg ? -rn : rn;
  const na = normalized(a.num, a.den, 60), nb = normalized(b.num, b.den, 60), nr = normalized(rAbs, rd, 30);
  const signed = (neg, s, wrap) => neg ? (wrap ? `(${MINUS}${s})` : MINUS + s) : s;
  const num = (v, wrap) => v < 0 ? (wrap ? `(${MINUS}${-v})` : MINUS + -v) : String(v);
  const sci = (neg, text, e) => `${signed(neg, text)} × ${power(2, e)}`;
  // Mantissa di num/den quando l'esponente è E
  const mant = (n, d, E) => {
    const [x, y] = E >= 0 ? [n, d << BigInt(E)] : [n << BigInt(-E), d];
    return fmt((x / y).toString(2), fracToBase(x % y, y, 2, 30));
  };
  const lines = [`Scrivi i due numeri in forma normalizzata: ${mono(sci(a.neg, na.text, na.e))} e ${mono(sci(b.neg, nb.text, nb.e))}.`];
  let E, mr;
  if (op === '+' || op === '-') {
    E = Math.max(na.e, nb.e);
    const ma = mant(a.num, a.den, E), mb = mant(b.num, b.den, E);
    mr = mant(rAbs, rd, E);
    lines.push(na.e === nb.e
      ? 'Gli esponenti sono già uguali.'
      : `Porta entrambi all'esponente più grande (${num(E)}) spostando la virgola dell'altro numero: ${mono(sci(na.e < nb.e ? a.neg : b.neg, na.e < nb.e ? ma : mb, E))}.`);
    lines.push(`${op === '+' ? 'Somma' : 'Sottrai'} le mantisse: ${mono(`${signed(a.neg, ma)} ${OP_SIGN[op]} ${signed(b.neg, mb, true)} = ${signed(rNeg, mr)}`)}.`);
  } else {
    E = op === '*' ? na.e + nb.e : na.e - nb.e;
    mr = mant(rAbs, rd, E);
    lines.push(op === '*'
      ? `Moltiplica le mantisse e somma gli esponenti: ${mono(`${na.text} × ${nb.text} = ${mr}`)} e ${mono(`${num(na.e)} + ${num(nb.e, true)} = ${num(E)}`)}.`
      : `Dividi le mantisse e sottrai gli esponenti: ${mono(`${na.text} ÷ ${nb.text} = ${mr}`)} e ${mono(`${num(na.e)} ${MINUS} ${num(nb.e, true)} = ${num(E)}`)}.`);
    if (a.neg || b.neg) lines.push(`Segni ${a.neg === b.neg ? 'concordi: il risultato è positivo' : 'discordi: il risultato è negativo'}.`);
  }
  lines.push(mr === '1' || mr.startsWith('1,')
    ? `Il risultato è già normalizzato: ${mono(sci(rNeg, mr, E))}.`
    : `Normalizza il risultato: ${mono(`${sci(rNeg, mr, E)} = ${sci(rNeg, nr.text, nr.e)}`)}.`);
  const enc = encodeFloat(rNeg, rAbs, rd, 32);
  if (!enc.overflow) {
    lines.push(`In IEEE 754 a 32 bit: <strong class="mono">${enc.text}</strong>${enc.exact ? '' : ' (mantissa arrotondata)'}.`);
  }
  return lines.map((l, i) => `<p${i ? ' class="line"' : ''}>${l}</p>`).join('');
}

// Esegue `a op b` nella base indicata e costruisce i passaggi.
// opts.float — in base 2 aggiunge lo stesso calcolo in virgola mobile
function solveOp(rawA, rawB, base, op, opts = {}) {
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
    const signs = expr => blocks.push({
      title: 'Segni',
      body: `<p>Tenendo conto dei segni l'operazione diventa ${mono(expr)}: si lavora sui valori assoluti${neg && sa === sb ? ' e il segno si mette alla fine' : ''}.</p>`,
    });

    if (sa === sb) {
      if (a.neg || b.neg) signs(neg ? `${MINUS}(${magA} + ${magB})` : `${magA} + ${magB}`);
      const col = columnAdd(x, y, base, f);
      blocks.push({
        title: 'Somma in colonna',
        body: `<p>${f ? 'Allinea le virgole, poi somma' : 'Somma'} colonna per colonna partendo da destra: quando il totale arriva a ${base} o lo supera, scrivi il resto e riporta 1 nella colonna a sinistra.</p>
          ${col.layout}<p>La riga in piccolo indica i riporti.</p>`,
      });
      blocks.push({ title: 'Colonna per colonna', body: `<p>I calcoli sono scritti con i valori decimali delle cifre.</p>${col.details}` });
    } else if (base === 2) {
      // In binario la sottrazione si fa con i complementi: il minuendo è l'addendo positivo.
      const [m, s, mStr, sStr] = sa > 0n ? [x, y, magA, magB] : [y, x, magB, magA];
      if (a.neg || b.neg) signs(`${mStr} ${MINUS} ${sStr}`);
      blocks.push({ title: 'Sottrazione con il complemento a 2', body: complementSub(m, s, f, 2).body });
      blocks.push({ title: 'Sottrazione con il complemento a 1', body: complementSub(m, s, f, 1).body });
    } else {
      const swap = y > x;
      const expr = swap ? `${magB} ${MINUS} ${magA}` : `${magA} ${MINUS} ${magB}`;
      if (a.neg || b.neg || swap) signs(neg ? `${MINUS}(${expr})` : expr);
      const col = swap ? columnSub(y, x, base, f) : columnSub(x, y, base, f);
      blocks.push({
        title: 'Sottrazione in colonna',
        body: `<p>${f ? 'Allinea le virgole, poi sottrai' : 'Sottrai'} colonna per colonna partendo da destra: quando la cifra sopra è più piccola, chiedi in prestito 1 dalla colonna a sinistra, che qui vale ${base}.</p>
          ${col.layout}<p>La riga in piccolo indica i prestiti.</p>`,
      });
      blocks.push({ title: 'Colonna per colonna', body: `<p>I calcoli sono scritti con i valori decimali delle cifre.</p>${col.details}` });
    }
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
  const expr = `${shown(a, magA)} ${OP_SIGN[op]} ${shown(b, magB, true)}`;
  let final = `${expr} = ${withBase(display, base)}`;

  // Risultato come frazione esatta
  const an = a.neg ? -a.num : a.num, bn = b.neg ? -b.num : b.num;
  let [rn, rd] = op === '+' ? [an * b.den + bn * a.den, a.den * b.den]
    : op === '-' ? [an * b.den - bn * a.den, a.den * b.den]
    : op === '*' ? [an * bn, a.den * b.den]
    : [an * b.den, a.den * bn];
  if (rd < 0n) [rn, rd] = [-rn, -rd];

  if (opts.float && base === 2) {
    const body = floatOpBlock(a, b, op, rn, rd);
    if (body) blocks.push({ title: 'In virgola mobile', body });
  }

  if (base !== 10) {
    const dec = (n, d, wrap) => {
      const s = (n < 0n ? MINUS : '') + decStr(n < 0n ? -n : n, d, MAX_FRAC);
      return wrap && n < 0n ? `(${s})` : s;
    };
    final += `<br><span class="dim">In base 10: ${dec(an, a.den)} ${OP_SIGN[op]} ${dec(bn, b.den, true)} = ${dec(rn, rd)}</span>`;
  }

  return {
    display, truncated, expr,
    value: { neg: rn < 0n, num: rn < 0n ? -rn : rn, den: rd },
    copy: display.replace('…', '').replace(MINUS, '-'),
    steps: renderSteps(blocks, final, false),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { parseNumber, solve, readTwos, solveOp, complementSub, stdWidth, encodeFloat, decodeFloat };
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

  const tabs = [$('tab-convert'), $('tab-ops'), $('tab-train')];

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

  // Su mobile Invio chiude la tastiera (togliendo il focus) e porta in vista il risultato.
  function showOnEnter(input, target, next) {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (next && !next.value.trim()) {
        next.focus();
        return;
      }
      input.blur();
      // Aspetta che la tastiera si chiuda prima di scorrere.
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 250);
    });
  }

  /* Convertitore */

  const cInput = $('c-input'), cFrom = $('c-from'), cTo = $('c-to');
  const cOpts = $('c-opts'), cInFmt = $('c-in-fmt'), cInWrap = $('c-in-wrap');
  const cOutFmt = $('c-out-fmt'), cOutWrap = $('c-out-wrap');
  const cBits = $('c-bits'), cBitsWrap = $('c-bits-wrap');
  const cOutput = $('c-output'), cError = $('c-error'), cCopy = $('c-copy');
  const cSteps = $('c-steps'), cStepsBody = $('c-steps-body');
  let cResult = null;

  fillBases(cFrom, 2);
  fillBases(cTo, 10);

  function convert() {
    const from = Number(cFrom.value), to = Number(cTo.value);
    const res = solve(cInput.value, from, to, {
      signedIn: cInFmt.value === 'twos',
      floatIn: cInFmt.value === 'float',
      floatOut: Number(cOutFmt.value),
      bits: cBits.value === 'auto' ? 'auto' : Number(cBits.value),
    });
    const ok = res.display !== undefined;
    cResult = ok ? res : null;

    cInWrap.hidden = from !== 2;
    cOutWrap.hidden = to !== 2;
    cBitsWrap.hidden = !res.wantsBits;
    cOpts.hidden = cInWrap.hidden && cOutWrap.hidden && cBitsWrap.hidden;
    cOutput.classList.toggle('long', ok && res.display.length > 24);
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

  for (const el of [cFrom, cTo, cInFmt, cOutFmt, cBits]) el.addEventListener('change', convert);
  cInput.addEventListener('input', convert);
  showOnEnter(cInput, cOutput.closest('.hero'));

  $('c-swap').addEventListener('click', () => {
    const from = cFrom.value;
    cFrom.value = cTo.value;
    cTo.value = from;
    if (cResult) {
      cInput.value = cResult.copy;
      // Il risultato va riletto nel formato in cui è stato scritto.
      cInFmt.value = cResult.floatBits ? 'float' : cResult.twosBits !== null ? 'twos' : 'fixed';
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

  const tKind = $('t-kind'), tFrom = $('t-from'), tTo = $('t-to'), tBase = $('t-base'), tOp = $('t-op');
  const tLevel = $('t-level'), tNeg = $('t-neg'), tFrac = $('t-frac');
  const tPrompt = $('t-prompt'), tNumber = $('t-number'), tNote = $('t-note'), tAnswer = $('t-answer');
  const tCheck = $('t-check'), tFeedback = $('t-feedback');
  const tSteps = $('t-steps'), tStepsBody = $('t-steps-body'), tScore = $('t-score');

  const COMMON_BASES = [2, 8, 10, 16];
  // Conversioni: [minimo, massimo, massimo esponente del denominatore 2^m della parte frazionaria]
  const LEVELS = { easy: [4, 255, 2], medium: [256, 4095, 3], hard: [4096, 65535, 4] };
  // Operazioni: [intervallo degli operandi, intervallo del secondo fattore o del divisore, cifre dopo la virgola]
  const OP_LEVELS = { easy: [[2, 31], [2, 7], 1], medium: [[16, 255], [2, 15], 1], hard: [[128, 4095], [4, 63], 2] };
  const TRAIN_FRAC = 4;  // cifre richieste quando la parte frazionaria non termina
  const score = { right: 0, total: 0 };
  let exercise = null;
  let prev = { from: 'random', to: '10' };

  fillBases(tFrom, 'random', true);
  fillBases(tTo, 10);
  fillBases(tBase, 'random', true);

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[randomInt(0, list.length - 1)];
  }

  // Da 1 a maxLen cifre casuali, con l'ultima diversa da zero.
  function randomDigits(base, maxLen) {
    let digits = '';
    for (let i = randomInt(1, maxLen); i > 1; i--) digits += DIGITS[randomInt(0, base - 1)];
    return digits + DIGITS[randomInt(1, base - 1)];
  }

  // Parte frazionaria nella base di partenza; quando possibile termina anche in quella di arrivo.
  function randomFraction(from, to, maxPow) {
    const m = randomInt(1, maxPow);
    const k = BigInt(2 * randomInt(0, 2 ** (m - 1) - 1) + 1);
    const den = 1n << BigInt(m);
    const src = fracToBase(k, den, from, 8);
    if (src.exact && fracToBase(k, den, to, 8).exact) return src.digits;
    return randomDigits(from, 2);
  }

  function conversionExercise() {
    const to = Number(tTo.value);
    const from = tFrom.value === 'random' ? pick(COMMON_BASES.filter(b => b !== to)) : Number(tFrom.value);
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
    const notes = [];
    if (signedIn) notes.push('Il numero è scritto in complemento a 2.');
    if (sol.twosBits) notes.push(`Rispondi in complemento a 2 su ${sol.twosBits} bit${sol.hasFrac ? ' di parte intera' : ''}.`);
    if (sol.truncated) notes.push(`Fermati a ${TRAIN_FRAC} cifre dopo la virgola.`);
    return { base: to, sol, notes, prompt: `Converti in base ${to}`, question: withBase(sol.source, from) };
  }

  function operationExercise() {
    const base = tBase.value === 'random' ? pick(COMMON_BASES) : Number(tBase.value);
    const op = tOp.value === 'random' ? pick(['+', '-', '*', '/']) : tOp.value;
    const [big, small, fracLen] = OP_LEVELS[tLevel.value];
    const operand = ([min, max], neg) => (neg ? '-' : '')
      + joinParts(intToBase(BigInt(randomInt(min, max)), base), tFrac.checked ? randomDigits(base, fracLen) : '');

    // Con i negativi attivi almeno uno dei due numeri è negativo.
    let negA = false, negB = false;
    if (tNeg.checked) {
      negA = Math.random() < 0.5;
      negB = !negA || Math.random() < 0.5;
    }

    let a = operand(big, negA);
    const b = operand(op === '+' || op === '-' ? big : small, negB);
    // Divisione: il dividendo è un prodotto, così il quoziente è esatto.
    if (op === '/') a = solveOp(operand(small, negA !== negB), b, base, '*').copy;

    const sol = solveOp(a, b, base, op);
    // L'avviso non dipende dal segno del risultato, per non suggerire la risposta.
    const notes = tNeg.checked || op === '-' ? [`Se il risultato è negativo scrivilo con il segno ${MINUS}.`] : [];
    return { base, sol, notes, prompt: `Calcola in base ${base}`, question: sol.expr };
  }

  // Virgola mobile: da base 10 a IEEE 754 a 32 bit oppure il contrario.
  function floatExercise() {
    const [min, max] = OP_LEVELS[tLevel.value][0];
    const maxPow = LEVELS[tLevel.value][2];
    const frac = tFrac.checked ? randomFraction(10, 2, maxPow) : '';
    const dec = (tNeg.checked ? '-' : '') + joinParts(String(randomInt(min, max)), frac);
    const encoded = solve(dec, 10, 2, { floatOut: 32 });
    if (Math.random() < 0.5) {
      return {
        base: 2, sol: encoded, bits: encoded.floatBits,
        notes: ['Scrivi i 32 bit: segno, esponente e mantissa (gli spazi sono facoltativi).'],
        prompt: 'Scrivi in virgola mobile IEEE 754 a 32 bit', question: withBase(encoded.source, 10),
      };
    }
    const sol = solve(encoded.floatBits, 2, 10, { floatIn: true });
    return {
      base: 10, sol, notes: ['Il numero è in virgola mobile IEEE 754 a 32 bit.'],
      prompt: 'Converti in base 10', question: withBase(sol.source, 2),
    };
  }

  const EXERCISES = { conv: conversionExercise, op: operationExercise, float: floatExercise };

  function newExercise() {
    exercise = EXERCISES[tKind.value]();
    tPrompt.textContent = exercise.prompt;
    tNumber.innerHTML = exercise.question;
    tNumber.classList.toggle('long', tNumber.textContent.length > 24);
    tNote.textContent = exercise.notes.join(' ');
    tNote.hidden = !exercise.notes.length;
    tAnswer.value = '';
    tAnswer.disabled = false;
    tCheck.disabled = false;
    tFeedback.hidden = true;
    tSteps.hidden = true;
    tSteps.open = false;
  }

  // Restituisce '' se la risposta è giusta, altrimenti il motivo dell'errore.
  function judge(answer) {
    const { base, sol } = exercise;
    const shown = `La tua risposta: <span class="mono">${esc(clean(answer).replace('-', MINUS))}</span>`;
    if (exercise.bits) {
      const typed = clean(answer);
      if (/[^01]/.test(typed)) return 'In virgola mobile si scrivono soltanto 0 e 1, senza segno né virgola.';
      if (typed.length !== 32) return `Servono 32 bit: ne hai scritti ${typed.length}.`;
      return typed === exercise.bits ? '' : shown;
    }
    const p = parseNumber(answer, base);
    if (p.error) return p.error.format ? FORMAT_MSG : invalidDigitMessage(p.error.ch, base);
    let a = p;
    if (sol.twosBits) {
      if (p.hasSign) return `In complemento a 2 non si usa il segno ${MINUS}: il segno è dato dal primo bit.`;
      a = readTwos(p.rawInt, p.rawFrac);
    }
    const v = sol.value;
    let same = a.neg === v.neg;
    if (same && sol.truncated) {
      const s = BigInt(base) ** BigInt(TRAIN_FRAC);
      same = a.num * s / a.den === v.num * s / v.den;
    } else if (same) {
      same = a.num * v.den === v.num * a.den;
    }
    return same ? '' : shown;
  }

  function checkAnswer() {
    if (!exercise || exercise.done) return;
    if (parseNumber(tAnswer.value, exercise.base).empty) {
      tAnswer.focus();
      return;
    }
    const { base, sol, question } = exercise;
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
      ? `<strong>Corretto!</strong><span class="mono">${question} = ${withBase(sol.display, base)}</span>`
      : `<strong>Non è corretto.</strong><span>${why}</span><span>Risposta giusta: <strong class="mono">${withBase(sol.display, base)}</strong></span>`;

    tStepsBody.innerHTML = sol.steps;
    tSteps.hidden = false;
    tSteps.open = !correct;
    tScore.textContent = `${score.right} / ${score.total}`;
    // Toglie il focus dal campo (su mobile chiude la tastiera) e porta in vista l'esito.
    tAnswer.blur();
    $('t-new').focus({ preventScroll: true });
    setTimeout(() => tFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 250);
  }

  // Le due basi non possono coincidere: se succede, l'altra prende il valore precedente.
  function onBaseChange(changed, other, prevChanged) {
    if (changed.value === other.value) {
      other.value = prevChanged !== 'random' ? prevChanged : (changed.value === '10' ? '2' : '10');
    }
    prev = { from: tFrom.value, to: tTo.value };
    newExercise();
  }

  function onKindChange() {
    for (const el of document.querySelectorAll('#panel-train [data-kind]')) {
      el.hidden = el.dataset.kind !== tKind.value;
    }
    newExercise();
  }

  tKind.addEventListener('change', onKindChange);
  tFrom.addEventListener('change', () => onBaseChange(tFrom, tTo, prev.from));
  tTo.addEventListener('change', () => onBaseChange(tTo, tFrom, prev.to));
  for (const el of [tBase, tOp, tLevel, tNeg, tFrac]) el.addEventListener('change', newExercise);
  $('t-new').addEventListener('click', () => { newExercise(); tAnswer.focus(); });
  $('t-form').addEventListener('submit', e => { e.preventDefault(); checkAnswer(); });

  onKindChange();

  /* Operazioni */

  const oA = $('o-a'), oB = $('o-b'), oOp = $('o-op'), oBase = $('o-base');
  const oOutput = $('o-output'), oError = $('o-error'), oCopy = $('o-copy');
  const oSteps = $('o-steps'), oStepsBody = $('o-steps-body');
  let oResult = null;

  const oFloat = $('o-float'), oFloatWrap = $('o-float-wrap');

  fillBases(oBase, 2);

  function operate() {
    const base = Number(oBase.value);
    const res = solveOp(oA.value, oB.value, base, oOp.value, { float: oFloat.checked });
    oFloatWrap.hidden = base !== 2;
    oOutput.classList.toggle('long', res.display !== undefined && res.display.length > 24);
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
  showOnEnter(oA, oOutput.closest('.hero'), oB);
  showOnEnter(oB, oOutput.closest('.hero'));
  for (const el of [oOp, oBase, oFloat]) el.addEventListener('change', operate);
  wireCopy(oCopy, () => oResult.copy);
}
