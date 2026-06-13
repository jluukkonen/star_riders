import * as THREE from 'three';

export class RetroMusicSynth {
    private ctx: AudioContext;
    private dest: AudioNode;
    private isActive: boolean = false;
    private timerId?: any;
    private nextNoteTime: number = 0;
    private currentStep: number = 0;
    private bpm: number = 118;
    private stepDuration: number = 0.127; // 16th note at 118 BPM is ~ 127ms

    // Audio effects nodes
    private delayNode!: DelayNode;
    private delayFeedback!: GainNode;
    private noiseBuffer!: AudioBuffer;

    constructor(ctx: AudioContext, dest: AudioNode) {
        this.ctx = ctx;
        this.dest = dest;

        // Initialize delays/filters for spacious chiptune echoes
        try {
            this.delayNode = this.ctx.createDelay(1.0);
            this.delayNode.delayTime.value = 0.25; // quarter-note echo
            
            this.delayFeedback = this.ctx.createGain();
            this.delayFeedback.gain.value = 0.35; // feedback volume
            
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            
            // Connect delays back to main analyser destination
            this.delayNode.connect(this.dest);
            
            // Pre-bake simple white noise buffer for chiptune high-hats
            const noiseLength = this.ctx.sampleRate * 0.04; // 40ms sound burst
            this.noiseBuffer = this.ctx.createBuffer(1, noiseLength, this.ctx.sampleRate);
            const channelData = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseLength; i++) {
                channelData[i] = Math.random() * 2.0 - 1.0;
            }
        } catch (e) {
            console.warn("Failed to initialize Web Audio effects in RetroMusicSynth:", e);
        }
    }

    public start() {
        if (this.isActive) return;
        this.isActive = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.scheduler();
    }

    public stop() {
        this.isActive = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }
    }

    private advanceNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.stepDuration = secondsPerBeat / 4.0; // 16th note steps (4 per beat)
        this.nextNoteTime += this.stepDuration;
        
        this.currentStep = (this.currentStep + 1) % 16; // 16-step looping sequence
    }

    private scheduler() {
        if (!this.isActive) return;

        // Schedule notes while the next note time is within the look-ahead window
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.advanceNote();
        }

        // Poll frequently
        this.timerId = setTimeout(() => this.scheduler(), 25);
    }

    private midiToFreq(midiNote: number): number {
        return 440.0 * Math.pow(2.0, (midiNote - 69.0) / 12.0);
    }

    private scheduleNote(step: number, time: number) {
        // Melodic synth coordinates - chord progression in A minor loop:
        // Steps 0-3: Am, Steps 4-7: F, Steps 8-11: G, Steps 12-15: E/Em
        const bassNotesRange = [
            // Am
            33, 45, 33, 40,
            // F
            29, 41, 29, 36,
            // G
            31, 43, 31, 38,
            // E
            28, 40, 31, 43
        ];
        
        const leadSequence = [
            57, 60, 64, 67, // Steps 0-3 (Am arpeggio)
            53, 57, 60, 65, // Steps 4-7 (F args)
            55, 59, 62, 67, // Steps 8-11 (G arks)
            52, 56, 59, 64  // Steps 12-15 (E maj slides)
        ];

        // 1. Play Driving Retro Bass Synth
        const bassMidi = bassNotesRange[step];
        const bassFreq = this.midiToFreq(bassMidi);
        
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();

        // Fat dual sawtooth representation
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(bassFreq, time);
        
        // Pluck filter envelope
        bassFilter.type = "lowpass";
        bassFilter.frequency.setValueAtTime(800.0, time);
        bassFilter.frequency.exponentialRampToValueAtTime(140.0, time + 0.18);

        // Volume Envelope
        bassGain.gain.setValueAtTime(0.001, time);
        bassGain.gain.linearRampToValueAtTime(0.18, time + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        // Routing
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.dest); // Directly to analyser/out

        bassOsc.start(time);
        bassOsc.stop(time + 0.25);

        // 2. Play Retro Echo Lead line (Every other step for bouncing rhythm)
        if (step % 2 === 0) {
            const leadMidi = leadSequence[step];
            const leadFreq = this.midiToFreq(leadMidi);

            const leadOsc = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();

            // Sassy square wave
            leadOsc.type = "square";
            leadOsc.frequency.setValueAtTime(leadFreq, time);
            
            // Add subtle analog vibrato (slight frequency sweeping)
            const vibMod = this.ctx.createOscillator();
            const vibGain = this.ctx.createGain();
            vibMod.frequency.value = 6.0; // 6Hz vibrato
            vibGain.gain.value = 1.8; // vibrato range
            vibMod.connect(vibGain);
            vibGain.connect(leadOsc.frequency);
            vibMod.start(time);
            vibMod.stop(time + 0.22);

            // Envelope
            leadGain.gain.setValueAtTime(0.001, time);
            leadGain.gain.linearRampToValueAtTime(0.08, time + 0.01);
            leadGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

            // Routing (connect to destination AND delay line)
            leadOsc.connect(leadGain);
            leadGain.connect(this.dest);
            leadGain.connect(this.delayNode);

            leadOsc.start(time);
            leadOsc.stop(time + 0.22);
        }

        // 3. Play Chiptune hi-hats on off-steps (odd index steps)
        if (step % 2 !== 0 && this.noiseBuffer) {
            const noiseSource = this.ctx.createBufferSource();
            const noiseFilter = this.ctx.createBiquadFilter();
            const noiseGain = this.ctx.createGain();

            noiseSource.buffer = this.noiseBuffer;
            noiseFilter.type = "highpass";
            noiseFilter.frequency.setValueAtTime(8000.0, time); // super clean high end

            noiseGain.gain.setValueAtTime(0.015, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.dest);

            noiseSource.start(time);
            noiseSource.stop(time + 0.04);
        }

        // 4. Play a synthetic Cowbell alert on step 4 & 12
        if ((step === 4 || step === 12)) {
            const bellOsc = this.ctx.createOscillator();
            const bellGain = this.ctx.createGain();
            bellOsc.type = "triangle";
            bellOsc.frequency.setValueAtTime(880.0, time);

            bellGain.gain.setValueAtTime(0.001, time);
            bellGain.gain.linearRampToValueAtTime(0.06, time + 0.01);
            bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

            bellOsc.connect(bellGain);
            bellGain.connect(this.dest);

            bellOsc.start(time);
            bellOsc.stop(time + 0.16);
        }
    }
}
