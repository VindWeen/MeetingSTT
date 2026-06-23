import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

/**
 * Get the duration of an audio file in seconds.
 * @param {string} filePath 
 * @returns {Promise<number>}
 */
export function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const durationStr = metadata?.format?.duration;
      const parsed = parseFloat(durationStr);
      resolve(isNaN(parsed) ? 0 : parsed);
    });
  });
}

/**
 * Split a large audio file into smaller chunks of specified duration.
 * @param {string} filePath - Absolute path to the source audio file
 * @param {number} totalDuration - Total duration of the audio in seconds
 * @param {string} outputDir - Directory to store output chunks
 * @param {number} chunkDuration - Target duration for each chunk in seconds (default: 600 seconds = 10 mins)
 * @returns {Promise<string[]>} List of absolute paths to the chunk files
 */
export function splitAudio(filePath, totalDuration, outputDir, chunkDuration = 600) {
  return new Promise(async (resolve, reject) => {
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const chunkPaths = [];
    const numChunks = Math.ceil(totalDuration / chunkDuration);
    
    let completed = 0;
    let hasError = false;

    // Helper to process a single chunk
    const processChunk = (i) => {
      const startTime = i * chunkDuration;
      const duration = Math.min(chunkDuration, totalDuration - startTime);
      const chunkName = `${baseName}_part_${i + 1}${ext}`;
      const chunkPath = path.join(outputDir, chunkName);
      
      ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(chunkPath)
        .on('end', () => {
          if (hasError) return;
          chunkPaths[i] = chunkPath;
          completed++;
          if (completed === numChunks) {
            resolve(chunkPaths);
          }
        })
        .on('error', (err) => {
          if (hasError) return;
          hasError = true;
          reject(new Error(`Failed to split chunk ${i + 1}: ${err.message}`));
        })
        .run();
    };

    try {
      for (let i = 0; i < numChunks; i++) {
        processChunk(i);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Safely delete files or directories
 * @param {string[]} paths 
 */
export function cleanupFiles(paths) {
  paths.forEach(p => {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`[Audio Cleanup] Deleted temporary file: ${p}`);
      }
    } catch (err) {
      console.error(`[Audio Cleanup] Error deleting file ${p}:`, err.message);
    }
  });
}
