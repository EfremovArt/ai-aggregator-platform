import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AssistantsController } from './assistants.controller';
import { AssistantsService } from './assistants.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantsController],
  providers: [AssistantsService],
  exports: [AssistantsService],
})
export class AssistantsModule {}
