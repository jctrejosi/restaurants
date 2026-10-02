import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      servicio: 'restaurants-api',
      estado: 'ok',
      fecha: new Date().toISOString(),
    };
  }
}
