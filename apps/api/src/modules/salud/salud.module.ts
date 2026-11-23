import { Module } from '@nestjs/common';
import { SaludController } from './presentation/salud.controller';

@Module({ controllers: [SaludController] })
export class SaludModule {}
