let beepCtx: AudioContext | null = null;

export function playBeep(frequency = 880, duration = 0.15, volume = 0.25) {
  try {
    if (!beepCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      beepCtx = new Ctx();
    }
    if (beepCtx.state === 'suspended') {
      void beepCtx.resume();
    }
    const oscillator = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    oscillator.connect(gain);
    gain.connect(beepCtx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(volume, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, beepCtx.currentTime + duration);
    oscillator.start(beepCtx.currentTime);
    oscillator.stop(beepCtx.currentTime + duration);
  } catch {
    // AudioContext not available
  }
}
