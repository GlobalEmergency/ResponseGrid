import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateTask } from '../../application/create-task';
import { GetTasks, TaskView } from '../../application/get-tasks';
import { AssignVolunteerToTask } from '../../application/assign-volunteer-to-task';
import { UnassignVolunteerFromTask } from '../../application/unassign-volunteer-from-task';
import { CheckInVolunteer } from '../../application/check-in-volunteer';
import { CheckOutVolunteer } from '../../application/check-out-volunteer';
import { CompleteTask } from '../../application/complete-task';
import { CancelTask } from '../../application/cancel-task';
import { GetMyTasks } from '../../application/get-my-tasks';
import {
  VOLUNTEER_REPOSITORY,
  type VolunteerRepository,
} from '../../domain/ports/volunteer.repository';
import {
  TASK_EMERGENCY_LOOKUP,
  type TaskEmergencyLookup,
} from '../../../identity/domain/ports/task-emergency-lookup';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports/membership.repository';
import { UserId } from '../../../identity/domain/user-id';
import { Role } from '../../../identity/domain/role';
import {
  JwtAuthGuard,
  AuthenticatedUser,
} from '../../../identity/infrastructure/http/jwt-auth.guard';
import { PermissionGuard } from '../../../identity/infrastructure/http/permission.guard';
import { RequirePermission } from '../../../identity/infrastructure/http/require-permission.decorator';
import {
  CreateTaskDto,
  AssignVolunteerDto,
  GetTasksQueryDto,
} from './task-dto';
import {
  CreateTaskResponseDto,
  TaskViewDto,
  MyTaskViewDto,
} from './task-response.dto';
import { TaskDomainExceptionFilter } from './task-domain-exception.filter';
import { TaskStatus } from '../../domain/task';

@ApiTags('tasks')
@Controller()
@UseFilters(TaskDomainExceptionFilter)
export class TasksController {
  constructor(
    private readonly createTaskUc: CreateTask,
    private readonly getTasksUc: GetTasks,
    private readonly assignUc: AssignVolunteerToTask,
    private readonly unassignUc: UnassignVolunteerFromTask,
    private readonly checkInUc: CheckInVolunteer,
    private readonly checkOutUc: CheckOutVolunteer,
    private readonly completeUc: CompleteTask,
    private readonly cancelUc: CancelTask,
    private readonly getMyTasksUc: GetMyTasks,
    @Inject(VOLUNTEER_REPOSITORY)
    private readonly volunteerRepo: VolunteerRepository,
    @Inject(TASK_EMERGENCY_LOOKUP)
    private readonly taskLookup: TaskEmergencyLookup,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: MembershipRepository,
  ) {}

  // ─── POST /emergencies/:emergencyId/tasks ─────────────────────────────────

  @Post('emergencies/:emergencyId/tasks')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a task for an emergency (coordinator only)',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Task created',
    type: CreateTaskResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid body or UUID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async createTask(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<CreateTaskResponseDto> {
    return this.createTaskUc.execute({
      emergencyId,
      title: dto.title,
      description: dto.description,
      location: dto.location ?? null,
      requiredSkill: dto.requiredSkill ?? null,
      createdByUserId: req.user!.id,
    });
  }

  // ─── GET /emergencies/:emergencyId/tasks ──────────────────────────────────

  @Get('emergencies/:emergencyId/tasks')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tasks for an emergency (coordinator only)' })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiOkResponse({ description: 'Task list', type: TaskViewDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async getTasks(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() query: GetTasksQueryDto,
  ): Promise<TaskViewDto[]> {
    const views = await this.getTasksUc.execute({
      emergencyId,
      ...(query.status !== undefined ? { status: query.status } : {}),
    });
    return views.map((v) => this.mapTaskView(v));
  }

  // ─── GET /emergencies/:emergencyId/tasks/mine ─────────────────────────────

  @Get('emergencies/:emergencyId/tasks/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tasks assigned to the authenticated volunteer',
  })
  @ApiParam({ name: 'emergencyId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Tasks assigned to me',
    type: MyTaskViewDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async getMyTasks(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<MyTaskViewDto[]> {
    const volunteer = await this.volunteerRepo.findByUserAndEmergency(
      req.user!.id,
      emergencyId,
    );
    if (!volunteer) return [];

    const views = await this.getMyTasksUc.execute({
      emergencyId,
      volunteerId: volunteer.id.value,
    });
    return views.map((v) => ({
      ...this.mapTaskView(v),
      myAssignmentStatus: v.myAssignmentStatus,
    }));
  }

  // ─── POST /tasks/:taskId/assign ───────────────────────────────────────────

  @Post('tasks/:taskId/assign')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a volunteer to a task (coordinator only)' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Volunteer assigned' })
  @ApiNotFoundResponse({ description: 'Task or volunteer not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Volunteer already assigned, wrong emergency, or task closed',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async assignVolunteer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignVolunteerDto,
  ): Promise<void> {
    await this.assignUc.execute({ taskId, volunteerId: dto.volunteerId });
  }

  // ─── POST /tasks/:taskId/unassign ─────────────────────────────────────────

  @Post('tasks/:taskId/unassign')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:assign')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unassign a volunteer from a task (coordinator only)',
  })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Volunteer unassigned' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Volunteer not assigned' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async unassignVolunteer(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignVolunteerDto,
  ): Promise<void> {
    await this.unassignUc.execute({ taskId, volunteerId: dto.volunteerId });
  }

  // ─── POST /tasks/:taskId/check-in ─────────────────────────────────────────

  @Post('tasks/:taskId/check-in')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Check in a volunteer to a task (volunteer themselves or coordinator)',
  })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Checked in' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Not assigned or already checked in',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the assigned volunteer or a coordinator',
  })
  async checkIn(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignVolunteerDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const isCoordinator = await this.isCoordinatorOfTask(req.user!, taskId);
    const result = await this.checkInUc.execute({
      taskId,
      volunteerId: dto.volunteerId,
      requesterUserId: req.user!.id,
      isCoordinator,
    });
    if (result && 'forbidden' in result) {
      throw new ForbiddenException(
        'Only the assigned volunteer or a coordinator can check in',
      );
    }
  }

  // ─── POST /tasks/:taskId/check-out ────────────────────────────────────────

  @Post('tasks/:taskId/check-out')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Check out a volunteer from a task (volunteer themselves or coordinator)',
  })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Checked out' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Not checked in' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Only the assigned volunteer or a coordinator',
  })
  async checkOut(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignVolunteerDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const isCoordinator = await this.isCoordinatorOfTask(req.user!, taskId);
    const result = await this.checkOutUc.execute({
      taskId,
      volunteerId: dto.volunteerId,
      requesterUserId: req.user!.id,
      isCoordinator,
    });
    if (result && 'forbidden' in result) {
      throw new ForbiddenException(
        'Only the assigned volunteer or a coordinator can check out',
      );
    }
  }

  // ─── POST /tasks/:taskId/complete ─────────────────────────────────────────

  @Post('tasks/:taskId/complete')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a task as completed (coordinator only)' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Task completed' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Task already cancelled' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async completeTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    await this.completeUc.execute({ taskId });
  }

  // ─── POST /tasks/:taskId/cancel ───────────────────────────────────────────

  @Post('tasks/:taskId/cancel')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('task:assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a task (coordinator only)' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Task cancelled' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({ description: 'Task already completed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Coordinator role required' })
  async cancelTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    await this.cancelUc.execute({ taskId });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private mapTaskView(v: TaskView): TaskViewDto {
    const location =
      v.locationAddress !== null &&
      v.locationLatitude !== null &&
      v.locationLongitude !== null
        ? {
            address: v.locationAddress,
            latitude: v.locationLatitude,
            longitude: v.locationLongitude,
          }
        : null;
    return {
      id: v.id,
      emergencyId: v.emergencyId,
      title: v.title,
      description: v.description,
      location,
      requiredSkill: v.requiredSkill,
      status: v.status,
      createdByUserId: v.createdByUserId,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      assignments: v.assignments.map((a) => ({
        ...a,
        volunteerName: a.volunteerName ?? null,
        checkedInAt: a.checkedInAt ?? null,
        checkedOutAt: a.checkedOutAt ?? null,
      })),
    };
  }

  /**
   * Determines if the authenticated user is a coordinator for the emergency
   * that owns the given task. Uses TASK_EMERGENCY_LOOKUP + MEMBERSHIP_REPOSITORY
   * for precise per-task authorization.
   */
  private async isCoordinatorOfTask(
    user: AuthenticatedUser,
    taskId: string,
  ): Promise<boolean> {
    if (user.isAdmin) return true;
    const emergencyId = await this.taskLookup.findEmergencyId(taskId);
    if (!emergencyId) return false;
    return this.membershipRepo.hasRole(
      UserId.fromString(user.id),
      emergencyId,
      Role.Coordinator,
    );
  }
}
