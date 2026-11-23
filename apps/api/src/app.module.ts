import { Module } from '@nestjs/common';
import { SaludModule } from './modules/salud/salud.module';

@Module({
  imports: [SaludModule],
})
export class AppModule {}
