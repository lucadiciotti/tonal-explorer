import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Check, AlertCircle, Mic, MicOff } from 'lucide-react';
import { Note, SessionMode, SessionStats, ErrorLogEntry, NoteResult } from '../types';
import { AudioManager } from '../lib/audio/AudioManager';
import { convertScaleDegreeToNote } from '../utils/noteConverter';
import { getItalianNoteName, parseSpokenNote, getSpokenForms, getAllItalianNotes } from '../utils/italianNotes';
import { MidiRenderer } from '../lib/audio/MidiRenderer';
import { PitchDetector, PitchData } from '../lib/audio/PitchDetector';
import { SpeechRecognizer } from '../lib/audio/SpeechRecognizer';
import { SpeechSynthesizer, degreeToSpokenText } from '../lib/audio/SpeechSynthesizer';
import { PitchTuner } from './PitchTuner';
import { areNotesEqual } from '../utils/noteComparison';
import { ResultEntry, calculateStreaks } from '../utils/streakCalculator';
import { playBeep } from '../utils/beep';

interface SessionDisplayProps {
  notes: Note[];
  stepDuration: number;
  tonic: string;
  audioManager: AudioManager | null;
  onComplete: (correctCount: number, totalCount: number, stats: SessionStats, errorLog: ErrorLogEntry[], noteResults: NoteResult[]) => void;
  onCancel: () => void;
  ignoreOctaves: boolean;
  ignoreStepDuration: boolean;
  mode: SessionMode;
  singHoldDuration: number;
  noteTransitionDelay: number;
  tonalRetention: boolean;
  tonalRetentionDuration: number;
  debugMode: boolean;
  voiceAnnounceDegree: boolean;
}

export function SessionDisplay({ notes, stepDuration, tonic, audioManager, onComplete, onCancel, ignoreOctaves, ignoreStepDuration, mode, singHoldDuration, noteTransitionDelay, tonalRetention, tonalRetentionDuration, debugMode, voiceAnnounceDegree }: SessionDisplayProps) {
  const [isDroneIntro, setIsDroneIntro] = useState<boolean>(true);
  const [droneIntroTimeLeft, setDroneIntroTimeLeft] = useState<number>(tonalRetentionDuration);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(stepDuration);
  const hasPlayedNoteRef = useRef<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [incorrectCount, setIncorrectCount] = useState<number>(0);
  const [currentNoteStatus, setCurrentNoteStatus] = useState<'waiting' | 'correct' | 'incorrect'>('waiting');
  const noteAnsweredRef = useRef<boolean>(false);
  const [noteAnswered, setNoteAnswered] = useState<boolean>(false);
  const correctCountRef = useRef<number>(0);
  const currentNoteStatusRef = useRef<'waiting' | 'correct' | 'incorrect'>('waiting');
  const isMidiMode = audioManager?.getRenderer() instanceof MidiRenderer;
  const isSingMode = mode === 'read-and-sing';
  const isSpeakMode = mode === 'read-and-speak';
  const isInteractiveMode = isMidiMode || isSingMode || isSpeakMode;
  const pitchDetectorRef = useRef<PitchDetector | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [detectedNoteName, setDetectedNoteName] = useState<string | null>(null);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);
  const [hadMissState, setHadMissState] = useState(false);
  const hasCompletedRef = useRef<boolean>(false);
  const isPlayingNoteRef = useRef<boolean>(false);
  const singHoldNoteRef = useRef<string | null>(null);
  const singHoldOctaveRef = useRef<number | null>(null);
  const singHoldStartRef = useRef<number>(0);
  const hasAdvancedRef = useRef<boolean>(false);
  const resultsRef = useRef<ResultEntry[]>([]);
  const hadMissForCurrentNoteRef = useRef<boolean>(false);
  const noteReadyAtRef = useRef<number>(0);
  const hitReactionTimesRef = useRef<number[]>([]);
  const errorLogRef = useRef<ErrorLogEntry[]>([]);
  const noteResultsRef = useRef<NoteResult[]>([]);
  const lastPlayedNoteRef = useRef<string | null>(null);
  const lastReactionTimeRef = useRef<number | null>(null);
  const firstWrongNoteRef = useRef<string | null>(null);
  const firstWrongReactionTimeRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number>(0);
  const singHoldBarRef = useRef<HTMLDivElement>(null);
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const lastSpokenTextRef = useRef<string>('');
  const [heardText, setHeardText] = useState<string | null>(null);
  const [speechListening, setSpeechListening] = useState(false);
  const synthRef = useRef<SpeechSynthesizer | null>(null);

  const updateHoldBar = (progress: number) => {
    const el = singHoldBarRef.current;
    if (!el) return;
    const pct = Math.min(progress, 1);
    el.style.width = `${pct * 100}%`;
    el.style.backgroundColor = pct >= 1 ? '#22c55e' : '#0ea5e9';
  };

  useEffect(() => {
    console.log('Session restarted - resetting all counters');
    setIsDroneIntro(true);
    setDroneIntroTimeLeft(tonalRetentionDuration);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setIsPlaying(true);
    setTimeLeft(stepDuration);
    setCorrectCount(0);
    setIncorrectCount(0);
    setCurrentNoteStatus('waiting');
    setHadMissState(false);
    hasPlayedNoteRef.current = false;
    noteAnsweredRef.current = false;
    setNoteAnswered(false);
    correctCountRef.current = 0;
    currentNoteStatusRef.current = 'waiting';
    hasCompletedRef.current = false;
    hasAdvancedRef.current = false;
    resultsRef.current = [];
    hadMissForCurrentNoteRef.current = false;
    noteReadyAtRef.current = 0;
    hitReactionTimesRef.current = [];
    singHoldNoteRef.current = null;
    singHoldOctaveRef.current = null;
    singHoldStartRef.current = 0;
    errorLogRef.current = [];
    noteResultsRef.current = [];
    lastPlayedNoteRef.current = null;
    lastReactionTimeRef.current = null;
    firstWrongNoteRef.current = null;
    firstWrongReactionTimeRef.current = null;
  }, [notes, stepDuration]);

  // Drone intro countdown: count down tonalRetentionDuration seconds, then start the exercise.
  // If tonalRetention is true, the drone keeps playing — just end the intro phase.
  // If false, stop the drone when the intro ends.
  useEffect(() => {
    if (!isDroneIntro) return;
    const interval = setInterval(() => {
      setDroneIntroTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!tonalRetention && audioManager) {
            audioManager.stopDrone();
          }
          setIsDroneIntro(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isDroneIntro, tonalRetention, audioManager]);


  const showNextNote = () => {
    setFlashCorrect(false);
    setHadMissState(false);
    hadMissForCurrentNoteRef.current = false;
    noteReadyAtRef.current = 0;
    lastPlayedNoteRef.current = null;
    lastReactionTimeRef.current = null;
    firstWrongNoteRef.current = null;
    firstWrongReactionTimeRef.current = null;
    setCurrentIndex((i) => {
      currentIndexRef.current = i + 1;
      return i + 1;
    });
    hasPlayedNoteRef.current = false;
    noteAnsweredRef.current = false;
    setNoteAnswered(false);
    hasAdvancedRef.current = false;
    lastSpokenTextRef.current = '';
    // Reset the speech recognizer's buffer so the new note starts fresh
    // and old cumulative transcript doesn't leak in.
    // (reset is a no-op now — the engine stays running continuously
    //  to avoid dropping short syllables during restart gaps)
    speechRecognizerRef.current?.reset();
    setCurrentNoteStatus('waiting');
    currentNoteStatusRef.current = 'waiting';
    setTimeLeft(stepDuration);
    setIsTransitioning(false);
    singHoldNoteRef.current = null;
    singHoldOctaveRef.current = null;
    singHoldStartRef.current = 0;
    updateHoldBar(0);
  };

  const advanceToNextNote = (lastPlayedNote?: string | null, lastReactionTime?: number | null) => {
    const isHit = !hadMissForCurrentNoteRef.current;
    resultsRef.current.push(isHit ? 'H' : 'M');

    const idx = currentIndexRef.current;
    const currentNote = notes[idx];
    const recordedPlayedNote = isHit ? (lastPlayedNote ?? null) : (firstWrongNoteRef.current ?? lastPlayedNote ?? null);
    const recordedReactionTime = isHit ? (lastReactionTime ?? null) : (firstWrongReactionTimeRef.current ?? null);
    try {
      const { note: expNote, octave: expOctave } = convertScaleDegreeToNote(currentNote, tonic);
      noteResultsRef.current.push({
        stepIndex: idx,
        degree: currentNote,
        expectedNote: `${expNote}${expOctave}`,
        playedNote: recordedPlayedNote,
        isCorrect: isHit,
        reactionTimeMs: recordedReactionTime,
      });
    } catch {
      noteResultsRef.current.push({
        stepIndex: idx,
        degree: currentNote,
        expectedNote: currentNote,
        playedNote: recordedPlayedNote,
        isCorrect: isHit,
        reactionTimeMs: recordedReactionTime,
      });
    }

    if (currentIndexRef.current < notes.length - 1) {
      if (noteTransitionDelay > 0) {
        setIsTransitioning(true);
        noteAnsweredRef.current = true;
        setNoteAnswered(true);
        setTimeout(showNextNote, noteTransitionDelay);
      } else {
        showNextNote();
      }
    } else {
      setIsPlaying(false);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        const finalCorrect = correctCountRef.current;
        const stats = calculateStreaks(resultsRef.current, hitReactionTimesRef.current);
        onComplete(finalCorrect, notes.length, stats, errorLogRef.current, noteResultsRef.current);
      }
    }
  };

  const handleContinuousSingNote = (note: string | null, octave: number | null) => {
    if (noteAnsweredRef.current) return;
    if (isTransitioning) return;
    if (currentNoteStatusRef.current === 'incorrect') return;

    if (note === null || octave === null) {
      singHoldNoteRef.current = null;
      singHoldOctaveRef.current = null;
      singHoldStartRef.current = 0;
      setDetectedNoteName(null);
      updateHoldBar(0);
      return;
    }

    setDetectedNoteName(`${note}${octave}`);

    if (note === singHoldNoteRef.current && octave === singHoldOctaveRef.current) {
      const elapsed = performance.now() - singHoldStartRef.current;
      updateHoldBar(elapsed / singHoldDuration);
      if (elapsed >= singHoldDuration) {
        handleNoteInput(note, octave);
      }
    } else {
      singHoldNoteRef.current = note;
      singHoldOctaveRef.current = octave;
      singHoldStartRef.current = performance.now();
      updateHoldBar(0);
    }
  };

  const processSpokenNote = (spokenNote: string, isFinal: boolean): boolean => {
    if (noteAnsweredRef.current) return false;
    if (isTransitioning) return false;

    const idx = currentIndexRef.current;
    const currentNote = notes[idx];
    try {
      const expectedItalian = getItalianNoteName(tonic, currentNote);
      const isCorrect = spokenNote === expectedItalian;

      if (isCorrect) {
        // Accept correct answers immediately, even from interim results —
        // there's no benefit to waiting for the final transcript.
        noteAnsweredRef.current = true;
        setNoteAnswered(true);
        if (!hadMissForCurrentNoteRef.current) {
          if (noteReadyAtRef.current > 0) {
            hitReactionTimesRef.current.push(performance.now() - noteReadyAtRef.current);
          }
          setCorrectCount(c => {
            const newCount = c + 1;
            correctCountRef.current = newCount;
            return newCount;
          });
          setFlashCorrect(true);
          setTimeout(() => setFlashCorrect(false), 500);
        }
        setCurrentNoteStatus('correct');
        currentNoteStatusRef.current = 'correct';
        advanceToNextNote(spokenNote, null);
      } else {
        // Only count errors on final results. Interim results are
        // unreliable — the engine often mishears a short syllable
        // before correcting itself in the final transcript. Counting
        // interim misses would penalize correct answers (you say "Do",
        // the interim hears "lo" → false miss, then final hears "do"
        // → correct, but the note is already tainted red).
        if (!isFinal) return true;

        if (spokenNote === lastSpokenTextRef.current) return false;
        lastSpokenTextRef.current = spokenNote;

        if (!hadMissForCurrentNoteRef.current) {
          firstWrongNoteRef.current = spokenNote;
          firstWrongReactionTimeRef.current = noteReadyAtRef.current > 0
            ? performance.now() - noteReadyAtRef.current
            : null;
        }
        hadMissForCurrentNoteRef.current = true;
        setHadMissState(true);
        errorLogRef.current.push({
          stepIndex: idx,
          drone: tonic,
          degree: currentNote,
          expectedNote: expectedItalian,
          sungNote: spokenNote,
        });
        setIncorrectCount(c => c + 1);
        setCurrentNoteStatus('incorrect');
        currentNoteStatusRef.current = 'incorrect';
        setTimeout(() => {
          if (!noteAnsweredRef.current) {
            setCurrentNoteStatus('waiting');
            currentNoteStatusRef.current = 'waiting';
          }
        }, noteTransitionDelay);
      }
    } catch (error) {
      console.error('Failed to check spoken note:', error);
    }
    return true;
  };

  const handleSpokenInput = (text: string, isFinal: boolean): boolean => {
    const spokenNote = parseSpokenNote(text);
    console.debug(`[speech] parsed="${spokenNote}" isFinal=${isFinal} expected="${(() => { try { return getItalianNoteName(tonic, notes[currentIndexRef.current]); } catch { return '?'; } })()}" lastSpoken="${lastSpokenTextRef.current}"`);
    if (!spokenNote) return false;
    return processSpokenNote(spokenNote, isFinal);
  };

  const handleButtonInput = (noteName: string): void => {
    processSpokenNote(noteName, true);
  };

  const handleNoteInput = (playedNote: string, playedOctave: number) => {
    if (noteAnsweredRef.current) return;
    if (isPlayingNoteRef.current) return;
    if (isTransitioning) return;

    const idx = currentIndexRef.current;
    const currentNote = notes[idx];
    try {
      const { note: expectedNote, octave: expectedOctave } = convertScaleDegreeToNote(currentNote, tonic);

      const isCorrect = ignoreOctaves || isSpeakMode
        ? areNotesEqual(playedNote, expectedNote, true)
        : areNotesEqual(playedNote, expectedNote, true) && playedOctave === expectedOctave;

      if (ignoreStepDuration) {
        if (isCorrect) {
          noteAnsweredRef.current = true;
          setNoteAnswered(true);
          let rt: number | null = null;
          if (!hadMissForCurrentNoteRef.current) {
            if (noteReadyAtRef.current > 0) {
              const raw = performance.now() - noteReadyAtRef.current;
              const adjusted = isSingMode ? Math.max(0, raw - singHoldDuration) : raw;
              hitReactionTimesRef.current.push(adjusted);
              rt = adjusted;
            }
            setCorrectCount(c => {
              const newCount = c + 1;
              correctCountRef.current = newCount;
              return newCount;
            });
            setFlashCorrect(true);
            setTimeout(() => setFlashCorrect(false), 500);
          }
          setCurrentNoteStatus('correct');
          currentNoteStatusRef.current = 'correct';
          advanceToNextNote(`${playedNote}${playedOctave}`, rt);
        } else {
          if (!hadMissForCurrentNoteRef.current) {
            firstWrongNoteRef.current = `${playedNote}${playedOctave}`;
            firstWrongReactionTimeRef.current = noteReadyAtRef.current > 0
              ? performance.now() - noteReadyAtRef.current
              : null;
          }
          hadMissForCurrentNoteRef.current = true;
          setHadMissState(true);
          errorLogRef.current.push({
            stepIndex: idx,
            drone: tonic,
            degree: currentNote,
            expectedNote: `${expectedNote}${expectedOctave}`,
            sungNote: `${playedNote}${playedOctave}`,
          });
          setIncorrectCount(c => c + 1);
          setCurrentNoteStatus('incorrect');
          currentNoteStatusRef.current = 'incorrect';
          singHoldNoteRef.current = null;
          singHoldOctaveRef.current = null;
          singHoldStartRef.current = 0;
          updateHoldBar(0);
          setTimeout(() => {
            if (!noteAnsweredRef.current) {
              setCurrentNoteStatus('waiting');
              currentNoteStatusRef.current = 'waiting';
              if (mode === 'listen-and-play' && audioManager) {
                try {
                  const { note: replayNote, octave: replayOctave } = convertScaleDegreeToNote(currentNote, tonic);
                  isPlayingNoteRef.current = true;
                  audioManager.playNote(replayNote, replayOctave, 500);
                  setTimeout(() => {
                    isPlayingNoteRef.current = false;
                  }, 550);
                } catch (error) {
                  console.error('Failed to replay note:', error);
                }
              }
            }
          }, noteTransitionDelay);
        }
      } else {
        if (isCorrect) {
          noteAnsweredRef.current = true;
          setNoteAnswered(true);
          lastPlayedNoteRef.current = `${playedNote}${playedOctave}`;
          if (!hadMissForCurrentNoteRef.current) {
            if (noteReadyAtRef.current > 0) {
              const raw = performance.now() - noteReadyAtRef.current;
              const adjusted = isSingMode ? Math.max(0, raw - singHoldDuration) : raw;
              hitReactionTimesRef.current.push(adjusted);
              lastReactionTimeRef.current = adjusted;
            }
            setCorrectCount(c => {
              const newCount = c + 1;
              correctCountRef.current = newCount;
              return newCount;
            });
            setFlashCorrect(true);
            setTimeout(() => setFlashCorrect(false), 500);
          }
          setCurrentNoteStatus('correct');
          currentNoteStatusRef.current = 'correct';
        } else {
          if (!hadMissForCurrentNoteRef.current) {
            firstWrongNoteRef.current = `${playedNote}${playedOctave}`;
            firstWrongReactionTimeRef.current = noteReadyAtRef.current > 0
              ? performance.now() - noteReadyAtRef.current
              : null;
          }
          hadMissForCurrentNoteRef.current = true;
          setHadMissState(true);
          errorLogRef.current.push({
            stepIndex: idx,
            drone: tonic,
            degree: currentNote,
            expectedNote: `${expectedNote}${expectedOctave}`,
            sungNote: `${playedNote}${playedOctave}`,
          });
          setIncorrectCount(c => c + 1);
          setCurrentNoteStatus('incorrect');
          currentNoteStatusRef.current = 'incorrect';
          singHoldNoteRef.current = null;
          singHoldOctaveRef.current = null;
          singHoldStartRef.current = 0;
          updateHoldBar(0);
          setTimeout(() => {
            if (!noteAnsweredRef.current) {
              setCurrentNoteStatus('waiting');
              currentNoteStatusRef.current = 'waiting';
              hasPlayedNoteRef.current = false;
              hasAdvancedRef.current = false;
              setTimeLeft(stepDuration);
              if (mode === 'listen-and-play' && audioManager) {
                try {
                  const { note: replayNote, octave: replayOctave } = convertScaleDegreeToNote(currentNote, tonic);
                  isPlayingNoteRef.current = true;
                  audioManager.playNote(replayNote, replayOctave, 500);
                  setTimeout(() => {
                    isPlayingNoteRef.current = false;
                  }, 550);
                } catch (error) {
                  console.error('Failed to replay note:', error);
                }
              }
            }
          }, noteTransitionDelay);
        }
      }
    } catch (error) {
      console.error('Failed to check note:', error);
    }
  };

  useEffect(() => {
    if (!audioManager || !isMidiMode) return;
    if (isDroneIntro) return;

    const renderer = audioManager.getRenderer() as MidiRenderer;
    if (!renderer || !('onNoteInput' in renderer)) return;

    const unsubscribe = renderer.onNoteInput(handleNoteInput);
    return () => unsubscribe();
  }, [currentIndex, notes, tonic, audioManager, isMidiMode, ignoreOctaves, ignoreStepDuration, mode, isDroneIntro]);

  useEffect(() => {
    if (!isSingMode) return;
    if (isDroneIntro) return;

    const detector = new PitchDetector();
    pitchDetectorRef.current = detector;

    (async () => {
      try {
        await detector.initialize();
        setMicActive(true);
        const unsubContinuous = detector.onContinuousNote((note, octave) => {
          handleContinuousSingNote(note, octave);
        });
        const unsubPitch = detector.onPitchData((data) => {
          setPitchData(data);
        });
        detector.start();
        return () => {
          unsubContinuous();
          unsubPitch();
        };
      } catch (error) {
        console.error('Failed to initialize microphone:', error);
        setMicActive(false);
      }
    })();

    return () => {
      detector.cleanup();
      pitchDetectorRef.current = null;
      setMicActive(false);
      setDetectedNoteName(null);
      setPitchData(null);
    };
  }, [currentIndex, notes, tonic, isSingMode, ignoreOctaves, ignoreStepDuration, mode, isDroneIntro]);

  useEffect(() => {
    if (!isSpeakMode) return;
    if (isDroneIntro) return;

    if (!SpeechRecognizer.isSupported()) {
      setSpeechSupported(false);
      return;
    }

    const recognizer = new SpeechRecognizer();
    speechRecognizerRef.current = recognizer;

    recognizer.start(
      (text, isFinal) => {
        console.debug(`[speech] delta="${text}" isFinal=${isFinal} noteIdx=${currentIndexRef.current} answered=${noteAnsweredRef.current}`);
        setHeardText(text.trim());
        return handleSpokenInput(text, isFinal);
      },
      (listening) => {
        setSpeechListening(listening);
      },
    );

    // Reset the recognizer's transcript buffer when the note changes
    // so stale words from the previous note don't pollute the new one.

    return () => {
      recognizer.cleanup();
      speechRecognizerRef.current = null;
      setSpeechListening(false);
      setHeardText(null);
    };
  }, [isSpeakMode, isDroneIntro]);

  // Clear dedup guard, heard text, and recognizer buffer when note changes
  useEffect(() => {
    if (!isSpeakMode || isDroneIntro) return;
    lastSpokenTextRef.current = '';
    setHeardText(null);
    speechRecognizerRef.current?.reset();
  }, [currentIndex, isSpeakMode, isDroneIntro]);

  // Voice announcement of the degree when a new note appears
  useEffect(() => {
    if (!isSpeakMode || !voiceAnnounceDegree) return;
    if (isDroneIntro || isTransitioning) return;
    if (!SpeechSynthesizer.isSupported()) return;

    if (!synthRef.current) {
      synthRef.current = new SpeechSynthesizer();
    }
    const degree = notes[currentIndex];
    synthRef.current.speak(degreeToSpokenText(degree));
  }, [currentIndex, isSpeakMode, isDroneIntro, isTransitioning, voiceAnnounceDegree, notes]);

  // Cleanup synthesizer on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cleanup();
      synthRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDroneIntro) return;

    if (ignoreStepDuration) {
      if ((mode === 'read-and-play' || mode === 'read-and-sing' || mode === 'read-and-speak') && noteReadyAtRef.current === 0) {
        noteReadyAtRef.current = performance.now();
      }
      if (mode === 'listen-and-play' && !hasPlayedNoteRef.current && audioManager) {
        hasPlayedNoteRef.current = true;
        const currentNote = notes[currentIndex];
        try {
          const { note, octave } = convertScaleDegreeToNote(currentNote, tonic);
          isPlayingNoteRef.current = true;
          audioManager.playNote(note, octave, 500);
          setTimeout(() => {
            isPlayingNoteRef.current = false;
            noteReadyAtRef.current = performance.now();
          }, 550);
        } catch (error) {
          console.error('Failed to play note:', error);
        }
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === stepDuration && mode === 'read-and-play' && noteReadyAtRef.current === 0) {
          noteReadyAtRef.current = performance.now();
        }
        if (prev === stepDuration && mode === 'listen-and-play' && !hasPlayedNoteRef.current && audioManager) {
          hasPlayedNoteRef.current = true;
          const currentNote = notes[currentIndex];
          try {
            const { note, octave } = convertScaleDegreeToNote(currentNote, tonic);
            isPlayingNoteRef.current = true;
            console.log(`App playing: ${note}${octave}`);
            audioManager.playNote(note, octave, 500);
            setTimeout(() => {
              isPlayingNoteRef.current = false;
              noteReadyAtRef.current = performance.now();
              console.log('App finished playing, accepting input now');
            }, 550);
          } catch (error) {
            console.error('Failed to play note:', error);
          }
        }

        if (prev === 1 && (mode === 'read-and-play' || mode === 'read-and-sing' || mode === 'read-and-speak') && !hasPlayedNoteRef.current && audioManager) {
          hasPlayedNoteRef.current = true;
          const currentNote = notes[currentIndex];
          try {
            const { note, octave } = convertScaleDegreeToNote(currentNote, tonic);
            isPlayingNoteRef.current = true;
            audioManager.playNote(note, octave, 500);
            setTimeout(() => {
              isPlayingNoteRef.current = false;
            }, 550);
          } catch (error) {
            console.error('Failed to play note:', error);
          }
        }

        if (prev === 1 && !hasAdvancedRef.current) {
          hasAdvancedRef.current = true;
          if (!noteAnsweredRef.current && isInteractiveMode) {
            hadMissForCurrentNoteRef.current = true;
            setIncorrectCount(c => c + 1);
            setCurrentNoteStatus('incorrect');
            currentNoteStatusRef.current = 'incorrect';
            playBeep(440, 0.12, 0.2);
          }
          advanceToNextNote(lastPlayedNoteRef.current, lastReactionTimeRef.current);
        }

        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, notes, stepDuration, tonic, audioManager, onComplete, isMidiMode, isInteractiveMode, ignoreStepDuration, mode, isDroneIntro]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const progress = ((currentIndex + 1) / notes.length) * 100;

  const DegreeDisplay = ({ note }: { note: Note }) => {
    let modifier: 'upper' | 'lower' | null = null;
    let display = note;

    if (note.startsWith('_')) {
      modifier = 'lower';
      display = note.slice(1);
    } else if (note.startsWith('^')) {
      modifier = 'upper';
      display = note.slice(1);
    }

    return (
      <span className="inline-flex flex-col items-center">
        <span
          className="h-2 rounded-full transition-opacity bg-slate-800 dark:bg-slate-200"
          style={{
            width: '80%',
            opacity: modifier === 'upper' ? 1 : 0,
          }}
        />
        <span>{display}</span>
        <span
          className="h-2 rounded-full transition-opacity bg-slate-800 dark:bg-slate-200"
          style={{
            width: '80%',
            opacity: modifier === 'lower' ? 1 : 0,
            marginTop: '-0.15em',
          }}
        />
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              className="p-3 bg-slate-800 dark:bg-sky-600 hover:bg-slate-900 dark:hover:bg-sky-500 text-white rounded-lg transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <div className="text-slate-700 dark:text-slate-200">
              <div className="text-sm font-medium">Tonic: {tonic}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Note {currentIndex + 1} of {notes.length}
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-slate-800 dark:bg-sky-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div
          className="text-center py-16 rounded-xl transition-colors duration-300 relative"
          style={{
            backgroundColor: isDroneIntro
              ? 'transparent'
              : flashCorrect
                ? 'rgb(220 252 231)'
                : hadMissState
                  ? 'rgb(254 226 226)'
                  : 'transparent',
          }}
        >
          {isDroneIntro ? (
            <div className="flex flex-col items-center gap-6">
              <div className="text-6xl font-bold text-slate-800 dark:text-slate-100 font-mono">{tonic}</div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Ascolta il drone — le note inizieranno tra</p>
              <div className="text-5xl font-bold text-slate-400 dark:text-slate-500 font-mono">{droneIntroTimeLeft}s</div>
              <div className="w-48">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 dark:bg-sky-600 rounded-full transition-all duration-1000"
                    style={{ width: `${((tonalRetentionDuration - droneIntroTimeLeft) / tonalRetentionDuration) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
          <>
          <div className="relative inline-block">
            <div className="text-9xl font-bold text-slate-800 dark:text-slate-100 mb-4 font-mono tracking-wider leading-none">
              {isTransitioning
                ? <span className="text-slate-300 dark:text-slate-600">---</span>
                : mode === 'read-and-play' || mode === 'read-and-sing' || mode === 'read-and-speak'
                  ? <DegreeDisplay note={notes[currentIndex]} />
                  : <span>?</span>}            </div>
            {isInteractiveMode && currentNoteStatus !== 'waiting' && (
              <div className="absolute right-2 sm:right-0 top-0 sm:top-1/2 sm:-right-16 sm:-translate-y-1/2">
                {currentNoteStatus === 'correct' ? (
                  <Check className="w-12 h-12 text-green-500" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                )}
              </div>
            )}
          </div>
          {debugMode && isSpeakMode && !isTransitioning && (
            <div className="text-sm text-slate-400 dark:text-slate-500 font-mono mt-2">
              {(() => {
                try { return getSpokenForms(getItalianNoteName(tonic, notes[currentIndex])); }
                catch { return '?'; }
              })()}
            </div>
          )}
          {hadMissState && !isTransitioning && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90%] max-w-sm px-4 py-3 bg-slate-800/90 dark:bg-slate-900/90 border border-slate-700 dark:border-slate-700 rounded-lg text-left shadow-lg z-10">
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1">Concentrati, non affrettarti</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                La nota ti verra' riproposta finche' non la indovini. Il tempo di reazione non viene registrato in questa fase: prenditi tutto il tempo che ti serve. Il cervello consolida l'apprendimento solo risolvendo correttamente il problema — premere a caso ostacola la memorizzazione invece di favorirla.
              </p>
            </div>
          )}
          {isSingMode && (
            <>
              <div className="flex items-center justify-center gap-3 mb-3">
                <Mic className={`w-5 h-5 ${micActive ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {micActive
                    ? detectedNoteName
                      ? `Rilevato: ${detectedNoteName}`
                      : 'Microfono attivo - canta una nota'
                    : 'Microfono non disponibile'}
                </span>
              </div>
              {micActive && <PitchTuner pitchData={pitchData} />}
              {micActive && (
                <div className="w-48 mx-auto mt-4 mb-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      ref={singHoldBarRef}
                      className="h-full rounded-full"
                      style={{ width: '0%', backgroundColor: '#0ea5e9' }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          {isSpeakMode && (
            <>
              <div className="flex items-center justify-center gap-3 mb-3">
                {speechSupported ? (
                  <Mic className={`w-5 h-5 ${speechListening ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`} />
                ) : (
                  <MicOff className="w-5 h-5 text-red-400 dark:text-red-500" />
                )}
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {!speechSupported
                    ? 'Riconoscimento vocale non supportato in questo browser'
                    : speechListening
                      ? heardText
                        ? `Ho sentito: "${heardText}"`
                        : "In ascolto — di' il nome della nota"
                      : 'Riavvio del microfono...'}
                </span>
              </div>
            </>
          )}
          {isSpeakMode && !isDroneIntro && !isTransitioning && (
            <div className="max-w-md mx-auto mt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Tocca una nota se il microfono non sente</p>
              <div className="grid grid-cols-3 gap-1.5">
                {getAllItalianNotes().map((noteName) => {
                  const isNatural = !noteName.includes('#') && !noteName.includes('b');
                  const isSharp = noteName.includes('#');
                  return (
                    <button
                      key={noteName}
                      onClick={() => handleButtonInput(noteName)}
                      disabled={noteAnswered}
                      className={`px-1.5 py-2.5 rounded-lg text-sm font-semibold border-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isNatural
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          : isSharp
                            ? 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/40'
                            : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                      }`}
                    >
                      {noteName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="text-2xl text-slate-500 dark:text-slate-400">
            {!isPlaying ? 'Paused' : ignoreStepDuration ? 'In attesa...' : `Next in ${timeLeft}s`}
          </div>
          {isInteractiveMode && (
            <div className="mt-6 flex items-center justify-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{correctCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{incorrectCount}</span>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Notation Guide</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-mono font-semibold">1, 2, 3...</span> - Scale degrees
          </div>
          <div>
            <span className="font-mono font-semibold">b2, #4</span> - Flat, Sharp
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold inline-flex flex-col items-center leading-none">
              <span className="h-0.5 w-4 bg-transparent" />
              <span>3</span>
              <span className="h-0.5 w-4 rounded-full bg-slate-700 dark:bg-slate-300" />
            </span>
            <span>- Lower octave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold inline-flex flex-col items-center leading-none">
              <span className="h-0.5 w-4 rounded-full bg-slate-700 dark:bg-slate-300" />
              <span>#4</span>
              <span className="h-0.5 w-4 bg-transparent" />
            </span>
            <span>- Upper octave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
