import { spawn } from 'node:child_process';

/** Fetches the duration of the video */
export function probeDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            url,
        ]);

        let stdout = '';
        let stderr = '';

        ffprobe.stdout.on('data', chunk => {
            stdout += chunk.toString();
        });

        ffprobe.stderr.on('data', chunk => {
            stderr += chunk.toString();
        });

        ffprobe.on('error', reject);

        ffprobe.on('close', code => {
            if (code !== 0) {
                reject(new Error(`ffprobe failed: ${stderr}`));
                return;
            }

            const duration = Number.parseFloat(stdout.trim());
            if (!Number.isFinite(duration)) {
                reject(new Error(`Could not parse duration from ffprobe output: ${stdout}`));
                return;
            }

            resolve(duration);
        });
    });
}