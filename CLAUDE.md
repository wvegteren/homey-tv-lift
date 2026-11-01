# CLAUDE.md

Homey SDK v3 app (TypeScript) that controls a Limoss TV lift over BLE. App id `nl.egteren.tvlift`, Homey Pro only (`platforms: ["local"]`). Rewrite of the earlier prototype in `../tvlift/nl.egteren.tvlift` (protocol proven to work there on a real lift).

## Commands

```bash
npm run build                      # tsc -> .homeybuild/
npm run lint                       # eslint (athom/homey-app + TS resolver tweaks)
npm run frames                     # print encrypted frames + decrypted payloads, no Homey needed
homey app validate --level debug
homey app run                      # needs a selected Homey (`homey select`)
```

## Layout

- `.homeycompose/app.json`, `drivers/*/driver.compose.json`, `locales/*.json` are the sources; root `app.json` is generated — don't edit it.
- `lib/protocol.ts` — UUIDs (hyphenless, as Homey's BLE API wants), TEA key, `COMMANDS` table, `buildBleFrame()`. Frame: `0xDD` + TEA(8-byte payload `AA cmd[5] rnd sum`) + checksum.
- `lib/tea.ts` — TEA port of the vendor app's `Tea.java` (16 rounds).
- `drivers/tvlift/` — pairing filters BLE advertisements on `SERVICE_UUID`; `data.id` = peripheral uuid.
  Device uses class `windowcoverings` + `windowcoverings_state` (`up`/`idle`/`down`), which gives UI and standard Flow cards for free.
  Commands are queued (one BLE connection at a time), connect → write → disconnect, one retry, user-readable error via `errors.command_failed`.

## Vendor app reference

Inspected vendor Android app: command table in `com/kuian/mainservice/CmdFormater.java`, UI behaviour in `com/limoss/Breagle/MainControlActivity2.java`.
The vendor app is hold-to-run: it repeats the motor command every 60 ms while a button is held and sends `0xFF` (stop) 5x on release.
Other known commands: `0x10` ask position (reply via notification on FFE1: `0x10` + uint32 BE), `0x11` + uint32 go to position (memory recall), `0x66` motor off, `0x00/0x01/0x02` HW/SW version and motor/memory count.

## Known gaps

- No position/state feedback yet; state is the last command sent. Position read/set (`0x10`/`0x11`) not implemented.
