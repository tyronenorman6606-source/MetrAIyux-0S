/*
  ConnectLog QR Lite — local QR SVG generator.
  Adapted from QR Code concepts used by python-qrcode / pyqrnative.
  Source-lineage license notices are included in THIRD_PARTY_NOTICES.md.
*/
(() => {
  'use strict';

  const EC_L = 1;
  const EC_M = 0;
  const EC_Q = 3;
  const EC_H = 2;
  const MODE_8BIT_BYTE = 4;
  const PAD0 = 0xec;
  const PAD1 = 0x11;
  const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1;
  const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | 1;
  const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
  const EC_OFFSET = { [EC_L]: 0, [EC_M]: 1, [EC_Q]: 2, [EC_H]: 3 };

  const PATTERN_POSITION_TABLE = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];
  const RS_BLOCK_TABLE = [[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];

  const EXP_TABLE = Array.from({ length: 256 }, (_, i) => i);
  const LOG_TABLE = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 0; i < 8; i += 1) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i += 1) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  for (let i = 0; i < 255; i += 1) LOG_TABLE[EXP_TABLE[i]] = i;

  class BitBuffer {
    constructor() {
      this.buffer = [];
      this.length = 0;
    }
    put(num, length) {
      for (let i = 0; i < length; i += 1) this.putBit(((num >> (length - i - 1)) & 1) === 1);
    }
    putBit(bit) {
      const index = Math.floor(this.length / 8);
      if (this.buffer.length <= index) this.buffer.push(0);
      if (bit) this.buffer[index] |= 0x80 >> (this.length % 8);
      this.length += 1;
    }
  }

  function createSvg(value, options = {}) {
    const level = options.level ?? EC_M;
    const border = Math.max(0, Number(options.border ?? 4));
    const qr = make(value, level);
    const size = qr.length;
    const full = size + border * 2;
    let path = '';
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (qr[r][c]) path += `M${c + border} ${r + border}h1v1h-1z`;
      }
    }
    const dark = escapeXml(options.dark || '#05070d');
    const light = escapeXml(options.light || '#ffffff');
    return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><path fill="${light}" d="M0 0h${full}v${full}H0z"/><path fill="${dark}" d="${path}"/></svg>`;
  }

  function make(value, level = EC_M) {
    const data = new TextEncoder().encode(String(value || ''));
    const version = chooseVersion(data.length, level);
    const dataBytes = createData(version, level, data);
    let bestModules = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask += 1) {
      const modules = makeModules(version, level, mask, dataBytes, false);
      const score = lostPoint(modules);
      if (score < bestScore) {
        bestScore = score;
        bestModules = modules;
      }
    }
    return bestModules;
  }

  function chooseVersion(byteLength, level) {
    for (let version = 1; version <= 40; version += 1) {
      const lengthBits = version < 10 ? 8 : 16;
      const neededBits = 4 + lengthBits + byteLength * 8;
      if (neededBits <= bitCapacity(version, level)) return version;
    }
    throw new Error('QR payload is too large. Shorten the profile note or URLs.');
  }

  function bitCapacity(version, level) {
    return rsBlocks(version, level).reduce((sum, block) => sum + block.dataCount * 8, 0);
  }

  function rsBlocks(version, level) {
    const offset = EC_OFFSET[level];
    const raw = RS_BLOCK_TABLE[(version - 1) * 4 + offset];
    if (!raw) throw new Error('Invalid QR version or error correction level.');
    const blocks = [];
    for (let i = 0; i < raw.length; i += 3) {
      const count = raw[i];
      const totalCount = raw[i + 1];
      const dataCount = raw[i + 2];
      for (let j = 0; j < count; j += 1) blocks.push({ totalCount, dataCount });
    }
    return blocks;
  }

  function createData(version, level, bytes) {
    const buffer = new BitBuffer();
    buffer.put(MODE_8BIT_BYTE, 4);
    buffer.put(bytes.length, version < 10 ? 8 : 16);
    bytes.forEach((byte) => buffer.put(byte, 8));
    const capacity = bitCapacity(version, level);
    if (buffer.length > capacity) throw new Error('QR payload overflow.');
    const terminator = Math.min(capacity - buffer.length, 4);
    for (let i = 0; i < terminator; i += 1) buffer.putBit(false);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    let padIndex = 0;
    while (buffer.length < capacity) {
      buffer.put(padIndex % 2 === 0 ? PAD0 : PAD1, 8);
      padIndex += 1;
    }
    return createCodewords(buffer.buffer, rsBlocks(version, level));
  }

  function createCodewords(bytes, blocks) {
    let offset = 0;
    const dcdata = [];
    const ecdata = [];
    let maxDc = 0;
    let maxEc = 0;
    blocks.forEach((block) => {
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - block.dataCount;
      const currentDc = bytes.slice(offset, offset + dcCount);
      offset += dcCount;
      const currentEc = reedSolomon(currentDc, ecCount);
      dcdata.push(currentDc);
      ecdata.push(currentEc);
      maxDc = Math.max(maxDc, dcCount);
      maxEc = Math.max(maxEc, ecCount);
    });
    const out = [];
    for (let i = 0; i < maxDc; i += 1) dcdata.forEach((dc) => { if (i < dc.length) out.push(dc[i]); });
    for (let i = 0; i < maxEc; i += 1) ecdata.forEach((ec) => { if (i < ec.length) out.push(ec[i]); });
    return out;
  }

  function reedSolomon(data, degree) {
    const gen = rsGenerator(degree);
    const result = Array(degree).fill(0);
    data.forEach((byte) => {
      const factor = byte ^ result[0];
      result.shift();
      result.push(0);
      for (let i = 0; i < degree; i += 1) result[i] ^= gfMul(gen[i + 1], factor);
    });
    return result;
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) poly = polyMultiply(poly, [1, gexp(i)]);
    return poly;
  }

  function polyMultiply(a, b) {
    const out = Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i += 1) {
      for (let j = 0; j < b.length; j += 1) out[i + j] ^= gfMul(a[i], b[j]);
    }
    return out;
  }

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return gexp(glog(a) + glog(b));
  }
  function glog(n) { if (n < 1) throw new Error('Invalid GF log value.'); return LOG_TABLE[n]; }
  function gexp(n) { return EXP_TABLE[((n % 255) + 255) % 255]; }

  function makeModules(version, level, maskPattern, data, test) {
    const count = version * 4 + 17;
    const modules = Array.from({ length: count }, () => Array(count).fill(null));
    setupPositionProbePattern(modules, 0, 0);
    setupPositionProbePattern(modules, count - 7, 0);
    setupPositionProbePattern(modules, 0, count - 7);
    setupPositionAdjustPattern(modules, version);
    setupTimingPattern(modules);
    setupTypeInfo(modules, level, maskPattern, test);
    if (version >= 7) setupTypeNumber(modules, version, test);
    mapData(modules, data, maskPattern);
    return modules;
  }

  function setupPositionProbePattern(modules, row, col) {
    const count = modules.length;
    for (let r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || count <= row + r) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || count <= col + c) continue;
        modules[row + r][col + c] = ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4));
      }
    }
  }

  function setupTimingPattern(modules) {
    const count = modules.length;
    for (let r = 8; r < count - 8; r += 1) if (modules[r][6] === null) modules[r][6] = r % 2 === 0;
    for (let c = 8; c < count - 8; c += 1) if (modules[6][c] === null) modules[6][c] = c % 2 === 0;
  }

  function setupPositionAdjustPattern(modules, version) {
    const pos = PATTERN_POSITION_TABLE[version - 1];
    pos.forEach((row) => {
      pos.forEach((col) => {
        if (modules[row][col] !== null) return;
        for (let r = -2; r <= 2; r += 1) {
          for (let c = -2; c <= 2; c += 1) modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
        }
      });
    });
  }

  function setupTypeInfo(modules, level, maskPattern, test) {
    const count = modules.length;
    const bits = BCHTypeInfo((level << 3) | maskPattern);
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) modules[i][8] = mod;
      else if (i < 8) modules[i + 1][8] = mod;
      else modules[count - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) modules[8][count - i - 1] = mod;
      else if (i < 9) modules[8][15 - i] = mod;
      else modules[8][15 - i - 1] = mod;
    }
    modules[count - 8][8] = !test;
  }

  function setupTypeNumber(modules, version, test) {
    const count = modules.length;
    const bits = BCHTypeNumber(version);
    for (let i = 0; i < 18; i += 1) {
      const mod = !test && ((bits >> i) & 1) === 1;
      modules[Math.floor(i / 3)][(i % 3) + count - 11] = mod;
      modules[(i % 3) + count - 11][Math.floor(i / 3)] = mod;
    }
  }

  function mapData(modules, data, maskPattern) {
    const count = modules.length;
    let inc = -1;
    let row = count - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const mask = maskFunc(maskPattern);
    for (let col = count - 1; col > 0; col -= 2) {
      if (col <= 6) col -= 1;
      while (true) {
        for (let c = 0; c < 2; c += 1) {
          const x = col - c;
          if (modules[row][x] === null) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >> bitIndex) & 1) === 1;
            if (mask(row, x)) dark = !dark;
            modules[row][x] = dark;
            bitIndex -= 1;
            if (bitIndex === -1) { byteIndex += 1; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || count <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }

  function maskFunc(pattern) {
    const masks = [
      (i, j) => (i + j) % 2 === 0,
      (i) => i % 2 === 0,
      (_, j) => j % 3 === 0,
      (i, j) => (i + j) % 3 === 0,
      (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
      (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
      (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
      (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0
    ];
    return masks[pattern];
  }

  function BCHTypeInfo(data) {
    let d = data << 10;
    while (BCHDigit(d) - BCHDigit(G15) >= 0) d ^= G15 << (BCHDigit(d) - BCHDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  }
  function BCHTypeNumber(data) {
    let d = data << 12;
    while (BCHDigit(d) - BCHDigit(G18) >= 0) d ^= G18 << (BCHDigit(d) - BCHDigit(G18));
    return (data << 12) | d;
  }
  function BCHDigit(data) {
    let digit = 0;
    while (data !== 0) { digit += 1; data >>>= 1; }
    return digit;
  }

  function lostPoint(modules) {
    const count = modules.length;
    let lost = 0;
    for (let row = 0; row < count; row += 1) {
      let same = 1;
      let previous = modules[row][0];
      for (let col = 1; col < count; col += 1) {
        if (modules[row][col] === previous) same += 1;
        else { if (same >= 5) lost += same - 2; same = 1; previous = modules[row][col]; }
      }
      if (same >= 5) lost += same - 2;
    }
    for (let col = 0; col < count; col += 1) {
      let same = 1;
      let previous = modules[0][col];
      for (let row = 1; row < count; row += 1) {
        if (modules[row][col] === previous) same += 1;
        else { if (same >= 5) lost += same - 2; same = 1; previous = modules[row][col]; }
      }
      if (same >= 5) lost += same - 2;
    }
    for (let row = 0; row < count - 1; row += 1) {
      for (let col = 0; col < count - 1; col += 1) {
        const value = modules[row][col];
        if (value === modules[row + 1][col] && value === modules[row][col + 1] && value === modules[row + 1][col + 1]) lost += 3;
      }
    }
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count - 10; col += 1) if (finderPenalty([0,1,2,3,4,5,6,7,8,9,10].map((i) => modules[row][col + i]))) lost += 40;
    }
    for (let col = 0; col < count; col += 1) {
      for (let row = 0; row < count - 10; row += 1) if (finderPenalty([0,1,2,3,4,5,6,7,8,9,10].map((i) => modules[row + i][col]))) lost += 40;
    }
    const dark = modules.flat().filter(Boolean).length;
    lost += Math.floor(Math.abs((dark * 100) / (count * count) - 50) / 5) * 10;
    return lost;
  }

  function finderPenalty(bits) {
    const p1 = [true, false, true, true, true, false, true, false, false, false, false];
    const p2 = [false, false, false, false, true, false, true, true, true, false, true];
    return samePattern(bits, p1) || samePattern(bits, p2);
  }
  function samePattern(a, b) { return a.every((item, index) => item === b[index]); }
  function escapeXml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }

  window.ConnectLogQR = { createSvg, EC_L, EC_M, EC_Q, EC_H };
})();
