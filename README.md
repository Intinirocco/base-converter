# Basi

Un sito per lavorare con le basi numeriche che non si limita a dare il risultato: mostra anche **tutti i passaggi** per arrivarci. Ha tre sezioni: il convertitore, le operazioni nella stessa base e l'allenamento.

**▶ Provalo online: [intinirocco.github.io/base-converter](https://intinirocco.github.io/base-converter/)**

## Cosa fa

### Converti

1. Scrivi un numero: intero o con la virgola, positivo o negativo (ad esempio `101101`, `-45`, `12,75`).
2. Scegli la base di partenza e quella di arrivo: 2, 8, 10 o 16.
3. Il risultato compare subito, mentre digiti.

Aprendo la tendina **«Mostra i passaggi»** trovi il procedimento completo. Il pulsante con le due frecce scambia le basi, «Copia» copia il risultato.

Se inserisci una cifra che non esiste nella base scelta (ad esempio un `2` in binario), il sito ti dice quale cifra è sbagliata e quali sono ammesse.

### Operazioni

Inserisci due numeri nella stessa base, scegli tra **+ − × ÷** e ottieni il risultato in quella base, con i passaggi:

- **somma** in colonna, con la riga dei riporti e la spiegazione di ogni colonna;
- **sottrazione in base 2** con il complemento a 2 e con il complemento a 1 (vedi sotto);
- **sottrazione nelle altre basi** in colonna, con la riga dei prestiti;
- **moltiplicazione** in colonna, con i prodotti parziali;
- **divisione** lunga cifra per cifra, con quoziente intero, resto e cifre dopo la virgola.

Se la base non è 10, in fondo ai passaggi trovi la stessa operazione in base 10 come verifica. In base 2 puoi spuntare **«Mostra anche il calcolo in virgola mobile»** per vedere lo stesso calcolo in forma normalizzata.

### Allenamento

Dalla tendina **«Esercizio»** scegli su cosa allenarti:

- **Conversioni** — scegli la base di partenza (anche casuale) e quella di arrivo: il sito genera un numero a caso da convertire.
- **Operazioni** — scegli la base e l'operazione (anche casuali): il sito propone un calcolo tra due numeri nella stessa base. Le divisioni hanno sempre un quoziente esatto.
- **Virgola mobile** — il sito propone a caso di scrivere un numero decimale in IEEE 754 a 32 bit oppure di leggere 32 bit e trovarne il valore.

In tutti i casi puoi impostare la difficoltà e spuntare **«Numeri negativi»** e **«Numeri con la virgola»**: senza spunte escono solo interi positivi.

Scrivi la risposta e premi **«Verifica»**: se è giusta te lo conferma; se è sbagliata ti mostra quella corretta e apre la soluzione con tutti i passaggi. Un contatore tiene il conto delle risposte corrette.

Nella stessa scheda trovi anche:

- **Esercizi di fila** — scegli quanti esercizi fare di seguito (1, 2, 5, 10 o 20). Dopo una risposta giusta il successivo arriva da solo; dopo un errore la soluzione resta a schermo finché non premi «Prossimo esercizio». Alla fine della serie una finestra mostra il punteggio.
- **Calcolatrice** — un tastierino in base 10 per fare i conti dei passaggi, con parentesi e potenze. Per una divisione tra interi mostra anche quoziente e resto (`47 ÷ 8` dà 5,875, quoziente 5, resto 7).
- **Cronologia degli esercizi** — l'elenco degli esercizi fatti, con la risposta data, quella corretta e l'esito. Resta salvata nel browser (ultimi 200 esercizi) e si può svuotare.

L'esercizio in corso, le impostazioni e il punteggio della serie restano dove li hai lasciati anche cambiando scheda o ricaricando la pagina. Se cambi la base di arrivo, il numero da convertire resta lo stesso.

| Difficoltà | Conversioni: parte intera (in base 10) | Operazioni: operandi (in base 10) |
| --- | --- | --- |
| Facile | da 4 a 255 | da 2 a 31 |
| Media | da 256 a 4095 | da 16 a 255 |
| Difficile | da 4096 a 65535 | da 128 a 4095 |

Nelle moltiplicazioni e nelle divisioni il secondo numero è più piccolo (fino a 7, 15 o 63 secondo la difficoltà).

## Come vengono spiegati i passaggi

La conversione passa dalla base 10, come si fa di solito a mano.

**1. Dalla base di partenza alla base 10** — ogni cifra viene moltiplicata per il suo peso, cioè la base elevata alla posizione. Parte intera e parte frazionaria sono spiegate in due riquadri distinti: a sinistra della virgola i pesi partono da 1 e crescono, a destra l'esponente è negativo e il peso è una frazione (16⁻¹ = 1/16).

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

**Metodo rapido** — quando entrambe le basi sono potenze di 2 (2, 8, 16) viene mostrata anche la scorciatoia che passa dal binario raggruppando i bit a partire dalla virgola:

```
2F in base 16  →  0010 1111  →  101 111  →  57 in base 8
```

### Numeri negativi e complemento a 2

In binario i numeri negativi sono rappresentati in **complemento a 2**: si scrive il valore assoluto su una lunghezza fissa di bit, si invertono tutti i bit e si somma 1.

```
−45 su 8 bit:   00101101  →  11010010  →  11010011
```

- Il sito lavora sempre su lunghezze standard: **8 bit**, oppure 16, 32 o 64 se il numero non ci sta. Quando la base di arrivo è 2 puoi anche fissare tu la lunghezza (8, 16 o 32 bit).
- Quando la base di partenza è 2, scegli **«complemento a 2»** nella tendina «Il numero binario è in» per far leggere il primo bit come segno: così `11010011` vale −45 invece di 211.
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

### Virgola fissa e virgola mobile

La scrittura con la virgola in una posizione precisa, come `101,11`, è la **virgola fissa**. In **virgola mobile** il numero si scrive invece come mantissa × 2 elevato a un esponente, secondo lo standard **IEEE 754**:

| Formato | Segno | Esponente | Mantissa | Bias |
| --- | --- | --- | --- | --- |
| 32 bit | 1 bit | 8 bit | 23 bit | 127 |
| 64 bit | 1 bit | 11 bit | 52 bit | 1023 |

Per scrivere un numero in virgola mobile:

1. lo si converte in binario in virgola fissa: `5,75 = 101,11`;
2. lo si normalizza spostando la virgola dopo il primo 1: `101,11 = 1,0111 × 2²`;
3. all'esponente si somma il bias: `2 + 127 = 129 = 10000001`;
4. la mantissa sono le cifre dopo la virgola (l'1 iniziale è sottinteso), completate con zeri: `0111000…`;
5. il primo bit è il segno: 0 per i positivi, 1 per i negativi.

```
−5,75  →  1 10000001 01110000000000000000000
```

- Nel convertitore, quando la base di arrivo è 2 scegli il formato nella tendina **«Scrivi il risultato in»**; quando la base di partenza è 2 scegli **«virgola mobile (IEEE 754)»** nella tendina «Il numero binario è in» e scrivi i 32 o 64 bit.
- Se le cifre non stanno nella mantissa (come per 0,1) questa viene arrotondata al valore più vicino, come prevede lo standard.
- Sono gestiti anche zero, infinito, NaN e i numeri denormalizzati.

**Operazioni in virgola mobile** — per sommare o sottrarre si portano i due numeri allo stesso esponente e si lavora sulle mantisse; per moltiplicare o dividere si moltiplicano o dividono le mantisse e si sommano o sottraggono gli esponenti. In entrambi i casi il risultato va poi normalizzato:

```
1,0111 × 2²  +  1,1 × 2⁰   →   1,0111 × 2²  +  0,011 × 2²   =   1,1101 × 2²
```

## Limiti

- Basi 2, 8, 10 e 16.
- Fino a 64 cifre per numero nel convertitore, 40 nelle operazioni.
- Le espansioni che non terminano vengono troncate a 12 cifre dopo la virgola (4 nell'allenamento).

## Usarlo in locale

Il sito è fatto di tre file statici (`index.html`, `style.css`, `script.js`), senza dipendenze né build. Basta scaricare il repository e aprire `index.html` nel browser.

```bash
git clone https://github.com/Intinirocco/base-converter.git
```

L'interfaccia si adatta a telefono e computer e segue il tema chiaro o scuro del dispositivo.
