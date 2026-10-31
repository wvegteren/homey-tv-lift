import sourceMapSupport from 'source-map-support';
import Homey from 'homey';

sourceMapSupport.install();

class TvLiftApp extends Homey.App {

  async onInit(): Promise<void> {
    this.log('Limoss TV Lift app has been initialized');
  }

}

export = TvLiftApp;
