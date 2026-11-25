# TonalExplorer (TEx) — Documento dei Requisiti degli Esercizi

Versione: 1.0 — 25 Novembre 2026

## Indice

1. [Panoramica](#1-panoramica)
2. [Esercizi disponibili](#2-esercizi-disponibili)
   - 2.1 [Leggi e Suona (read-and-play)](#21-leggi-e-suona-read-and-play)
   - 2.2 [Leggi e Parla (read-and-speak)](#22-leggi-e-parla-read-and-speak)
   - 2.3 [Leggi e Canta (read-and-sing)](#23-leggi-e-canta-read-and-sing)
   - 2.4 [Ascolta e Suona (listen-and-play)](#24-ascolta-e-suona-listen-and-play)
3. [Parametri di configurazione globali](#3-parametri-di-configurazione-globali)
4. [Generazione delle note](#4-generazione-delle-note)
5. [Flusso di sessione comune](#5-flusso-di-sessione-comune)
6. [Valutazione e classificazione errori](#6-valutazione-e-classificazione-errori)
7. [Statistiche di fine sessione](#7-statistiche-di-fine-sessione)

---

## 1. Panoramica

TonalExplorer è un'applicazione per l'addestramento tonale e l'ear training musicale. L'utente sceglie una tonalità (tramite la rotabile del Circolo delle Quinte), configura i parametri di sessione e affronta uno di quattro tipi di esercizio. Ogni esercizio presenta una sequenza di gradi scalari generati casualmente; l'utente deve rispondere — suonando, parlando o cantando — la nota corretta corrispondente al grado nella tonalità scelta.

Il sistema utilizza un algoritmo basato sulla **Linea delle Quinte** per determinare la grammatica corretta dei nomi delle note, incluse le alterazioni enarmoniche e i doppi diesis/bemolli.

### Requisiti di sistema

- Browser moderno con supporto Web Audio API
- Per "Leggi e Suona" e "Ascolta e Suona": dispositivo MIDI collegato (tastiera/controller)
- Per "Leggi e Parla": browser Chrome o Edge con permesso microfono (Web Speech API)
- Per "Leggi e Canta": microfono funzionante
- Connessione a Supabase per il salvataggio delle sessioni e autenticazione

---

## 2. Esercizi disponibili

L'app offre **4 tipi di esercizio**, selezionabili dalla pagina delle impostazioni.

### 2.1 Leggi e Suona (read-and-play)

**Identificatore interno:** `read-and-play`

**Obiettivo:** L'app mostra un grado scalare (es. `b3`, `^#4`). L'utente deve suonare sulla tastiera MIDI la nota corrispondente a quel grado nella tonalità del drone.

| Aspetto | Descrizione |
|---|---|
| **Input** | Tastiera MIDI collegata |
| **Display** | Grado mostrato in grande al centro dello schermo |
| **Risposta attesa** | Nota suonata via MIDI (pitch class + ottava) |
| **Modalità audio** | Richiede `audioMode = midi` per funzionare |

**Regole specifiche:**

- Se `ignoreStepDuration` è **false**: l'app suona la nota attesa come riferimento nell'ultimo secondo del conto alla rovescia.
- Se `ignoreStepDuration` è **true** (predefinito): nessun riferimento suona; l'utente suona quando pronto, senza limite di tempo.
- Risposta errata: il grado **non avanza**, resta visualizzato finché l'utente non lo suona correttamente.
- Risposta corretta: flash verde, avanzamento dopo `noteTransitionDelay`.

**Criterio di correttezza:** La pitch class deve corrispondere. L'ottava è verificata solo se `ignoreOctaves = false`.

---

### 2.2 Leggi e Parla (read-and-speak)

**Identificatore interno:** `read-and-speak`

**Obiettivo:** L'app mostra un grado scalare. L'utente deve **dire ad alta voce** il nome italiano della nota corrispondente (es. "Mi bemolle", "Do diesis"). Il riconoscimento vocale verifica la risposta tenendo conto delle **diteggiature enarmoniche corrette** per la tonalità.

| Aspetto | Descrizione |
|---|---|
| **Input** | Microfono (Web Speech API — Chrome/Edge) + fallback con pulsanti on-screen |
| **Display** | Grado mostrato in grande; indicatore microfono e testo riconosciuto; griglia di 12 pulsanti con nomi note italiani come fallback |
| **Risposta attesa** | Nome italiano della nota (es. "Mib" in Lab maggiore per il grado b3) |
| **Ottava** | Irrilevante (il nome parlato non contiene ottava) |

**Regole specifiche:**

- **Spellatura enarmonica obbligatoria:** la risposta deve usare l'alterazione corretta per la tonalità. Ad esempio in Re bemolle maggiore, il grado `b3` è "Mib" (non "Mi").
- **Risultati interim vs finali:** una risposta corretta è accettata anche da trascrizioni interim (non finali). Una risposta errata è conteggiata solo su risultati finali, per evitare falsi negativi dovuti a trascrizioni parziali errate.
- **Riconoscimento continuo:** il motore di riconoscimento vocale resta attivo durante tutta la sessione senza reset tra le note, per non perdere sillabe brevi.

**Parametri esclusivi:**

| Parametro | Descrizione |
|---|---|
| `voiceAnnounceDegree` | Una voce sintetica pronuncia il grado ad alta voce a ogni nuova nota (per esercizio senza guardare lo schermo; si raccomandano le cuffie) |
| `debugMode` | Mostra sotto il grado le forme parlate attese (es. "mib", "mi bemolle") come aiuto visivo |

**Fallback manuale:** Se il microfono non funziona o riconosce male, l'utente può toccare i pulsanti con i nomi delle note italiani (naturali, diesis e bemolli stilizzati diversamente).

---

### 2.3 Leggi e Canta (read-and-sing)

**Identificatore interno:** `read-and-sing`

**Obiettivo:** Come "Leggi e Suona", ma invece di suonare una tastiera MIDI, l'utente **canta** la nota nel microfono. L'app rileva la frequenza della voce e verifica la corrispondenza con la nota attesa.

| Aspetto | Descrizione |
|---|---|
| **Input** | Microfono (PitchDetector — rilevamento frequenza in tempo reale) |
| **Display** | Grado mostrato in grande; stato microfono; nota rilevata (es. "F#4"); visualizzatore PitchTuner; barra di mantenimento che si riempie mentre la nota corretta è tenuta stabile |
| **Risposta attesa** | Pitch class + ottava (se `ignoreOctaves = false`) |
| **Tempo di reazione** | Registrato come `max(0, tempoGrezzo − singHoldDuration)` per escludere il tempo di mantenimento |

**Regole specifiche:**

- **Mantenimento obbligatorio:** la nota corretta deve essere **tenuta stabile** per una durata configurabile (`singHoldDuration`, predefinito 1500 ms) prima di essere accettata. Questo previene falsi positivi da passaggi rapidi.
- La barra di mantenimento si riempie progressivamente; al 100% diventa verde e la risposta è accettata.
- Se il pitch cambia o diventa instabile, la barra si **azzera**.
- Se `ignoreStepDuration` è false: l'app suona la nota attesa come riferimento nell'ultimo secondo del conto alla rovescia.

**Parametro esclusivo:**

| Parametro | Range | Predefinito | Descrizione |
|---|---|---|---|
| `singHoldDuration` | 500–3000 ms (step 100) | 1500 ms | Durata di mantenimento della nota corretta per validarla. Valori bassi = più reattivo ma più falsi positivi; valori alti = più affidabile |

---

### 2.4 Ascolta e Suona (listen-and-play)

**Identificatore interno:** `listen-and-play`

**Obiettivo:** Esercizio avanzato di **ear training**. L'app suona un drone e una nota corrispondente a un certo grado. Il grado **non è mostrato** a schermo (compare un `?`). L'utente deve **identificare aurally** il grado e suonare la nota corrispondente sulla tastiera MIDI.

| Aspetto | Descrizione |
|---|---|
| **Input** | Tastiera MIDI collegata |
| **Display** | `?` al posto del grado |
| **Risposta attesa** | Nota suonata via MIDI (pitch class + ottava) |
| **Modalità audio** | Richiede `audioMode = midi` |

**Regole specifiche:**

- **Riproduzione della nota di riferimento:** l'app suona la nota attesa per 500 ms all'inizio di ogni passo.
  - Se `ignoreStepDuration` è true: suona non appena la nota è pronta; il tempo di reazione parte 550 ms dopo (al termine del suono).
  - Se il timer è attivo: suona quando il conto alla rovescia inizia il primo tick.
- **Ripetizione su errore:** dopo un errore, trascorsa la `noteTransitionDelay`, l'app **risuona la nota** in modo che l'utente possa riascoltarla e ritentare. Questo comportamento è **esclusivo** di questo esercizio.
- Il tempo di reazione è misurato dal **termine della riproduzione** del riferimento, non dall'apparizione del `?`.

---

## 3. Parametri di configurazione globali

Questi parametri sono condivisi da tutti gli esercizi e configurabili dalla pagina Impostazioni (persistenti in `localStorage` con chiave `mzt-settings`).

### 3.1 Parametri di sessione

| Parametro | Range / Valori | Predefinito | Descrizione |
|---|---|---|---|
| `numNotes` | 5–50 (step 5) | 10 | Numero di note nella sessione (lunghezza) |
| `tonic` | 16 tonalità (circolo delle quinte) | C | Tonalità del drone / riferimento |
| `stepDuration` | 1–10 secondi | 3 | Durata del conto alla rovescia per nota |
| `ignoreStepDuration` | booleano | **true** | Se true, nessun timeout — l'app attende indefinitamente la risposta |
| `noteTransitionDelay` | 0–1000 ms (step 50) | 500 | Pausa tra una nota e la successiva dopo una risposta corretta o timeout |
| `singHoldDuration` | 500–3000 ms (step 100) | 1500 | (Solo modo Canta) Durata di mantenimento della nota per validarla |

### 3.2 Parametri armonici

| Parametro | Range / Valori | Predefinito | Descrizione |
|---|---|---|---|
| `ignoreOctaves` | booleano | **true** | Accetta la pitch class corretta in qualsiasi ottava |
| `tonalRetention` | booleano | **true** | Se true, il drone suona per tutta la sessione; se false, si ferma dopo l'introduzione |
| `tonalRetentionDuration` | 1–10 secondi | 3 | Durata del conto alla rovescia dell'introduzione del drone |

### 3.3 Parametri di visualizzazione gradi

| Parametro | Valori | Predefinito | Descrizione |
|---|---|---|---|
| `degreeNotation` | `classic` \| `jazz` | classic | Stile di visualizzazione: classica (1–7 con barra sopra/sotto) o jazz (9, 11, 13 per ottava superiore) |
| `degreeSet` | `normal` \| `advanced` | normal | Insieme dei gradi: normale (12 gradi) o avanzato (19 gradi con varianti enarmoniche) |

### 3.4 Insiemi di gradi

**Insieme normale (12 gradi):**

```
1, b2, 2, b3, 3, 4, #4, 5, b6, 6, b7, 7
```

**Insieme avanzato (19 gradi):**

```
1, #1, b2, 2, #2, b3, 3, b4, 4, #3, #4, b5, 5, #5, b6, 6, #6, b7, 7
```

L'insieme avanzato aggiunge varianti enarmoniche (es. `#1`, `#2`, `b4`, `#3`, `b5`, `#5`, `#6`).

### 3.5 Parametri audio

| Parametro | Valori | Predefinito | Descrizione |
|---|---|---|---|
| `audioMode` | `web-audio` \| `midi` \| `soundfont` | web-audio (auto→midi se dispositivo MIDI presente) | Motore audio per drone e note di riferimento |
| Dispositivo MIDI di output | lista disponibili | primo disponibile | Sintetizzatore che produce drone e note di riferimento |
| Dispositivo MIDI di input | lista / Auto | Auto | Tastiera suonata per rispondere (read-and-play / listen-and-play) |
| `monotimbral` | booleano | false | Usa un solo programma per drone e note (es. AKAI MPK Mini Play) |
| Programma nota (MIDI) | categorie GM | Piano / programma 0 | Strumento per le note (MIDI) |
| Programma drone (MIDI) | categorie GM | Strings / programma 48 | Strumento per il drone (MIDI, nascosto se monotimbral) |
| Strumento nota (soundfont) | categorie | `acoustic_grand_piano` | Strumento per le note (soundfont) |
| Strumento drone (soundfont) | categorie | `string_ensemble_1` | Strumento per il drone (soundfont) |

### 3.6 Parametri speciali

| Parametro | Valori | Predefinito | Descrizione |
|---|---|---|---|
| `debugMode` | booleano | false | Mostra la risposta attesa sotto il grado (solo modo Parla) |
| `voiceAnnounceDegree` | booleano | false | Una voce pronuncia il grado ad alta voce a ogni nota (solo modo Parla) |
| Tema | chiaro / scuro / auto | auto | Tema dell'interfaccia |

---

## 4. Generazione delle note

La generazione delle note è **identica per tutti gli esercizi** ed è gestita da `src/utils/noteGenerator.ts`.

### Algoritmo

- `generateNoteSequence(count, degreeSet)` produce `count` note **indipendenti e casuali**.
- Non c'è logica sequenziale, evitamento di ripetizioni, o pattern ascendenti/discendenti: ogni nota è estratta uniformemente a caso.
- Ogni nota riceve anche un'**estensione di ottava casuale** tra `_` (ottava inferiore), `` (ottava centrale) e `^` (ottava superiore), quindi le note coprono **3 ottave** (ottave 3, 4, 5).

### Conversione grado → nota

`convertScaleDegreeToNote(scaleDegree, tonic)` in `src/utils/noteConverter.ts`:

- Prefisso `_` → ottava −1 (ottava 3)
- Nessun prefisso → ottava 4
- Prefisso `^` → ottava +1 (ottava 5)
- Mappa il grado in semitoni dalla tonica, aggiunge i semitoni della tonica, avvolge mod 12, produce `{ note, octave }` con ottava base 4.
- I nomi delle note sono generati tramite l'algoritmo della **Linea delle Quinte** che produce la grammatica corretta incluse alterazioni doppie.

---

## 5. Flusso di sessione comune

1. **Avvio:** L'utente seleziona l'esercizio e preme "Avvia". L'app genera la sequenza di note, inserisce una riga nella tabella `sessions` di Supabase, inizializza l'`AudioManager`, suona il drone sulla tonica scelta e passa allo stato `session`. Viene acquisito un wake-lock dello schermo.

2. **Introduzione del drone:** `SessionDisplay` mostra un conto alla rovescia di `tonalRetentionDuration` secondi ("Ascolta il drone — le note inizieranno tra Ns"). Al termine:
   - Se `tonalRetention = true`: il drone continua a suonare per tutta la sessione.
   - Se `tonalRetention = false`: il drone si ferma.

3. **Presentazione delle note:** Le note sono presentate una alla volta. L'utente risponde in base alla modalità:
   - **Risposta corretta:** flash verde, avanzamento dopo `noteTransitionDelay`.
   - **Risposta errata:** flash rosso, la **stessa nota resta** (non si avanza) finché non viene risposta correttamente. Un tooltip "Concentrati, non correre" spiega questo comportamento.
   - **Timeout** (solo se `ignoreStepDuration = false`): conteggiato come errore, suona un beep a 440 Hz, e l'app avanza.

4. **Completamento:** Dopo l'ultima nota, `onComplete` viene invocato:
   - La riga della sessione in Supabase viene marcata come completata.
   - Ogni risultato di nota viene inserito nella tabella `session_notes`.
   - Il drone si ferma.
   - Viene mostrata la schermata di completamento con il pulsante "Avvia nuova sessione" (in cima, prima delle statistiche) seguito da tutte le statistiche.

---

## 6. Valutazione e classificazione errori

### Correttezza

| Modalità | Criterio |
|---|---|
| read-and-play | `areNotesEqual(playedNote, expectedNote, ignoreOctaves)` |
| read-and-sing | Stesso criterio; pitch class sempre richiesta, ottava solo se `ignoreOctaves = false` |
| read-and-speak | `spokenNote === expectedItalian` (nome italiano della nota, senza ottava) |
| listen-and-play | Stesso criterio di read-and-play |

### Classificazione degli errori

Una risposta errata è classificata tramite `classifyError` (`src/utils/noteComparison.ts`):

- **Errore di grado:** la pitch class è sbagliata (es. si è suonato Re invece di Mib).
- **Errore di ottava:** la pitch class è corretta ma l'ottava è sbagliata (conteggiato solo se `ignoreOctaves = false`).

### Tempo di reazione

- Il tempo di reazione è registrato **solo per le risposte corrette al primo tentativo** (nessun errore precedente su quella nota).
- Per il modo Canta, il tempo registrato è `max(0, tempoGrezzo − singHoldDuration)` per escludere il tempo di mantenimento.
- Per il modo Ascolta e Suona, il tempo è misurato dal **termine della riproduzione** della nota di riferimento.

---

## 7. Statistiche di fine sessione

La schermata di completamento mostra, nell'ordine:

1. **Pulsante "Avvia nuova sessione"** (in cima, prima delle statistiche)
2. **Punteggio sintetico:** corrette/totali con percentuale, e conteggio errori suddivisi per tipo (grado vs ottava)
3. **Serie di successi/insuccessi:** massimo e minimo streak di risposte corrette e errate consecutive
4. **Tempo di reazione:** media, moda, minimo, massimo (solo sulle risposte corrette al primo tentativo)
5. **Matrice di confusione:** tabella che mostra quali note sono state confuse con quali
6. **Grafico errori sulla Linea delle Quinte:** distribuzione degli errori lungo il circolo delle quinte
7. **Grafico errori di ottava:** distribuzione degli errori di ottava
8. **Grafico tempi di risposta (corrette):** tempi di reazione per ogni nota risposta correttamente
9. **Grafico tempi di risposta (errate):** tempi di reazione per ogni nota risposta erroneamente
10. **Tabella dettagli errori** (opzionale, attivabile con `showLegacyErrorTable` in localStorage): log completo con drone, grado, nota attesa, nota suonata/cantata

Ogni sessione completata viene salvata in Supabase nelle tabelle `sessions` (dati generali) e `session_notes` (risultati per ogni singola nota), collegata all'utente autenticato.

---

*Documento generato per TonalExplorer (TEx) — versione app 1.6.0*
