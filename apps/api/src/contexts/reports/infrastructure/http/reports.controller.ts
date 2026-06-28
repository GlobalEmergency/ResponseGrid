import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { EditReport, EditReportCommand } from '../../application/edit-report';
import { DiscardReport } from '../../application/discard-report';
import {
  SubmitReportDto,
  GetReportsQueueQueryDto,
  EditReportDto,
  DiscardReportDto,
} from './dto';
import { ReportSnapshot } from '../../domain/report';
import { setAuditContext } from '../../../audit/infrastructure/http/audit-context';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(
    private readonly submitReport: SubmitReport,
    private readonly getReportsQueue: GetReportsQueue,
    private readonly markReportReviewed: MarkReportReviewed,
    private readonly getMyReports: GetMyReports,
    private readonly editReport: EditReport,
    private readonly discardReport: DiscardReport,
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

  /** Edit a report during triage. Requires a reason; recorded in the audit trail. */
  @Patch('reports/:reportId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('report:triage')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Editar un reporte durante el triaje (coordinador). Requiere un motivo; se registra en la trazabilidad.',
  })
  @ApiParam({ name: 'reportId', type: String })
  @ApiResponse({ status: 204, description: 'Report edited' })
  @ApiResponse({
    status: 400,
    description: 'Missing reason or report is closed',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Coordinator role required' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async edit(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: EditReportDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const cmd: EditReportCommand = { reportId };
    if (dto.note !== undefined) cmd.note = dto.note;
    if (dto.priority !== undefined) cmd.priority = dto.priority;

    const result = await this.editReport.execute(cmd);
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
  }

  /** Discard a report during triage. Requires a reason; recorded in the audit trail. */
  @Post('reports/:reportId/discard')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('report:triage')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Descartar un reporte durante el triaje (coordinador). Requiere un motivo; se registra en la trazabilidad.',
  })
  @ApiParam({ name: 'reportId', type: String })
  @ApiResponse({ status: 204, description: 'Report discarded (closed)' })
  @ApiResponse({
    status: 400,
    description: 'Missing reason or report already closed',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Coordinator role required' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async discard(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: DiscardReportDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const result = await this.discardReport.execute({ reportId });
    setAuditContext(req, {
      reason: dto.reason,
      changes: result.changes,
      targetStatus: result.targetStatus,
      emergencyId: result.emergencyId,
    });
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
