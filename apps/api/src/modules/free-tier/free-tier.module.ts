import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeTierController } from './free-tier.controller';
import { FreeTierService } from './free-tier.service';

@Module({
  imports: [PrismaModule],
  controllers: [FreeTierController],
  providers: [FreeTierService],
  exports: [FreeTierService],
})
export class FreeTierModule {}
