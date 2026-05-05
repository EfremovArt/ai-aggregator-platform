import { Module } from '@nestjs/common';
import { ModelRouterService } from './model-router.service';
import { ModelsModule } from '../models/models.module';
import { ProviderRegistryService } from './provider-registry.service';

@Module({
  imports: [ModelsModule],
  providers: [ModelRouterService, ProviderRegistryService],
  exports: [ModelRouterService, ProviderRegistryService],
})
export class ModelRouterModule {}
