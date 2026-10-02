import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DrizzleService } from './database/drizzle.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly drizzleService: DrizzleService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/db')
  async getDatabaseHealth() {
    const rows = await this.drizzleService.execute<{
      ok: number;
      ahora: string;
    }>('SELECT 1 AS ok, now() AS ahora');
    return { baseDatos: 'ok', ...rows[0] };
  }
}
