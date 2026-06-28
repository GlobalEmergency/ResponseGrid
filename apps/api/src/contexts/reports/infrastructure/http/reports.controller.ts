import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import type { AuthenticatedUser } from '../../../identity/infrastructure/http/jwt-auth.guard';
import { SubmitReport } from '../../application/submit-report';
import { GetReportsQueue } from '../../application/get-reports-queue';
import { MarkReportReviewed } from '../../application/mark-report-reviewed';
import { GetMyReports } from '../../application/get-my-reports';
import { SubmitReportDto, GetReportsQueueQueryDto } from './dto';
import { ReportSnapshot } from '../../domain/report';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(
    private readonly submitReport: SubmitReport,
    private readonly getReportsQueue: GetReportsQueue,
    private readonly markReportReviewed: MarkReportReviewed,
    private readonly getMyReports: GetMyReports,
  ) {}

  /** Submit a field report for an emergency. */
  @Post('emergencies/:emergencyId/reports')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a field report' })
  @ApiParam({ name: 'emergencyId', type: String })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  async submit(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: SubmitReportDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<{ id: string }> {
    return this.submitReport.execute({
      emergencyId,
      reporterUserId: req.user!.id,
      type: dto.type,
      note: dto.note,
      priority: dto.priority,
      photoUrls: dto.photoUrls ?? [],
      resourceId: dto.resourceId ?? null,
      location: dto.location ?? null,
    });
  }

  /** Get all reports for an emergency (coordinator queue). */
  @Get('emergencies/:emergencyId/reports')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('report:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coordination queue of reports' })
  @ApiParam({ name: 'emergencyId', type: String })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getQueue(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: GetReportsQueueQueryDto,
  ): Promise<ReportSnapshot[]> {
    const filters: import('../../domain/ports/report.repository').ReportQueueFilters =
      {};
    if (query.status !== undefined) filters.status = query.status;
    if (query.priority !== undefined) filters.priority = query.priority;
    if (query.resourceId !== undefined) filters.resourceId = query.resourceId;
    if (query.type !== undefined) filters.type = query.type;
    return this.getReportsQueue.execute({ emergencyId, filters });
  }

  /** Mark a report as reviewed. */
  @Post('reports/:reportId/review')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('report:triage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a report as reviewed' })
  @ApiParam({ name: 'reportId', type: String })
  @ApiResponse({ status: 204, description: 'Report marked as reviewed' })
  async review(
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<void> {
    await this.markReportReviewed.execute({ reportId });
  }

  /** Get my own reports for an emergency. */
  @Get('emergencies/:emergencyId/reports/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my field reports for an emergency' })
  @ApiParam({ name: 'emergencyId', type: String })
  @ApiResponse({ status: 200, description: 'List of my reports' })
  async mine(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ReportSnapshot[]> {
    return this.getMyReports.execute({
      emergencyId,
      userId: req.user!.id,
    });
  }
}
