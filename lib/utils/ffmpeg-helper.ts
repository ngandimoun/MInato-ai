// FFmpeg Helper Utility for Windows Compatibility
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/memory-framework/config';

export interface FFmpegConfig {
  isAvailable: boolean;
  path: string | null;
  error?: string;
  installGuide?: string;
}

export async function checkFFmpegAvailability(): Promise<FFmpegConfig> {
  // Try ffmpeg-static first
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && typeof ffmpegStatic === 'string') {
      const ffmpegPath = path.resolve(ffmpegStatic);
      try {
        await fs.access(ffmpegPath);
        logger.info(`[FFmpeg Helper] Static FFmpeg found at: ${ffmpegPath}`);
        // Test if the binary actually works
        return new Promise((resolve) => {
          exec(`"${ffmpegPath}" -version`, (error) => {
            if (error) {
              logger.warn(`[FFmpeg Helper] Static FFmpeg binary test failed: ${error.message}`);
              resolve(checkSystemFFmpeg());
            } else {
              logger.info(`[FFmpeg Helper] Static FFmpeg verified successfully`);
              resolve({
                isAvailable: true,
                path: ffmpegPath
              });
            }
          });
        });
      } catch (error) {
        logger.warn(`[FFmpeg Helper] Static FFmpeg path not accessible: ${ffmpegPath}`);
      }
    }
  } catch (error) {
    logger.warn('[FFmpeg Helper] ffmpeg-static package not available');
  }

  // Fallback to system FFmpeg
  return checkSystemFFmpeg();
}

async function checkSystemFFmpeg(): Promise<FFmpegConfig> {
  // Try common Windows paths
  if (process.platform === 'win32') {
    const commonPaths = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'ffmpeg', 'bin', 'ffmpeg.exe')
    ];
    
    for (const testPath of commonPaths) {
      try {
        await fs.access(testPath);
        // Test if the binary actually works
        const result = await new Promise<FFmpegConfig>((resolve) => {
          exec(`"${testPath}" -version`, (error) => {
            if (error) {
              logger.warn(`[FFmpeg Helper] System FFmpeg at ${testPath} test failed: ${error.message}`);
              resolve({ isAvailable: false, path: null });
            } else {
              logger.info(`[FFmpeg Helper] System FFmpeg found and verified at: ${testPath}`);
              resolve({
                isAvailable: true,
                path: testPath
              });
            }
          });
        });
        
        if (result.isAvailable) {
          return result;
        }
      } catch {
        continue;
      }
    }
  }

  // Try system PATH
  return new Promise((resolve) => {
    exec('ffmpeg -version', { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error('[FFmpeg Helper] FFmpeg not found in system PATH:', error.message);
        resolve({
          isAvailable: false,
          path: null,
          error: 'FFmpeg not found in system PATH',
          installGuide: getInstallGuide()
        });
      } else {
        logger.info('[FFmpeg Helper] FFmpeg found in system PATH');
        logger.debug('[FFmpeg Helper] FFmpeg version output:', stdout.substring(0, 200));
        resolve({
          isAvailable: true,
          path: 'ffmpeg'
        });
      }
    });
  });
}

function getInstallGuide(): string {
  if (process.platform === 'win32') {
    return `
FFmpeg is required for video processing but was not found on your system.

Quick Install Options for Windows:

1. **Easiest**: Download from https://www.gyan.dev/ffmpeg/builds/
   - Download "release builds" > "ffmpeg-release-essentials.zip"
   - Extract to C:\\ffmpeg\\
   - The exe should be at C:\\ffmpeg\\bin\\ffmpeg.exe

2. **Using Chocolatey**: 
   - Run: choco install ffmpeg

3. **Using Scoop**:
   - Run: scoop install ffmpeg

4. **Manual Setup**:
   - Download from https://ffmpeg.org/download.html
   - Extract to any folder
   - Add the bin folder to your Windows PATH

After installation, restart your development server.
`;
  } else if (process.platform === 'darwin') {
    return `
FFmpeg is required for video processing but was not found on your system.

Install on macOS:
1. **Using Homebrew**: brew install ffmpeg
2. **Using MacPorts**: sudo port install ffmpeg

After installation, restart your development server.
`;
  } else {
    return `
FFmpeg is required for video processing but was not found on your system.

Install on Linux:
- Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg
- CentOS/RHEL: sudo yum install ffmpeg
- Arch Linux: sudo pacman -S ffmpeg

After installation, restart your development server.
`;
  }
}

export function createUserFriendlyError(originalError: string): string {
  return `
Video processing failed: FFmpeg is not properly configured.

${getInstallGuide()}

Technical error: ${originalError}
`;
} 