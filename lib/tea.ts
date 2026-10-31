/**
 * TEA (Tiny Encryption Algorithm)
 * This implementation uses plain uint32 arithmetic
 */

export type TeaKey = [number, number, number, number];

const DELTA = 0x9e3779b9;

function u32(x: number): number {
  return x >>> 0;
}

function encryptBlock(v0: number, v1: number, key: TeaKey, rounds: number): [number, number] {
  const [k0, k1, k2, k3] = key;
  let sum = 0;

  for (let i = 0; i < rounds; i++) {
    sum = u32(sum + DELTA);

    const t1 = u32(u32(v1 << 4) + k0);
    const t2 = u32(v1 + sum);
    const t3 = u32(u32(v1 >>> 5) + k1);
    v0 = u32(v0 + (t1 ^ t2 ^ t3));

    const t4 = u32(u32(v0 << 4) + k2);
    const t5 = u32(v0 + sum);
    const t6 = u32(u32(v0 >>> 5) + k3);
    v1 = u32(v1 + (t4 ^ t5 ^ t6));
  }

  return [v0, v1];
}

function decryptBlock(v0: number, v1: number, key: TeaKey, rounds: number): [number, number] {
  const [k0, k1, k2, k3] = key;
  let sum = u32(rounds * DELTA);

  for (let i = 0; i < rounds; i++) {
    const t4 = u32(u32(v0 << 4) + k2);
    const t5 = u32(v0 + sum);
    const t6 = u32(u32(v0 >>> 5) + k3);
    v1 = u32(v1 - (t4 ^ t5 ^ t6));

    const t1 = u32(u32(v1 << 4) + k0);
    const t2 = u32(v1 + sum);
    const t3 = u32(u32(v1 >>> 5) + k1);
    v0 = u32(v0 - (t1 ^ t2 ^ t3));

    sum = u32(sum - DELTA);
  }

  return [v0, v1];
}

/**
 * Encrypts an 8-byte block, matching Tea.encrypt(byte[], long[], int) in the
 * original Java source (rounds is normally 16, as used by Command.java).
 */
export function teaEncrypt(data: Buffer, key: TeaKey, rounds: number): Buffer {
  if (data.length !== 8) {
    throw new Error('TEA operates on 8-byte blocks');
  }
  const v0 = data.readUInt32BE(0);
  const v1 = data.readUInt32BE(4);
  const [e0, e1] = encryptBlock(v0, v1, key, rounds);
  const out = Buffer.alloc(8);
  out.writeUInt32BE(e0, 0);
  out.writeUInt32BE(e1, 4);
  return out;
}

/**
 * Decrypts an 8-byte block, matching Tea.decrypt(byte[], long[], int).
 * Not required to send commands, but included for completeness/testing
 * (e.g. to sniff and verify traffic from the original Android app).
 */
export function teaDecrypt(data: Buffer, key: TeaKey, rounds: number): Buffer {
  if (data.length !== 8) {
    throw new Error('TEA operates on 8-byte blocks');
  }
  const v0 = data.readUInt32BE(0);
  const v1 = data.readUInt32BE(4);
  const [d0, d1] = decryptBlock(v0, v1, key, rounds);
  const out = Buffer.alloc(8);
  out.writeUInt32BE(d0, 0);
  out.writeUInt32BE(d1, 4);
  return out;
}
