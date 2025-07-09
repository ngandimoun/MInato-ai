# FFmpeg Installation Guide

The video creation feature requires FFmpeg to be installed on your system. When FFmpeg is not available, the system will create individual video frames that you can convert to video manually.

## Quick Installation

### Windows

**Option 1: Download Pre-built Binary (Recommended)**
1. Go to https://www.gyan.dev/ffmpeg/builds/
2. Download "release builds" → "ffmpeg-release-essentials.zip"
3. Extract to `C:\ffmpeg\`
4. The executable should be at `C:\ffmpeg\bin\ffmpeg.exe`
5. Restart your development server

**Option 2: Using Package Managers**
- **Chocolatey**: `choco install ffmpeg`
- **Scoop**: `scoop install ffmpeg`
- **winget**: `winget install Gyan.FFmpeg`

**Option 3: Add to PATH**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to any folder (e.g., `C:\tools\ffmpeg\`)
3. Add the `bin` folder to your Windows PATH environment variable
4. Restart your development server

### macOS

```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Using MacPorts
sudo port install ffmpeg
```

### Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# CentOS/RHEL/Fedora
sudo dnf install ffmpeg
# or older versions:
sudo yum install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

## Verifying Installation

After installation, verify FFmpeg is working:

```bash
ffmpeg -version
```

You should see version information and available codecs.

## Troubleshooting

### Common Issues

1. **"FFmpeg not found in PATH"**
   - Make sure the FFmpeg `bin` directory is in your system PATH
   - Restart your terminal/command prompt after adding to PATH

2. **"Permission denied"**
   - On Linux/macOS, ensure the FFmpeg binary has execute permissions
   - Try: `chmod +x /path/to/ffmpeg`

3. **"spawn ENOENT"**
   - FFmpeg binary cannot be executed
   - Check if the path is correct and the binary is not corrupted

### Alternative: Frame Sequence Conversion

If you cannot install FFmpeg, the system will create individual PNG frames. You can convert these to video using:

1. **Online converters**: Upload frames to an online frame-to-video converter
2. **Video editing software**: Import frame sequence into DaVinci Resolve (free) or similar
3. **Cloud FFmpeg services**: Use online FFmpeg tools

### Manual Conversion Command

If you have FFmpeg installed later, you can convert the generated frames:

```bash
ffmpeg -framerate 30 -i "frame_%05d.png" -c:v libx264 -pix_fmt yuv420p -r 30 output.mp4
```

## Development Server

**Important**: After installing FFmpeg, restart your development server for the changes to take effect.

```bash
# Stop the server (Ctrl+C) then restart
npm run dev
```

## Need Help?

If you continue to have issues:
1. Check that FFmpeg is in your system PATH
2. Verify permissions on the FFmpeg binary
3. Try running FFmpeg directly from command line
4. Check the application logs for specific error messages

The system is designed to work without FFmpeg by creating frame sequences, but full video creation requires FFmpeg to be properly installed and configured. 