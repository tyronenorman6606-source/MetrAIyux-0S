let workerPromise = null;

export async function recognizeImage(imageBlob, onProgress = () => {}) {
  if (!imageBlob) throw new Error('No image selected for OCR.');
  onProgress({ status: 'loading OCR engine', progress: 0.02 });
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (event) => {
      if (event && typeof event.progress === 'number') onProgress(event);
    }
  });
  try {
    onProgress({ status: 'recognizing text locally', progress: 0.2 });
    const result = await worker.recognize(imageBlob);
    onProgress({ status: 'OCR complete', progress: 1 });
    return result?.data?.text || '';
  } finally {
    await worker.terminate();
  }
}

export async function recognizeImageWithReusableWorker(imageBlob, onProgress = () => {}) {
  if (!imageBlob) throw new Error('No image selected for OCR.');
  const { createWorker } = await import('tesseract.js');
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: (event) => {
        if (event && typeof event.progress === 'number') onProgress(event);
      }
    });
  }
  const worker = await workerPromise;
  const result = await worker.recognize(imageBlob);
  return result?.data?.text || '';
}

export async function shutdownOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
