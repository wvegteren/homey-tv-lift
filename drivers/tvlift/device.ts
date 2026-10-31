import Homey from 'homey';
import {
  buildBleFrame, CommandName, SERVICE_UUID, CHARACTERISTIC_UUID, REPEAT, REPEAT_INTERVAL_MS,
} from '../../lib/protocol';

type LiftState = 'up' | 'idle' | 'down';

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
/** The lift refuses a new connection right after a disconnect; wait at least this long. */
const RECONNECT_GAP_MS = 1000;

class TvLiftDevice extends Homey.Device {

  /** Serialises BLE access: Homey can only hold one connection to the lift at a time. */
  private queue: Promise<void> = Promise.resolve();
  /** Incremented per request; a queued request is skipped when a newer one exists. */
  private requestSeq = 0;
  private lastDisconnectAt = 0;

  async onInit(): Promise<void> {
    this.registerCapabilityListener('windowcoverings_state', async (value: LiftState) => {
      await this.handleState(value);
    });
    this.log('TV lift device has been initialized');
  }

  private async handleState(value: LiftState): Promise<void> {
    await this.sendCommand(value === 'idle' ? 'stop' : value);
  }

  /**
   * Sends a command to the lift. Only the latest request matters: requests still
   * waiting in the queue when a newer one arrives are dropped.
   * Throws a user-readable error on failure.
   */
  async sendCommand(command: CommandName): Promise<void> {
    const seq = ++this.requestSeq;
    const run = this.queue.then(async () => {
      if (seq !== this.requestSeq) {
        this.log(`Skipping '${command}': superseded by a newer command`);
        return;
      }
      await this.sendWithRetry(command);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async sendWithRetry(command: CommandName): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.writeFrame(command);
        this.setAvailable().catch(this.error);
        return;
      } catch (err) {
        lastError = err;
        this.error(`Command '${command}' failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
        if (attempt < MAX_ATTEMPTS) await this.delay(RETRY_DELAY_MS);
      }
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(this.homey.__('errors.command_failed', { reason }));
  }

  /**
   * Finds the lift's advertisement. After a failed connection Homey drops the
   * peripheral from its cache ("Peripheral Not Found"); a fresh scan restores it.
   */
  private async findLift(id: string) {
    try {
      return await this.homey.ble.find(id);
    } catch (err) {
      this.log('Lift not in BLE cache, rescanning...', err instanceof Error ? err.message : err);
      await this.homey.ble.discover();
      return this.homey.ble.find(id);
    }
  }

  private async writeFrame(command: CommandName): Promise<void> {
    const { id } = this.getData() as { id: string };
    const repeat = REPEAT[command] ?? 1;

    const wait = this.lastDisconnectAt + RECONNECT_GAP_MS - Date.now();
    if (wait > 0) await this.delay(wait);

    this.log(`Sending '${command}' (${repeat}x)`);
    const advertisement = await this.findLift(id);
    const peripheral = await advertisement.connect();
    try {
      for (let i = 0; i < repeat; i++) {
        if (i > 0) await this.delay(REPEAT_INTERVAL_MS);
        // Each write gets a fresh frame (new random byte), like the vendor app.
        await peripheral.write(SERVICE_UUID, CHARACTERISTIC_UUID, buildBleFrame(command));
      }
    } finally {
      await peripheral.disconnect().catch(this.error);
      this.lastDisconnectAt = Date.now();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.homey.setTimeout(resolve, ms));
  }

  async onDeleted(): Promise<void> {
    this.log('TV lift device has been deleted');
  }

}

export = TvLiftDevice;
