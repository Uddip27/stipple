// Encoding transfers each onFrame ImageData buffer; return fresh data for every frame.
(function () {
  'use strict';

  const scriptURL = document.currentScript && document.currentScript.src;
  const workerURL = new URL('vendor/qr-gif-worker.js', scriptURL || document.baseURI).href;
  const MAX_BYTES = 25 * 1024 * 1024;
  const MAX_EDGE = 2048;
  const MAX_FRAMES = 120;
  const MAX_DURATION = 10000;
  const WORKER_TIMEOUT = 30000;

  function abortError() {
    return new DOMException('GIF export cancelled.', 'AbortError');
  }

  function validSize(width, height) {
    return Number.isInteger(width) && Number.isInteger(height) &&
      width > 0 && height > 0 && width <= MAX_EDGE && height <= MAX_EDGE;
  }

  function normalizedDelay(delay) {
    if (delay === undefined || delay === 0) return 100;
    if (!Number.isFinite(delay) || delay < 0 || delay > MAX_DURATION) {
      throw new Error('GIF frame delay must be between 0 and 10000 milliseconds.');
    }
    return Math.max(20, Math.round(delay / 10) * 10);
  }

  function runWorker(initial, transfers, signal, receive) {
    return new Promise(function (resolve, reject) {
      let worker;
      let timer;
      let settled = false;
      const onAbort = function () { finish(abortError()); };

      function finish(error, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (worker) {
          worker.onmessage = worker.onerror = worker.onmessageerror = null;
          worker.terminate();
        }
        if (error) reject(error);
        else resolve(value);
      }

      const job = {
        get done() { return settled; },
        resolve: function (value) { finish(null, value); },
        reject: function (error) {
          finish(error instanceof Error || error instanceof DOMException ? error : new Error(String(error)));
        },
        post: function (message, buffers) {
          if (settled) return;
          clearTimeout(timer);
          timer = setTimeout(function () {
            finish(new Error('GIF worker timed out. Try a smaller or simpler GIF.'));
          }, WORKER_TIMEOUT);
          try { worker.postMessage(message, buffers || []); }
          catch (error) { finish(error); }
        }
      };

      try {
        if (signal && signal.aborted) { finish(abortError()); return; }
        worker = new Worker(workerURL, { type: 'classic', name: 'PhotoQRGIF' });
        worker.onerror = function (event) {
          event.preventDefault();
          finish(new Error('GIF worker failed: ' + (event.message || 'check that the local worker file can be loaded.')));
        };
        worker.onmessageerror = function () {
          finish(new Error('GIF worker returned an unreadable message.'));
        };
        worker.onmessage = function (event) {
          if (settled) return;
          clearTimeout(timer);
          const message = event.data;
          if (!message || typeof message.type !== 'string') {
            finish(new Error('GIF worker returned an invalid message.'));
            return;
          }
          if (message.type === 'error') {
            finish(new Error(message.message || 'GIF processing failed.'));
            return;
          }
          Promise.resolve().then(function () {
            if (!settled) return receive(message, job);
          }).catch(job.reject);
        };
        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
          if (signal.aborted) { onAbort(); return; }
        }
        job.post(initial, transfers);
      } catch (error) { finish(error); }
    });
  }

  async function decode(file, options = {}) {
    const signal = options.signal;
    if (signal && signal.aborted) throw abortError();
    if (!(file instanceof Blob)) throw new TypeError('Choose a GIF file to decode.');
    if (file.size > MAX_BYTES) throw new Error('GIF files must be 25 MB or smaller.');
    if (file.size < 14) throw new Error('The GIF file is empty or incomplete.');
    const header = new Uint8Array(await file.slice(0, 6).arrayBuffer());
    const signature = String.fromCharCode.apply(null, header);
    if (signature !== 'GIF87a' && signature !== 'GIF89a') {
      throw new Error('This file is not a GIF (expected GIF87a or GIF89a).');
    }
    const buffer = await file.arrayBuffer();
    const frames = [];
    let info;
    return runWorker({ type: 'decode', buffer: buffer }, [buffer], signal, function (message, job) {
      if (message.type === 'decode-info' && !info) {
        if (!validSize(message.width, message.height) || Math.max(message.width, message.height) > 600 ||
            !Number.isInteger(message.frameCount) || message.frameCount < 1 || message.frameCount > MAX_FRAMES ||
            message.width * message.height * message.frameCount > 16000000 ||
            !Number.isFinite(message.duration) || message.duration < 20 || message.duration > MAX_DURATION) {
          throw new Error('GIF worker returned invalid image dimensions or timing.');
        }
        info = message;
        job.post({ type: 'decode-next' });
      } else if (message.type === 'decoded-frame' && info) {
        if (message.index !== frames.length || message.index >= info.frameCount ||
            !(message.buffer instanceof ArrayBuffer) || message.buffer.byteLength !== info.width * info.height * 4 ||
            !Number.isFinite(message.delay) || message.delay < 20 || message.delay > MAX_DURATION) {
          throw new Error('GIF worker returned an invalid frame.');
        }
        const canvas = document.createElement('canvas');
        canvas.width = info.width;
        canvas.height = info.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('A 2D canvas is required to decode GIFs.');
        context.putImageData(new ImageData(new Uint8ClampedArray(message.buffer), info.width, info.height), 0, 0);
        frames.push({ image: canvas, delay: message.delay });
        if (frames.length === info.frameCount) job.resolve({ frames: frames, duration: info.duration });
        else job.post({ type: 'decode-next' });
      } else {
        throw new Error('GIF worker returned an unexpected decode message.');
      }
    });
  }

  async function encode(options) {
    if (!options || typeof options !== 'object') throw new TypeError('GIF export options are required.');
    const { width, height, frameCount, onFrame, onProgress, signal } = options;
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) {
      throw new TypeError('signal must be an AbortSignal.');
    }
    if (signal && signal.aborted) throw abortError();
    if (!validSize(width, height)) throw new Error('GIF export dimensions must be whole numbers from 1 to 2048.');
    if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > MAX_FRAMES) {
      throw new Error('GIF exports must contain between 1 and 120 frames.');
    }
    if (typeof onFrame !== 'function') throw new TypeError('GIF export requires an onFrame(index) callback.');
    if (onProgress !== undefined && typeof onProgress !== 'function') throw new TypeError('onProgress must be a function.');
    const delay = normalizedDelay(options.delay);
    if (delay * frameCount > MAX_DURATION) {
      throw new Error('GIF loops must be 10 seconds or shorter (including rounded frame delays).');
    }
    let next = 0;
    return runWorker({ type: 'encode', width: width, height: height, frameCount: frameCount, delay: delay }, [], signal,
      async function (message, job) {
        if (message.type === 'need-frame') {
          if (message.index !== next || next >= frameCount) throw new Error('GIF worker requested an unexpected frame.');
          // The previous frame has been fully encoded before this request arrives.
          if (onProgress && next > 0) await onProgress(next, frameCount);
          if (job.done) return;
          const image = await onFrame(next);
          if (job.done) return;
          if (!image || Object.prototype.toString.call(image) !== '[object ImageData]' ||
              image.width !== width || image.height !== height || !(image.data instanceof Uint8ClampedArray) ||
              image.data.byteLength !== width * height * 4 || !(image.data.buffer instanceof ArrayBuffer)) {
            throw new TypeError('onFrame(' + next + ') must return an RGBA ImageData of exactly ' + width + ' × ' + height + ' pixels.');
          }
          const data = image.data;
          const buffer = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength ? data.buffer : data.slice().buffer;
          job.post({ type: 'encode-frame', index: next++, buffer: buffer }, [buffer]);
        } else if (message.type === 'encoded') {
          if (next !== frameCount || !(message.buffer instanceof ArrayBuffer) ||
              message.buffer.byteLength < 14 || message.buffer.byteLength > MAX_BYTES) {
            throw new Error('GIF worker returned an invalid export.');
          }
          if (onProgress) await onProgress(frameCount, frameCount);
          if (!job.done) job.resolve(new Blob([message.buffer], { type: 'image/gif' }));
        } else {
          throw new Error('GIF worker returned an unexpected encode message.');
        }
      });
  }

  window.PhotoQRGIF = Object.freeze({ decode: decode, encode: encode });
})();
