<template>
    <div class="app-shell">
        <header class="hero">
            <div class="hero-copy">
                <p class="eyebrow">Browser video segmentation</p>
                <h1>Virtual Background Demo</h1>
                <p class="hero-text">
                    Choose a camera, swap the scene, and tune the effect stack without leaving
                    the browser.
                </p>
            </div>

            <a
                class="github-link"
                href="https://github.com/vpalmisano/virtual-background"
                target="_blank"
                rel="noopener"
                aria-label="GitHub repository"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                        d="M12 0.5C5.4 0.5 0 5.9 0 12.6c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.3-4-1.3-.6-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 3 1.4 3.7 1.1.1-.8.4-1.4.7-1.8-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.2 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 3 .1 3.3.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9.4.4.8 1.1.8 2.1v3.1c0 .4.2.7.8.6 4.8-1.6 8.2-6.1 8.2-11.4C24 5.9 18.6.5 12 .5z"
                    />
                </svg>
                <span>Source</span>
            </a>
        </header>

        <main class="layout">
            <section class="panel preview-panel">
                <div class="panel-head">
                    <div>
                        <p class="panel-label">Preview</p>
                        <h2>Processed camera feed</h2>
                    </div>

                    <div class="status-row">
                        <span class="pill" :class="streaming ? 'pill--live' : 'pill--idle'">
                            {{ streaming ? 'Live' : 'Idle' }}
                        </span>
                        <span class="pill">{{ runWorker ? 'Worker' : 'Main thread' }}</span>
                        <span class="pill">
                            {{ enabled ? 'Virtual bg on' : 'Virtual bg off' }}
                        </span>
                    </div>
                </div>

                <div class="frame" :aria-busy="progress ? 'true' : 'false'">
                    <div v-if="progress" class="frame-overlay" role="status" aria-live="polite">
                        <div class="loading-bar" />
                        <span>Starting stream...</span>
                    </div>
                    <video
                        id="video"
                        ref="videoPlayer"
                        muted
                        playsinline
                        autoplay
                    />
                </div>

                <p class="helper-text">
                    The controls on the right mirror <code>VirtualBackground.options</code> and
                    update in real time.
                </p>
            </section>

            <aside class="panel controls-panel">
                <section class="section">
                    <div class="section-head">
                        <p class="panel-label">Source</p>
                        <h2>Capture setup</h2>
                    </div>

                    <label class="field">
                        <span>Webcam</span>
                        <select v-model="selectedWebcam">
                            <option value="">Select a webcam</option>
                            <option
                                v-for="webcam in webcams"
                                :key="webcam.value"
                                :value="webcam.value"
                            >
                                {{ webcam.title }}
                            </option>
                        </select>
                    </label>

                    <label class="field">
                        <span>Model</span>
                        <select v-model="modelPath">
                            <option
                                v-for="option in modelOptions"
                                :key="option.value"
                                :value="option.value"
                            >
                                {{ option.title }}
                            </option>
                        </select>
                    </label>

                    <div class="field-grid">
                        <label class="field">
                            <span>Width</span>
                            <input
                                v-model.number="webcamWidth"
                                type="number"
                                min="160"
                                max="1920"
                                step="1"
                            />
                        </label>

                        <label class="field">
                            <span>Height</span>
                            <input
                                v-model.number="webcamHeight"
                                type="number"
                                min="120"
                                max="1080"
                                step="1"
                            />
                        </label>
                    </div>
                </section>

                <section class="section">
                    <div class="button-row">
                        <button class="btn btn-primary" type="button" @click="toggleStream">
                            {{ streaming ? 'Stop stream' : 'Start stream' }}
                        </button>
                        <button class="btn btn-secondary" type="button" @click="bgUpload">
                            Change background
                        </button>
                    </div>

                    <div class="switch-grid">
                        <label class="toggle">
                            <input v-model="runWorker" type="checkbox" />
                            <span>Run in web worker</span>
                        </label>

                        <label class="toggle">
                            <input v-model="enabled" type="checkbox" />
                            <span>Enable virtual background</span>
                        </label>

                        <label class="toggle">
                            <input v-model="showStats" type="checkbox" />
                            <span>Show stats</span>
                        </label>
                    </div>
                </section>

                <section class="section">
                    <div class="section-head">
                        <p class="panel-label">Effects</p>
                        <h2>Tune the pipeline</h2>
                    </div>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Smoothing Factor</span>
                            <output>{{ smoothing.toFixed(2) }}</output>
                        </div>
                        <input
                            v-model.number="smoothing"
                            type="range"
                            min="0.01"
                            max="1.0"
                            step="0.01"
                        />
                    </label>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Smoothstep Min</span>
                            <output>{{ smoothstepMin.toFixed(2) }}</output>
                        </div>
                        <input
                            v-model.number="smoothstepMin"
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.01"
                        />
                    </label>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Smoothstep Max</span>
                            <output>{{ smoothstepMax.toFixed(2) }}</output>
                        </div>
                        <input
                            v-model.number="smoothstepMax"
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.01"
                        />
                    </label>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Smooth Borders</span>
                            <output>{{ borderSmooth.toFixed(0) }}</output>
                        </div>
                        <input
                            v-model.number="borderSmooth"
                            type="range"
                            min="0.0"
                            max="100.0"
                            step="1.0"
                        />
                    </label>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Background Blur</span>
                            <output>{{ bgBlur.toFixed(0) }}</output>
                        </div>
                        <input v-model.number="bgBlur" type="range" min="0.0" max="100.0" step="1" />
                    </label>

                    <label class="range-field">
                        <div class="range-head">
                            <span>Blur Radius</span>
                            <output>{{ bgBlurRadius.toFixed(0) }}</output>
                        </div>
                        <input
                            v-model.number="bgBlurRadius"
                            type="range"
                            min="0.0"
                            max="100.0"
                            step="1"
                        />
                    </label>

                    <div class="section section--nested">
                        <label class="toggle toggle--accent">
                            <input v-model="enableFilters" type="checkbox" />
                            <span>Enable preprocessing filters</span>
                        </label>

                        <label class="range-field">
                            <div class="range-head">
                                <span>Contrast</span>
                                <output>{{ contrast.toFixed(1) }}</output>
                            </div>
                            <input
                                v-model.number="contrast"
                                type="range"
                                min="0.1"
                                max="4"
                                step="0.1"
                                :disabled="!enableFilters"
                            />
                        </label>

                        <label class="range-field">
                            <div class="range-head">
                                <span>Brightness</span>
                                <output>{{ brightness.toFixed(2) }}</output>
                            </div>
                            <input
                                v-model.number="brightness"
                                type="range"
                                min="-1"
                                max="1"
                                step="0.01"
                                :disabled="!enableFilters"
                            />
                        </label>

                        <label class="range-field">
                            <div class="range-head">
                                <span>Gamma</span>
                                <output>{{ gamma.toFixed(1) }}</output>
                            </div>
                            <input
                                v-model.number="gamma"
                                type="range"
                                min="0.1"
                                max="20"
                                step="0.1"
                                :disabled="!enableFilters"
                            />
                        </label>

                        <label class="range-field">
                            <div class="range-head">
                                <span>Blur</span>
                                <output>{{ blur.toFixed(0) }}</output>
                            </div>
                            <input
                                v-model.number="blur"
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                :disabled="!enableFilters"
                            />
                        </label>
                    </div>
                </section>
            </aside>
        </main>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

type VirtualBackgroundApi = typeof import('../index');

declare global {
    interface Window {
        VirtualBackground: VirtualBackgroundApi;
    }
}

const VirtualBackground = window.VirtualBackground;

type WebcamOption = {
    title: string;
    value: string;
};

const DEFAULT_MODEL_PATH = 'mediapipe/models/selfie_segmenter.tflite';
const MULTICLASS_MODEL_PATH =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const MODEL_OPTIONS = [
    { title: 'Selfie', value: DEFAULT_MODEL_PATH },
    { title: 'Multiclass', value: MULTICLASS_MODEL_PATH },
];

export default defineComponent({
    name: 'App',
    data() {
        const options = VirtualBackground.options;

        return {
            webcams: [] as WebcamOption[],
            selectedWebcam: '' as string,
            webcamWidth: 1280,
            webcamHeight: 720,
            streaming: false,
            progress: false,
            modelPath: options.modelPath || DEFAULT_MODEL_PATH,
            modelOptions: MODEL_OPTIONS,
            runWorker: options.runWorker,
            enabled: options.enabled,
            showStats: options.showStats,
            enableFilters: options.enableFilters,
            contrast: options.contrast,
            brightness: options.brightness,
            gamma: options.gamma,
            blur: options.blur,
            smoothing: options.smoothing,
            smoothstepMin: options.smoothstepMin,
            smoothstepMax: options.smoothstepMax,
            borderSmooth: options.borderSmooth,
            bgBlur: options.bgBlur,
            bgBlurRadius: options.bgBlurRadius,
        };
    },
    watch: {
        runWorker(newValue: boolean) {
            VirtualBackground.options.runWorker = newValue;
        },
        enabled(newValue: boolean) {
            VirtualBackground.options.enabled = newValue;
        },
        modelPath(newValue: string) {
            VirtualBackground.options.modelPath = newValue;
            if (this.streaming) {
                void this.restartStream();
            }
        },
        showStats(newValue: boolean) {
            VirtualBackground.options.showStats = newValue;
        },
        enableFilters(newValue: boolean) {
            VirtualBackground.options.enableFilters = newValue;
        },
        contrast(newValue: number) {
            VirtualBackground.options.contrast = newValue;
        },
        brightness(newValue: number) {
            VirtualBackground.options.brightness = newValue;
        },
        gamma(newValue: number) {
            VirtualBackground.options.gamma = newValue;
        },
        blur(newValue: number) {
            VirtualBackground.options.blur = newValue;
        },
        smoothing(newValue: number) {
            VirtualBackground.options.smoothing = newValue;
        },
        smoothstepMin(newValue: number) {
            VirtualBackground.options.smoothstepMin = newValue;
        },
        smoothstepMax(newValue: number) {
            VirtualBackground.options.smoothstepMax = newValue;
        },
        borderSmooth(newValue: number) {
            VirtualBackground.options.borderSmooth = newValue;
        },
        bgBlur(newValue: number) {
            VirtualBackground.options.bgBlur = newValue;
        },
        bgBlurRadius(newValue: number) {
            VirtualBackground.options.bgBlurRadius = newValue;
        },
    },
    methods: {
        async initializePage() {
            try {
                const mediaSource = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                mediaSource.getVideoTracks().forEach((track) => track.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();
                this.webcams = devices
                    .filter((device) => device.kind === 'videoinput')
                    .map((device, index) => ({
                        title: device.label || `Camera ${index + 1}`,
                        value: device.deviceId,
                    }));
            } catch (err) {
                console.error('Error initializing page or getting webcams:', err);
            }
        },
        async restartStream() {
            if (!this.streaming) {
                return;
            }

            await this.toggleStream();
            await this.toggleStream();
        },
        async toggleStream() {
            const videoEl = this.$refs.videoPlayer as HTMLVideoElement | undefined;

            if (this.streaming) {
                if (videoEl?.srcObject) {
                    const stream = videoEl.srcObject as MediaStream;
                    stream.getTracks().forEach((track) => track.stop());
                    videoEl.pause();
                    videoEl.srcObject = null;
                }

                this.streaming = false;
                return;
            }

            if (!videoEl) {
                console.error('Video element is not available.');
                return;
            }

            if (!this.selectedWebcam && this.webcams.length > 0) {
                console.warn('No webcam selected, defaulting to first available.');
                this.selectedWebcam = this.webcams[0]?.value ?? '';
                if (!this.selectedWebcam) {
                    alert('No webcam available or selected. Please select a webcam.');
                    return;
                }
            }

            try {
                this.progress = true;

                const streamConstraints: MediaStreamConstraints = {
                    video: {
                        width: { ideal: this.webcamWidth },
                        height: { ideal: this.webcamHeight },
                        frameRate: { ideal: 30 },
                        deviceId: this.selectedWebcam ? { exact: this.selectedWebcam } : undefined,
                    },
                    audio: false,
                };

                const mediaStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
                const videoTrack = mediaStream.getVideoTracks()[0];

                if (!videoTrack) {
                    throw new Error('No video track was returned from the selected webcam.');
                }

                const processedTrack = await VirtualBackground.processVideoTrack(videoTrack, {
                    runWorker: this.runWorker,
                });

                const finalStream = new MediaStream();
                finalStream.addTrack(processedTrack);

                videoEl.srcObject = finalStream;
                await videoEl.play();
                this.streaming = true;
            } catch (err) {
                console.error('Error starting stream:', err);
                alert('Could not start video stream. Check permissions and console.');
                this.streaming = false;
            } finally {
                this.progress = false;
            }
        },
        bgUpload() {
            VirtualBackground.updateBackground();
        },
    },
    mounted() {
        void this.initializePage();
    },
    beforeUnmount() {
        const videoEl = this.$refs.videoPlayer as HTMLVideoElement | undefined;
        if (videoEl?.srcObject) {
            const stream = videoEl.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoEl.srcObject = null;
        }
    },
});
</script>

<style>
:root {
    --surface: rgba(8, 14, 28, 0.78);
    --surface-strong: rgba(12, 20, 38, 0.94);
    --surface-border: rgba(148, 163, 184, 0.18);
    --surface-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
    --accent: #38bdf8;
    --accent-strong: #0ea5e9;
    --accent-soft: rgba(56, 189, 248, 0.12);
    --text-strong: #f8fbff;
    --text-normal: #d8e1ef;
    --text-muted: #8ea0ba;
    --danger: #fb7185;
    --live: #22c55e;
}

html,
body,
#app {
    min-height: 100%;
    margin: 0;
}

body {
    color: #d8e1ef;
    background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(99, 102, 241, 0.18), transparent 26%),
        linear-gradient(180deg, #09111f 0%, #050816 58%, #02040a 100%);
}
</style>

<style scoped>
.app-shell {
    position: relative;
    max-width: 1480px;
    margin: 0 auto;
    padding: 24px;
}

.hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    padding: 24px 26px;
    border: 1px solid var(--surface-border);
    border-radius: 28px;
    background: linear-gradient(135deg, rgba(8, 14, 28, 0.88), rgba(15, 23, 42, 0.62));
    box-shadow: var(--surface-shadow);
    backdrop-filter: blur(18px);
}

.hero-copy {
    max-width: 780px;
}

.eyebrow,
.panel-label {
    margin: 0 0 0.5rem;
    color: var(--accent);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 0.72rem;
    font-weight: 700;
}

h1,
h2 {
    margin: 0;
    color: var(--text-strong);
    line-height: 1.1;
}

h1 {
    font-size: clamp(2rem, 4vw, 3.6rem);
}

h2 {
    font-size: 1.05rem;
    letter-spacing: 0.01em;
}

.hero-text {
    max-width: 68ch;
    margin: 0.85rem 0 0;
    color: var(--text-muted);
    font-size: 0.98rem;
    line-height: 1.65;
}

.github-link {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    color: var(--text-strong);
    text-decoration: none;
    background: rgba(15, 23, 42, 0.6);
    transition:
        transform 180ms ease,
        border-color 180ms ease,
        background-color 180ms ease;
}

.github-link:hover {
    transform: translateY(-1px);
    border-color: rgba(56, 189, 248, 0.6);
    background: rgba(15, 23, 42, 0.82);
}

.github-link svg {
    width: 1.15rem;
    height: 1.15rem;
    fill: currentColor;
    flex: none;
}

.layout {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
    gap: 24px;
}

.panel {
    border: 1px solid var(--surface-border);
    border-radius: 28px;
    background: var(--surface);
    box-shadow: var(--surface-shadow);
    backdrop-filter: blur(18px);
}

.preview-panel {
    padding: 22px;
}

.controls-panel {
    display: grid;
    gap: 18px;
    padding: 22px;
    align-content: start;
}

.panel-head,
.section-head,
.range-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.panel-head {
    margin-bottom: 18px;
}

.status-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.42rem 0.75rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.86);
    border: 1px solid rgba(148, 163, 184, 0.18);
    color: var(--text-muted);
    font-size: 0.78rem;
    line-height: 1;
    white-space: nowrap;
}

.pill--live {
    color: #d1fae5;
    border-color: rgba(34, 197, 94, 0.4);
    background: rgba(16, 185, 129, 0.15);
}

.pill--idle {
    color: #fde68a;
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.12);
}

.frame {
    position: relative;
    min-height: 320px;
    overflow: hidden;
    border-radius: 24px;
    background:
        linear-gradient(135deg, rgba(8, 14, 28, 0.92), rgba(2, 6, 23, 0.98)),
        #02040a;
    border: 1px solid rgba(148, 163, 184, 0.14);
}

.frame-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    gap: 0.75rem;
    background: rgba(2, 6, 23, 0.45);
    color: var(--text-strong);
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    text-align: center;
}

.loading-bar {
    width: min(220px, 60vw);
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.18);
    position: relative;
}

.loading-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    width: 38%;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    animation: loading-sweep 1.1s ease-in-out infinite;
}

video {
    display: block;
    width: 100%;
    min-height: 320px;
    object-fit: contain;
    background: #000;
}

.helper-text {
    margin: 14px 4px 0;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.55;
}

.helper-text code {
    padding: 0.12rem 0.35rem;
    border-radius: 0.35rem;
    background: rgba(15, 23, 42, 0.85);
    color: #c7f0ff;
}

.section {
    padding: 18px;
    border-radius: 22px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: var(--surface-strong);
}

.section--nested {
    margin-top: 16px;
    background: rgba(8, 14, 28, 0.9);
}

.section > * + * {
    margin-top: 14px;
}

.field-grid,
.switch-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.switch-grid {
    grid-template-columns: 1fr;
}

.field {
    display: grid;
    gap: 8px;
}

.field > span,
.range-head span,
.toggle span {
    color: var(--text-normal);
    font-size: 0.92rem;
    line-height: 1.35;
}

.field input,
.field select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.82rem 0.95rem;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(2, 6, 23, 0.76);
    color: var(--text-strong);
    outline: none;
    transition:
        border-color 180ms ease,
        box-shadow 180ms ease,
        background-color 180ms ease;
}

.field input:focus,
.field select:focus {
    border-color: rgba(56, 189, 248, 0.75);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
}

.button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.btn {
    appearance: none;
    border: 0;
    border-radius: 14px;
    padding: 0.95rem 1.1rem;
    color: var(--text-strong);
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        background-color 180ms ease;
}

.btn:hover {
    transform: translateY(-1px);
}

.btn:active {
    transform: translateY(0);
}

.btn-primary {
    background: linear-gradient(135deg, var(--accent-strong), #2563eb);
    box-shadow: 0 16px 40px rgba(14, 165, 233, 0.24);
}

.btn-secondary {
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.18);
}

.toggle {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.78rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(2, 6, 23, 0.42);
}

.toggle input {
    accent-color: var(--accent);
}

.toggle--accent {
    border-color: rgba(56, 189, 248, 0.24);
    background: rgba(8, 14, 28, 0.7);
}

.range-field {
    display: grid;
    gap: 0.7rem;
    margin-top: 12px;
}

.range-head {
    align-items: baseline;
}

.range-head output {
    color: var(--text-strong);
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
}

input[type='range'] {
    width: 100%;
    margin: 0;
    appearance: none;
    height: 8px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.18);
    outline: none;
    accent-color: var(--accent);
}

input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 3px solid rgba(8, 14, 28, 0.95);
    border-radius: 50%;
    background: var(--text-strong);
    box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.16);
}

input[type='range']::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border: 3px solid rgba(8, 14, 28, 0.95);
    border-radius: 50%;
    background: var(--text-strong);
    box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.16);
}

input[type='range']:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@keyframes loading-sweep {
    0% {
        transform: translateX(-120%);
    }
    100% {
        transform: translateX(320%);
    }
}

@media (max-width: 1160px) {
    .layout {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 720px) {
    .app-shell {
        padding: 16px;
    }

    .hero,
    .preview-panel,
    .controls-panel {
        padding: 18px;
    }

    .hero {
        flex-direction: column;
    }

    .panel-head,
    .section-head {
        align-items: flex-start;
        flex-direction: column;
    }

    .field-grid {
        grid-template-columns: 1fr;
    }

    .status-row {
        justify-content: flex-start;
    }
}
</style>
