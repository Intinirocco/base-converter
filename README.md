# Basi

Un convertitore di basi numeriche che non si limita a dare il risultato: mostra anche **tutti i passaggi** per arrivarci, e ha una modalità di **allenamento** per esercitarsi.

**▶ Provalo online: [intinirocco.github.io/base-converter](https://intinirocco.github.io/base-converter/)**

## Cosa fa

### Converti

1. Scrivi un numero.
2. Scegli la base di partenza e quella di arrivo (da 2 a 16).
3. Il risultato compare subito, mentre digiti.

Aprendo la tendina **«Mostra i passaggi»** trovi il procedimento completo. Il pulsante con le due frecce scambia le basi, «Copia» copia il risultato.

Se inserisci una cifra che non esiste nella base scelta (ad esempio un `2` in binario), il sito ti dice quale cifra è sbagliata e quali sono ammesse.

### Allenamento

1. Scegli la base di partenza (anche casuale), la base di arrivo e la difficoltà.
2. Il sito genera un numero a caso: convertilo e scrivi la tua risposta.
3. Premi **«Verifica»**.

Se la risposta è giusta te lo conferma; se è sbagliata ti mostra quella corretta e apre la soluzione con tutti i passaggi. Un contatore tiene il conto delle risposte corrette.

| Difficoltà | Numeri generati (in base 10) |
| --- | --- |
| Facile | da 4 a 255 |
| Media | da 256 a 4095 |
| Difficile | da 4096 a 65535 |

## Come vengono spiegati i passaggi

La conversione passa dalla base 10, come si fa di solito a mano.

**1. Dalla base di partenza alla base 10** — ogni cifra viene moltiplicata per la base elevata alla sua posizione (contando da 0 a partire da destra), poi si sommano i risultati:

```
2F in base 16  →  2 × 16¹ + 15 × 16⁰  =  32 + 15  =  47
```

**2. Dalla base 10 alla base di arrivo** — si divide ripetutamente per la base annotando i resti, che letti dal basso verso l'alto formano il risultato:

```
47 ÷ 8 = 5   resto 7
 5 ÷ 8 = 0   resto 5        →  57 in base 8
```

**Metodo rapido** — quando entrambe le basi sono potenze di 2 (2, 4, 8, 16) viene mostrata anche la scorciatoia che passa dal binario raggruppando i bit:

```
2F in base 16  →  0010 1111  →  101 111  →  57 in base 8
```

## Limiti

- Solo numeri interi non negativi (niente virgola, niente numeri negativi).
- Basi da 2 a 16.
- Fino a 64 cifre per numero.

## Usarlo in locale

Il sito è fatto di tre file statici (`index.html`, `style.css`, `script.js`), senza dipendenze né build. Basta scaricare il repository e aprire `index.html` nel browser.

```bash
git clone https://github.com/Intinirocco/base-converter.git
```

L'interfaccia si adatta a telefono e computer e segue il tema chiaro o scuro del dispositivo.
