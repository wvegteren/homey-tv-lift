/**
 * Frame layout sent over BLE (10 bytes):
 *   [0]     0xDD
 *   [1..8]  TEA-encrypted 8-byte payload
 *   [9]     checksum = (sum of bytes 0..8) & 0xFF
 *
 * The 8-byte payload before encryption:
 *   [0]     0xAA
 *   [1..5]  5 command-specific bytes (taken from the hex command constants)
 *   [6]     random byte
 *   [7]     checksum = (sum of bytes 0..6) & 0xFF
 */

import { teaEncrypt, TeaKey } from './tea';

export const SERVICE_UUID = '0000ffe000001000800000805f9b34fb';
export const CHARACTERISTIC_UUID = '0000ffe100001000800000805f9b34fb';
export const TEA_KEY: TeaKey = [1431639188, 1949848917, 1431639188, 1949848917];
export const TEA_ROUNDS = 16;

// Command bytes from CmdFormater.java (com.kuian.mainservice) in the vendor app.
// Bytes 2..5 are per-motor "reverse" flags; we always send 00.
export const COMMANDS = {
  calibrate: 'AA05000000000000', // kLimossCmd_CalibrationOK
  up: 'AA12000000000000', // kLimossCmd_Machine01Do
  down: 'AA13000000000000', // kLimossCmd_Machine01DoCounter
  stop: 'AAFF000000000000', // sendCodeStop(): sent 5x at 60 ms after a button is released
} as const;

export type CommandName = keyof typeof COMMANDS;

/** How many times a command is written within one connection, and the gap between writes. */
export const REPEAT: Partial<Record<CommandName, number>> = { stop: 3 };
export const REPEAT_INTERVAL_MS = 60;

function randomByte(): number {
  return Math.floor(Math.random() * 256);
}

function buildPayload(commandHex: string): Buffer {
  const cmd = Buffer.from(commandHex, 'hex'); // 8 bytes, e.g. AA 05 00 00 00 00 00 00

  const payload = Buffer.alloc(8);
  payload[0] = 0xaa;
  payload[1] = cmd[1];
  payload[2] = cmd[2];
  payload[3] = cmd[3];
  payload[4] = cmd[4];
  payload[5] = cmd[5];
  payload[6] = randomByte();

  let checksum = 0;
  for (let i = 0; i < 7; i++) checksum += payload[i];
  payload[7] = checksum & 0xff;

  return payload;
}

/**
 * Builds the final 10-byte, TEA-encrypted BLE frame for a given command,
 * ready to be written to the characteristic.
 */
export function buildBleFrame(commandName: CommandName): Buffer {
  const payload = buildPayload(COMMANDS[commandName]);
  const encrypted = teaEncrypt(payload, TEA_KEY, TEA_ROUNDS);

  const frame = Buffer.alloc(10);
  frame[0] = 0xdd;
  encrypted.copy(frame, 1);

  let checksum = 0;
  for (let i = 0; i < 9; i++) checksum += frame[i];
  frame[9] = checksum & 0xff;

  return frame;
}
