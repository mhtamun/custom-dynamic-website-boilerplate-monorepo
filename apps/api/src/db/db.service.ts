import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';


@Injectable()
export class DbService extends PrismaClient {
  constructor(readonly config: ConfigService) {
    const connectionString = config.get('POSTGRES_DATABASE_URL');
    console.log(connectionString);
    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }
}
