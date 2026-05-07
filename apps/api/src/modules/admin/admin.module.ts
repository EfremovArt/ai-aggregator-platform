import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCouponsService } from './admin-coupons.service';
import { AdminExportController } from './admin-export.controller';
import { AdminExportService } from './admin-export.service';

@Module({
  controllers: [AdminController, AdminCouponsController, AdminExportController],
  providers: [AdminService, AdminCouponsService, AdminExportService],
})
export class AdminModule {}
