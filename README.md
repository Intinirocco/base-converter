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

Dalla tendina **«Esercizio»** scegli su cosa allenarti:

- **Conversioni** — scegli la base di partenza (anche casuale) e quella di arrivo: il sito genera un numero a caso da convertire.
- **Operazioni** — scegli la base e l'operazione (anche casuali): il sito propone un calcolo tra due numeri nella stessa base. Le divisioni hanno sempre un quoziente esatto.

In entrambi i casi puoi impostare la difficoltà e spuntare **«Numeri negativi»** e **«Numeri con la virgola»**: senza spunte escono solo interi positivi.

Scrivi la risposta e premi **«Verifica»**: se è giusta te lo conferma; se è sbagliata ti mostra quella corretta e apre la soluzione con tutti i passaggi. Un contatore tiene il conto delle risposte corrette.

| Difficoltà | Conversioni: parte intera (in base 10) | Operazioni: operandi (in base 10) |
| --- | --- | --- |
| Facile | da 4 a 255 | da 2 a 31 |
| Media | da 256 a 4095 | da 16 a 255 |
| Difficile | da 4096 a 65535 | da 128 a 4095 |

Nelle moltiplicazioni e nelle divisioni il secondo numero è più piccolo (fino a 7, 15 o 63 secondo la difficoltà).

### Operazioni

Inserisci due numeri nella stessa base, scegli tra **+ − × ÷** e ottieni il risultato in quella base, con i passaggi:

- **somma** in colonna, con la riga dei riporti e la spiegazione di ogni colonna;
- **sottrazione in base 2** con il complemento a 2 e con il complemento a 1 (vedi sotto);
- **sottrazione nelle altre basi** in colonna, con la riga dei prestiti;
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

In binario i numeri negativi sono rappresentati in **complemento a 2**: si scrive il valore assoluto su una lunghezza fissa di bit, si invertono tutti i bit e si somma 1.

```
−45 su 8 bit:   00101101  →  11010010  →  11010011
```

- Il sito lavora sempre su lunghezze standard: **8 bit**, oppure 16, 32 o 64 se il numero non ci sta. Quando la base di arrivo è 2 puoi anche fissare tu la lunghezza (8, 16 o 32 bit).
- Quando la base di partenza è 2, spunta **«Il numero binario è in complemento a 2»** per far leggere il primo bit come segno: così `11010011` vale −45 invece di 211.
- Un numero binario più corto viene prima completato con zeri a sinistra fino alla lunghezza standard, quindi gli zeri iniziali non cambiano il valore: `11000` e `011000` valgono entrambi 24 (`00011000`), mentre −8 si scrive `11111000`.
- Nell'allenamento la risposta in complemento a 2 va scritta con tutti i bit indicati nella consegna.
- Nelle altre basi, e nei risultati della sezione Operazioni, i negativi si scrivono con il segno meno.

### Sottrazione binaria con i complementi

In base 2 la sottrazione si trasforma in una somma: i due numeri si scrivono sullo stesso numero di bit (almeno 8, aggiungendo zeri a sinistra) e al minuendo si somma il complemento del sottraendo. Il sito mostra entrambi i metodi.

**Complemento a 2** — si invertono i bit del sottraendo e si aggiunge 1. Se la somma produce un riporto oltre il bit più a sinistra, lo si scarta e il risultato è positivo:

```
00001000 − 00000011:   00000011 → 11111100 → 11111101      00001000 + 11111101 = (1)00000101   →  101
```

Se non c'è riporto il risultato è negativo, e il suo valore assoluto è il complemento a 2 della somma:

```
00000011 − 00001000:   00001000 → 11110111 → 11111000      00000011 + 11111000 = 11111011   →  −00000101
```

**Complemento a 1** — si invertono soltanto i bit del sottraendo. Se c'è il riporto, lo si toglie e lo si somma al risultato (riporto circolare); se non c'è, il risultato è negativo e si invertono i bit della somma:

```
00001000 − 00000011:   00000011 → 11111100      00001000 + 11111100 = (1)00000100   →  00000100 + 1 = 101
```

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
