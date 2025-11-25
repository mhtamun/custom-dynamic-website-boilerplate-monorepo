import { DbService } from '@/db/db.service.js';
import { Inject, Injectable } from '@nestjs/common';

import { CreateRoleDto, UpdateRoleDto } from './dto/index.js';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface.js';
import { Prisma } from '@prisma/client';

type RoleWithRelations = Prisma.RoleGetPayload<{
  include: {
    rolePermissions: { include: { permission: true } };
    userRoles: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class RoleService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  private mapRole(role: RoleWithRelations) {
    const { rolePermissions, userRoles, ...rest } = role;

    return {
      ...rest,
      permissions: rolePermissions.map(({ permission }) => permission),
      users: userRoles.map(({ user }) => user),
    };
  }

  async save(dto: CreateRoleDto): Promise<ServiceResult> {
    const data = await this.db.role.create({
      data: dto,
    });

    return createSuccessResult(data, 'Role created successfully');
  }

  async getAll(): Promise<ServiceResult> {
    const roles = await this.db.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const data = roles.map(role => this.mapRole(role));

    return createSuccessResult(data, 'Roles retrieved successfully');
  }

  async getById(id: number): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid role ID' },
        'Invalid role ID provided',
      );
    }

    const role = await this.db.role.findFirst({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      return createErrorResult({ name: 'badRequest', message: 'Role not found' }, 'Role not found');
    }

    return createSuccessResult(this.mapRole(role), 'Role retrieved successfully');
  }

  async editById(id: number, dto: UpdateRoleDto): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid role ID' },
        'Invalid role ID provided',
      );
    }

    const data = await this.db.role.update({
      where: { id },
      data: dto,
    });

    return createSuccessResult(data, 'Role updated successfully');
  }

  async removeById(id: number): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid role ID' },
        'Invalid role ID provided',
      );
    }

    const data = await this.db.role.delete({
      where: { id },
    });

    return createSuccessResult(data, 'Role deleted successfully');
  }

  async syncPermissions(id: number, permissionIds: number[]): Promise<ServiceResult> {
    if (!id || id <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Invalid role ID' },
        'Invalid role ID provided',
      );
    }

    const role = await this.db.role.findUnique({ where: { id } });

    if (!role) {
      return createErrorResult({ name: 'badRequest', message: 'Role not found' }, 'Role not found');
    }

    const normalizedPermissionIds = Array.from(new Set(permissionIds));

    const permissions = await this.db.permission.findMany({
      where: { id: { in: normalizedPermissionIds } },
      select: { id: true },
    });

    if (permissions.length !== normalizedPermissionIds.length) {
      const existingPermissionIds = permissions.map(permission => permission.id);
      const missingPermissionIds = normalizedPermissionIds.filter(
        permissionId => !existingPermissionIds.includes(permissionId),
      );

      return createErrorResult(
        {
          name: 'badRequest',
          message: `Invalid permission IDs: ${missingPermissionIds.join(', ')}`,
        },
        'Invalid permission selection',
      );
    }

    await this.db.$transaction(async tx => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: id,
          permissionId: { notIn: normalizedPermissionIds },
        },
      });

      await Promise.all(
        normalizedPermissionIds.map(permissionId =>
          tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: id,
                permissionId,
              },
            },
            update: {},
            create: {
              roleId: id,
              permissionId,
            },
          }),
        ),
      );
    });

    const updatedRole = await this.db.role.findFirst({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return createSuccessResult(this.mapRole(updatedRole), 'Role permissions updated successfully');
  }
}
