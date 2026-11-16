import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, crc]);
}
export function icon(size) {
  const data = Buffer.alloc((size * 3 + 1) * size);
  const beads = Array.from({ length: 22 }, (_, i) => {
    const angle = i * Math.PI * 2 / 22;
    return [256 + Math.sin(angle) * 112, 220 + Math.cos(angle) * 112];
  });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + .5) / size * 512;
      const py = (y + .5) / size * 512;
      const gold = (Math.abs(px - 256) < 7 && py > 220 && py < 391) || (Math.abs(py - 349) < 7 && px > 220 && px < 292) || beads.some(([bx, by]) => Math.hypot(px - bx, py - by) < 7);
      const ivory = (Math.abs(px - 256) < 7 && py > 154 && py < 262) || (Math.abs(py - 188) < 7 && px > 221 && px < 291);
      const color = ivory ? [245, 241, 232] : gold ? [207, 181, 117] : [36, 59, 54];
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      color.forEach((value, channel) => { data[offset + channel] = value; });
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(data)), chunk('IEND', Buffer.alloc(0))]);
}
