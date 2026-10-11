# Basi

Un sito per lavorare con le basi numeriche che non si limita a dare il risultato: mostra anche **tutti i passaggi** per arrivarci. Ha tre sezioni: il convertitore, l'allenamento e le operazioni nella stessa base.

**▶ Provalo online: [intinirocco.github.io/base-converter](https://intinirocco.github.io/base-converter/)**

## Cosa fa

### Converti

1. Scrivi un numero: intero o con la virgola, positivo o negativo (ad esempio `101101`, `-45`, `12,75`).
2. Scegli la base di partenza e quella di arrivo (da 2 a 16).
3. Il risultato compare subito, mentre digiti.

Aprendo la tendina **«Mostra i passaggi»** trovi il procedimento completo. Il pulsante con le due frecce scambia le basi, «Copia» copia il risultato.

Se inserisci una cifra che non esiste nella base scelta (ad esempio un `2` in binario), il sito ti dice quale cifra è sbagliata e quali sono ammesse.

### Allenamento

1. Scegli la base di partenza (anche casuale), la base di arrivo e la difficoltà.
2. Se vuoi, spunta **«Numeri negativi»** e **«Numeri con la virgola»**: senza spunte escono solo interi positivi.
3. Il sito genera un numero a caso: convertilo, scrivi la tua risposta e premi **«Verifica»**.

Se la risposta è giusta te lo conferma; se è sbagliata ti mostra quella corretta e apre la soluzione con tutti i passaggi. Un contatore tiene il conto delle risposte corrette.

| Difficoltà | Parte intera generata (in base 10) |
| --- | --- |
| Facile | da 4 a 255 |
| Media | da 256 a 4095 |
| Difficile | da 4096 a 65535 |

### Operazioni

Inserisci due numeri nella stessa base, scegli tra **+ − × ÷** e ottieni il risultato in quella base, con i passaggi:

- **somma e sottrazione** in colonna, con la riga dei riporti o dei prestiti e la spiegazione di ogni colonna;
- **moltiplicazione** in colonna, con i prodotti parziali;
- **divisione** lunga cifra per cifra, con quoziente intero, resto e cifre dopo la virgola.

Se la base non è 10, in fondo ai passaggi trovi la stessa operazione in base 10 come verifica.

## Come vengono spiegati i passaggi

La conversione passa dalla base 10, come si fa di solito a mano.

**1. Dalla base di partenza alla base 10** — ogni cifra viene moltiplicata per la base elevata alla sua posizione (da 0 in su a sinistra della virgola, negativa a destra), poi si sommano i risultati:

```
2F,8 in base 16  →  2 × 16¹ + 15 × 16⁰ + 8 × 16⁻¹  =  32 + 15 + 0,5  =  47,5
```

**2. Dalla base 10 alla base di arrivo** — per la parte intera si divide ripetutamente per la base annotando i resti, che si leggono dal basso verso l'alto:

```
47 ÷ 8 = 5   resto 7
 5 ÷ 8 = 0   resto 5        →  57
```

Per la parte frazionaria si moltiplica ripetutamente per la base: la parte intera di ogni prodotto è la cifra successiva, letta dall'alto verso il basso:

```
0,5 × 8 = 4,0   →  4        →  0,4          quindi 47,5 = 57,4 in base 8
```

Se la parte frazionaria non termina mai, il risultato si ferma a 12 cifre ed è seguito da «…».

**Metodo rapido** — quando entrambe le basi sono potenze di 2 (2, 4, 8, 16) viene mostrata anche la scorciatoia che passa dal binario raggruppando i bit a partire dalla virgola:

```
2F in base 16  →  0010 1111  →  101 111  →  57 in base 8
```

### Numeri negativi e complemento a 2

In binario i numeri negativi sono rappresentati in **complemento a 2**: si scrive il valore assoluto sul numero di bit scelto, si invertono tutti i bit e si somma 1.

```
−45 su 8 bit:   00101101  →  11010010  →  11010011
```

- Quando la base di arrivo è 2 puoi scegliere su quanti bit lavorare (4, 8, 16, 32 oppure automatico).
- Quando la base di partenza è 2, spunta **«Il numero binario è in complemento a 2»** per far leggere il primo bit come segno: così `11010011` vale −45 invece di 211.
- Nelle altre basi, e nella sezione Operazioni, i negativi si scrivono con il segno meno.

## Limiti

- Basi da 2 a 16.
- Fino a 64 cifre per numero nel convertitore, 40 nelle operazioni.
- Le espansioni che non terminano vengono troncate a 12 cifre dopo la virgola (4 nell'allenamento).

## Usarlo in locale

Il sito è fatto di tre file statici (`index.html`, `style.css`, `script.js`), senza dipendenze né build. Basta scaricare il repository e aprire `index.html` nel browser.

```bash
git clone https://github.com/Intinirocco/base-converter.git
```

L'interfaccia si adatta a telefono e computer e segue il tema chiaro o scuro del dispositivo.
