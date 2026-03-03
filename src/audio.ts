export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playPopSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

export function playThunderSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 2);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
}

let windGain: GainNode | null = null;
let windFilter: BiquadFilterNode | null = null;
let rainGain: GainNode | null = null;

export function initAmbientSounds() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (windGain) return; // already initialized

    // Wind noise
    const bufferSize = audioCtx.sampleRate * 5; // 5 seconds loop
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const windNoise = audioCtx.createBufferSource();
    windNoise.buffer = buffer;
    windNoise.loop = true;

    windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 400; // Light wind

    windGain = audioCtx.createGain();
    windGain.gain.value = 0.2; // Base volume

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(audioCtx.destination);
    windNoise.start();

    // Rain noise
    const rainBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Very sparse noise for rare drops
        rainData[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) : 0;
    }

    const rainNoise = audioCtx.createBufferSource();
    rainNoise.buffer = rainBuffer;
    rainNoise.loop = true;

    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'lowpass'; // Lowpass for a bass-heavy, muffled sound
    rainFilter.frequency.value = 200;

    rainGain = audioCtx.createGain();
    rainGain.gain.value = 0; // Off by default

    rainNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    rainNoise.start();
}

export function updateWeatherSounds(isRaining: boolean, delta: number) {
    if (!windGain || !windFilter || !rainGain) return;

    const targetWindFreq = 400; // Keep wind frequency constant
    const targetWindVol = isRaining ? 0.5 : 0.2; // Wind becomes louder during rain
    const targetRainVol = isRaining ? 0.8 : 0; // Extremely quiet background rain

    // Smoothly interpolate
    windFilter.frequency.value += (targetWindFreq - windFilter.frequency.value) * delta * 2;
    windGain.gain.value += (targetWindVol - windGain.gain.value) * delta * 2;
    rainGain.gain.value += (targetRainVol - rainGain.gain.value) * delta * 2;
}
