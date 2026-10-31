/* eslint-disable no-console */
// Prints freshly encrypted BLE frames as hex. Run with `npm run frames`; no Homey needed.
import {
  buildBleFrame, COMMANDS, CommandName, TEA_KEY, TEA_ROUNDS,
} from './protocol';
import { teaDecrypt } from './tea';

for (const name of Object.keys(COMMANDS) as CommandName[]) {
  const frame = buildBleFrame(name);
  const decrypted = teaDecrypt(frame.subarray(1, 9), TEA_KEY, TEA_ROUNDS);
  console.log(`${name.padEnd(10)} frame=${frame.toString('hex')}  payload=${decrypted.toString('hex')}`);
}
