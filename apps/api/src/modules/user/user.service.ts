import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { DbService } from '@/db/db.service';
import { HashService } from '@/util/hash.service';
import { NotificationService } from '@/util/notification.service';
import { TemplateService } from '@/util/template.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Gender, Prisma, UserStatus } from '@prisma/client';
import { SignInUserDto, UserCreateDto, UserUpdateDto } from './dto/index';

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    roles: { include: { role: true } };
    permissions: { include: { permission: true } };
  };
}>;

@Injectable()
export class UserService {
  @Inject()
  private readonly hash: HashService;

  @Inject()
  private readonly jwt: JwtService;

  @Inject()
  private readonly config: ConfigService;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly templateService: TemplateService;

  @Inject(DbService)
  private readonly db: DbService;

  private mapToProfile(user: UserWithRelations) {
    const { roles, permissions, ...rest } = user;

    const roleList = roles.map(({ role }) => role);
    const directPermissions = permissions.map(({ permission }) => permission);

    return {
      ...rest,
      roles: roleList,
      primaryRole: roleList[0] ?? null,
      directPermissions,
    };
  }

  private async getUserProfile(id: number) {
    const user = await this.db.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } },
      },
    });

    return user ? this.mapToProfile(user) : null;
  }

  private async syncUserRoles(userId: number, roleIds: number[]) {
    const uniqueRoleIds = Array.from(new Set(roleIds));

    await this.db.$transaction(async tx => {
      await tx.userRole.deleteMany({
        where: {
          userId,
          roleId: { notIn: uniqueRoleIds },
        },
      });

      await Promise.all(
        uniqueRoleIds.map(roleId =>
          tx.userRole.upsert({
            where: {
              userId_roleId: {
                userId,
                roleId,
              },
            },
            update: {},
            create: {
              userId,
              roleId,
            },
          }),
        ),
      );
    });
  }

  private async syncUserPermissions(userId: number, permissionIds: number[]) {
    const uniquePermissionIds = Array.from(new Set(permissionIds));

    await this.db.$transaction(async tx => {
      await tx.userPermission.deleteMany({
        where: {
          userId,
          permissionId: { notIn: uniquePermissionIds },
        },
      });

      await Promise.all(
        uniquePermissionIds.map(permissionId =>
          tx.userPermission.upsert({
            where: {
              userId_permissionId: {
                userId,
                permissionId,
              },
            },
            update: {},
            create: {
              userId,
              permissionId,
            },
          }),
        ),
      );
    });
  }

  private async validateRoleIds(roleIds: number[]) {
    const normalizedRoleIds = Array.from(new Set(roleIds));

    if (normalizedRoleIds.length === 0) {
      return { values: normalizedRoleIds };
    }

    const roles = await this.db.role.findMany({
      where: {
        id: { in: normalizedRoleIds },
      },
      select: { id: true },
    });

    if (roles.length !== normalizedRoleIds.length) {
      const existingRoleIds = roles.map(role => role.id);
      const missingRoleIds = normalizedRoleIds.filter(roleId => !existingRoleIds.includes(roleId));

      return {
        error: createErrorResult(
          { name: 'badRequest', message: `Invalid role IDs: ${missingRoleIds.join(', ')}` },
          'Invalid role selection',
        ),
      };
    }

    return { values: normalizedRoleIds };
  }

  private async validatePermissionIds(permissionIds: number[]) {
    const normalizedPermissionIds = Array.from(new Set(permissionIds));

    if (normalizedPermissionIds.length === 0) {
      return { values: normalizedPermissionIds };
    }

    const permissions = await this.db.permission.findMany({
      where: {
        id: { in: normalizedPermissionIds },
      },
      select: { id: true },
    });

    if (permissions.length !== normalizedPermissionIds.length) {
      const existingPermissionIds = permissions.map(permission => permission.id);
      const missingPermissionIds = normalizedPermissionIds.filter(
        permissionId => !existingPermissionIds.includes(permissionId),
      );

      return {
        error: createErrorResult(
          {
            name: 'badRequest',
            message: `Invalid permission IDs: ${missingPermissionIds.join(', ')}`,
          },
          'Invalid permission selection',
        ),
      };
    }

    return { values: normalizedPermissionIds };
  }

  signToken(name: string, email: string): Promise<string> {
    const payload = {
      name,
      email,
    };

    return this.jwt.signAsync(payload, {
      issuer: this.config.get('JWT_ISSUER'),
      subject: email,
      expiresIn: '7d',
      secret: this.config.get('JWT_SECRET'),
    });
  }

  async signIn(dto: SignInUserDto): Promise<ServiceResult> {
    if (!dto.email || !dto.password) {
      return createErrorResult(
        { name: 'badRequest', message: 'Email and password are required' },
        'Email and password are required',
      );
    }

    const user = await this.db.user.findUnique({
      select: { id: true, name: true, email: true, password: true },
      where: { email: dto.email, status: 'ACTIVE' },
    });

    if (!user) {
      return createErrorResult(
        { name: 'unauthorized', message: 'Unfortunately, you entered credentials are incorrect!' },
        'Invalid email or password',
      );
    }

    const isPasswordMatched = await this.hash.matchHash(dto.password, user.password);

    if (!isPasswordMatched) {
      return createErrorResult(
        { name: 'unauthorized', message: 'Unfortunately, you entered credentials are incorrect!' },
        'Invalid email or password',
      );
    }

    const token = await this.signToken(user.name, user.email);

    const data = {
      access_type: 'Bearer',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

    return createSuccessResult(data, 'Hi, you are successfully signed in.');
  }

  async save(dto: UserCreateDto): Promise<ServiceResult> {
    if (!dto.email || !dto.password || !dto.name) {
      return createErrorResult(
        { name: 'badRequest', message: 'Name, email, and password are required' },
        'Name, email, and password are required',
      );
    }

    const { error, values: normalizedRoleIds } = await this.validateRoleIds(dto.roleIds);

    if (error) {
      return error;
    }

    if (!normalizedRoleIds.length) {
      return createErrorResult(
        { name: 'badRequest', message: 'At least one role is required' },
        'At least one role is required',
      );
    }

    const hashedPassword = await this.hash.generateHash(dto.password);

    const user = await this.db.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        nid: dto.nid,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender as Gender | undefined,
        address: dto.address,
        status: 'ACTIVE' as UserStatus,
      },
    });

    await this.syncUserRoles(user.id, normalizedRoleIds);

    const data = await this.getUserProfile(user.id);

    // Send email notification (non-blocking, let errors bubble if critical)
    try {
      const emailHtml = this.templateService.renderTemplate('user-creation-credentials', {
        userName: dto.name,
        userEmail: dto.email,
        userPassword: dto.password,
      });

      void this.notificationService.sendEmail({
        to: user.email,
        subject: 'User Creation Success',
        html: emailHtml,
      });
    } catch (error) {
      console.error('UserService -> save -> email sending error:', error);
      // Continue execution even if email fails
    }

    return createSuccessResult(data, 'User created successfully');
  }

  async getAll(): Promise<ServiceResult> {
    const users = await this.db.user.findMany({
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } },
      },
    });

    const data = users.map(user => this.mapToProfile(user));

    return createSuccessResult(data, 'Users retrieved successfully');
  }

  async getById(id: number): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid user ID' },
        'Invalid user ID provided',
      );
    }

    const data = await this.getUserProfile(id);

    if (!data) {
      return createErrorResult({ name: 'badRequest', message: 'User not found' }, 'User not found');
    }

    return createSuccessResult(data, 'User retrieved successfully');
  }

  async editById(id: number, dto: UserUpdateDto): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid user ID' },
        'Invalid user ID provided',
      );
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.nid !== undefined) updateData.nid = dto.nid;
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) updateData.gender = dto.gender as Gender;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.status !== undefined) updateData.status = dto.status as UserStatus;

    const user = await this.db.user.update({
      where: { id },
      data: updateData,
    });

    if (dto.roleIds) {
      const { error, values } = await this.validateRoleIds(dto.roleIds);

      if (error) {
        return error;
      }

      await this.syncUserRoles(id, values);
    }

    const data = await this.getUserProfile(id);

    // Send email notification (non-blocking, let errors bubble if critical)
    try {
      const emailHtml = this.templateService.renderTemplate('user-update', {
        userName: dto.name ?? user.name,
        userPhone: dto.phone ?? user.phone,
        userNid: dto.nid ?? user.nid,
      });

      void this.notificationService.sendEmail({
        to: user.email,
        subject: 'User Information Update',
        html: emailHtml,
      });
    } catch (error) {
      console.error('UserService -> editById -> email sending error:', error);
      // Continue execution even if email fails
    }

    return createSuccessResult(data, 'User updated successfully');
  }

  async updateRoles(id: number, roleIds: number[]): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid user ID' },
        'Invalid user ID provided',
      );
    }

    const user = await this.db.user.findUnique({ where: { id } });

    if (!user) {
      return createErrorResult({ name: 'badRequest', message: 'User not found' }, 'User not found');
    }

    const { error, values } = await this.validateRoleIds(roleIds);

    if (error) {
      return error;
    }

    await this.syncUserRoles(id, values);

    const data = await this.getUserProfile(id);

    return createSuccessResult(data, 'User roles updated successfully');
  }

  async updatePermissions(id: number, permissionIds: number[]): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid user ID' },
        'Invalid user ID provided',
      );
    }

    const user = await this.db.user.findUnique({ where: { id } });

    if (!user) {
      return createErrorResult({ name: 'badRequest', message: 'User not found' }, 'User not found');
    }

    const { error, values } = await this.validatePermissionIds(permissionIds);

    if (error) {
      return error;
    }

    await this.syncUserPermissions(id, values);

    const data = await this.getUserProfile(id);

    return createSuccessResult(data, 'User permissions updated successfully');
  }

  async removeById(id: number): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid user ID' },
        'Invalid user ID provided',
      );
    }

    const user = await this.db.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });

    if (!user) {
      return createErrorResult({ name: 'badRequest', message: 'User not found' }, 'User not found');
    }

    const data = await this.db.user.delete({
      where: { id },
    });

    // Send email notification (non-blocking, let errors bubble if critical)
    try {
      const emailHtml = this.templateService.renderTemplate('user-deletion', {
        userName: user.name,
      });

      void this.notificationService.sendEmail({
        to: user.email,
        subject: 'User Account Deletion',
        html: emailHtml,
      });
    } catch (error) {
      console.error('UserService -> removeById -> email sending error:', error);
      // Continue execution even if email fails
    }

    return createSuccessResult(data, 'User deleted successfully');
  }
}
