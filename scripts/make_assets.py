import struct
import zlib
import os

def make_png(width=100, height=100, r=108, g=99, b=255):
    def chunk(name, data):
        c = name + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    sig = b'\x89PNG\r\n\x1a\n'

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += bytes([r, g, b])

    compressed = zlib.compress(raw)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


os.makedirs('assets', exist_ok=True)

png_data = make_png()

files = [
    'assets/icon.png',
    'assets/splash.png',
    'assets/adaptive-icon.png',
    'assets/favicon.png'
]

for filepath in files:
    with open(filepath, 'wb') as f:
        f.write(png_data)
    print(f'Created {filepath} ({len(png_data)} bytes)')

print('All assets created successfully!')
