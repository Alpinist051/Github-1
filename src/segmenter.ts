import { FilesetResolver, ImageSegmenter, MPMask } from '@mediapipe/tasks-vision';
import { WebGLRenderer } from './renderer';
import { VideoFilter } from './filter';
import { ProcessVideoTrackOptions } from 'src';
import { Graph } from './graph';

export let options = {} as ProcessVideoTrackOptions;

const MODEL_FALLBACKS = {
    selfieMulticlass:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    selfieSegmenter:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
} as const;

function looksLikeTflite(bytes: Uint8Array) {
    return (
        bytes.length >= 8 &&
        bytes[4] === 0x54 &&
        bytes[5] === 0x46 &&
        bytes[6] === 0x4c &&
        bytes[7] === 0x33
    );
}

async function fetchModelAsset(modelPath: string) {
    const candidates = [modelPath];
    if (modelPath.includes('selfie_segmenter')) {
        candidates.push(MODEL_FALLBACKS.selfieSegmenter);
    } else if (modelPath.includes('selfie_multiclass_256x256')) {
        candidates.push(MODEL_FALLBACKS.selfieMulticlass);
    }

    let lastError: Error | null = null;

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status} ${response.statusText} while fetching ${candidate}`
                );
            }

            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!looksLikeTflite(bytes)) {
                throw new Error(
                    `Response from ${candidate} did not look like a TFLite model (received ${bytes.length} bytes)`
                );
            }

            return bytes;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[virtual-background] Failed to load model asset from ${candidate}`, err);
        }
    }

    throw lastError ?? new Error(`Unable to load model asset from ${modelPath}`);
}

async function createSegmenter(canvas: OffscreenCanvas) {
    const { wasmLoaderPath, wasmBinaryPath, modelPath } = options;
    const fileset =
        wasmLoaderPath && wasmBinaryPath
            ? {
                  wasmLoaderPath,
                  wasmBinaryPath,
              }
            : await FilesetResolver.forVisionTasks(
                  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
              );
    console.log(`[virtual-background] createSegmenter`, { canvas });
    const modelAssetBuffer = await fetchModelAsset(
        modelPath ||
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
    );
    const segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
            modelAssetBuffer,
            delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: true,
        canvas,
    });
    return segmenter;
}

export type SegmenterStats = {
    fps: number;
    delay: number;
};

export async function runSegmenter(
    canvas: OffscreenCanvas,
    readable: ReadableStream,
    opts: ProcessVideoTrackOptions,
    onStats: (stats: SegmenterStats) => void
) {
    console.log(`[virtual-background] runSegmenter`, { canvas, options, readable });
    options = opts;

    let webGLRenderer: WebGLRenderer | null = new WebGLRenderer(canvas);

    function onContextLost(event: Event) {
        console.log(`[virtual-background] webglcontextlost (${!!webGLRenderer})`);
        event.preventDefault();
        if (webGLRenderer) {
            webGLRenderer.close();
            webGLRenderer = null;
        }
    }

    function onContextRestored() {
        console.log(`[virtual-background] webglcontextrestored (${!!webGLRenderer})`);
        if (!webGLRenderer) {
            setTimeout(() => {
                webGLRenderer = new WebGLRenderer(canvas);
                restartSegmenter();
                attachCanvasEvents();
            }, 1000);
        }
    }

    function attachCanvasEvents() {
        canvas.addEventListener('webglcontextlost', onContextLost, { once: true });
        canvas.addEventListener('webglcontextrestored', onContextRestored, { once: true });
    }
    attachCanvasEvents();

    let segmenter = await createSegmenter(canvas);

    function restartSegmenter() {
        createSegmenter(canvas)
            .then((newSegmenter) => {
                const oldSegmenter = segmenter;
                segmenter = newSegmenter;
                oldSegmenter.close();
            })
            .catch((e) => {
                console.error('Error restarting segmenter:', e);
            });
    }

    // Filters.
    const effectsCanvas = new OffscreenCanvas(1, 1);
    const videoFilter = new VideoFilter(effectsCanvas);

    const useSelfieModel = options.modelPath?.includes('selfie_segmenter') ? true : false;
    let lastStatsTime = 0;
    let segmenterDelayTotal = 0;
    let frames = 0;
    let totalFrames = 0;

    function close() {
        segmenter.close();
        webGLRenderer?.close();
        webGLRenderer = null;
        videoFilter?.destroy();
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
    }

    const writer = new WritableStream(
        {
            async write(videoFrame: VideoFrame) {
                const { codedWidth, codedHeight, timestamp } = videoFrame;
                if (!codedWidth || !codedHeight) {
                    videoFrame.close();
                    return;
                }
                const start = performance.now();
                if (options.enabled) {
                    if (options.enableFilters) {
                        videoFilter.render(
                            videoFrame,
                            options.blur,
                            options.brightness,
                            options.contrast,
                            options.gamma
                        );
                    }
                    await new Promise<void>((resolve) => {
                        segmenter.segmentForVideo(
                            options.enableFilters ? effectsCanvas : videoFrame,
                            timestamp * 1000,
                            (result) => {
                                try {
                                    if (
                                        !result.categoryMask ||
                                        !result.confidenceMasks ||
                                        !result.confidenceMasks[0]
                                    ) {
                                        console.warn(
                                            'Skipping frame: Missing masks or WebGL data.'
                                        );
                                        return;
                                    }
                                    const categoryMask = result.categoryMask;
                                    const confidenceMask = result.confidenceMasks[0];
                                    const categoryTextureMP = categoryMask.getAsWebGLTexture();
                                    const confidenceTextureMP = confidenceMask.getAsWebGLTexture();
                                    webGLRenderer?.render(
                                        videoFrame,
                                        options,
                                        categoryTextureMP,
                                        confidenceTextureMP,
                                        useSelfieModel
                                    );
                                    categoryMask.close();
                                    confidenceMask.close();
                                } catch (e) {
                                    console.error('Error in videoCallback:', e);
                                } finally {
                                    resolve();
                                }
                            }
                        );
                    });
                } else {
                    webGLRenderer?.render(videoFrame, options);
                }
                videoFrame.close();

                // Stats report.
                const now = performance.now();
                segmenterDelayTotal += now - start;
                frames++;
                totalFrames++;
                if (now - lastStatsTime > 2000) {
                    const delay = segmenterDelayTotal / frames;
                    const fps = (1000 * frames) / (now - lastStatsTime);
                    onStats({ delay, fps });
                    lastStatsTime = now;
                    segmenterDelayTotal = 0;
                    frames = 0;
                }

                // Restart segmenter to avoid memory leaks.
                if (options.restartEvery && totalFrames % options.restartEvery === 0) {
                    restartSegmenter();
                }
            },
            close() {
                console.log('[virtual-background] runSegmenter close');
                close();
            },
            abort(reason) {
                console.log('[virtual-background] runSegmenter abort', reason);
                close();
            },
        },
        new CountQueuingStrategy({ highWaterMark: 1 })
    );

    readable.pipeTo(writer).catch((err: unknown) => {
        console.error(`[virtual-background] video error: ${(err as Error).message}`);
    });
}
