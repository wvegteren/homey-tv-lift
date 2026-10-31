import Homey from 'homey';
import { SERVICE_UUID } from '../../lib/protocol';

class TvLiftDriver extends Homey.Driver {

  async onInit(): Promise<void> {
    this.log('TV lift driver has been initialized');
  }

  async onPairListDevices() {
    this.log('Scanning for Limoss TV lifts...');
    const advertisements = await this.homey.ble.discover();

    const devices = advertisements
      .filter((ad) => ad.serviceUuids?.includes(SERVICE_UUID))
      .map((ad) => ({
        name: ad.localName || this.homey.__('pair.default_name'),
        data: {
          id: ad.uuid,
        },
        store: {
          address: ad.address,
        },
      }));

    this.log(`Found ${devices.length} Limoss TV lift(s):`, devices.map((d) => `${d.name} (${d.store.address})`));
    return devices;
  }

}

export = TvLiftDriver;
