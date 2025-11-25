import { Injectable } from '@nestjs/common';
import { AbilityBuilder } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { DbService } from '@/db/db.service.js';
import { AppAbility, AppActions, AppSubjects } from './ability.types.js';

@Injectable()
export class AbilityFactory {
  constructor(private readonly db: DbService) {}

  private registerPermissions(
    can: AbilityBuilder<AppAbility>['can'],
    permissions: Array<{ action: string; subject: string }>,
  ) {
    const uniqueRules = new Set<string>();

    permissions.forEach(permission => {
      const action = permission.action as AppActions;
      const subject = permission.subject as AppSubjects;
      const ruleKey = `${action}:${subject}`;

      if (uniqueRules.has(ruleKey)) {
        return;
      }

      uniqueRules.add(ruleKey);
      can(action, subject);
    });
  }

  async createForUser(userId: number): Promise<AppAbility> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        permissions: {
          include: { permission: true },
        },
      },
    });

    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    if (!user) {
      return build();
    }

    const rolePermissions = user.roles.flatMap(userRole =>
      userRole.role.rolePermissions.map(({ permission }) => permission),
    );

    const directPermissions = user.permissions.map(({ permission }) => permission);

    const isSuperAdmin = user.roles.some(({ role }) => role.name === 'Super Admin');

    if (isSuperAdmin) {
      can('manage', 'all');
      return build();
    }

    this.registerPermissions(can, [...rolePermissions, ...directPermissions]);

    return build();
  }
}
