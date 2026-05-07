import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminExportService, type ExportEntity } from './admin-export.service';

@Controller('admin/export')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminExportController {
  constructor(private readonly exporter: AdminExportService) {}

  @Get(':entity.csv')
  async export(
    @Param('entity') entity: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const range = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    const csv = await this.exporter.exportEntity(entity as ExportEntity, range);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
