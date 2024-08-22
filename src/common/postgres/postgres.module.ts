import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/appConfig.service';
import { DataSource } from 'typeorm';

/**
 * Represents a module for interacting with PostgreSQL database.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: async (appConfig: AppConfigService) => ({
        type: 'postgres',
        host: appConfig.get('postgresHost'),
        port: appConfig.get('postgresPort'),
        username: appConfig.get('postgresUser'),
        password: appConfig.get('postgresPassword'),
        database: appConfig.get('postgresDbName'),
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: appConfig.isDev, // Auto-create tables in development, DO NOT use in production
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class PostgresModule implements OnModuleInit {
  private readonly logger: Logger;

  constructor(private dataSource: DataSource) {
    this.logger = new Logger(PostgresModule.name);
  }

  /**
   * This method is called automatically when the module is initialized.
   * @returns A promise that resolves when the initialization is complete.
   */
  async onModuleInit(): Promise<void> {
    await this.initializePgVector();
  }

  /**
   * Initializes the pgvector extension in the PostgreSQL database.
   * This method creates the 'vector' extension if it doesn't already exist.
   */
  private async initializePgVector() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      this.logger.log('pgvector extension initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize pgvector extension:', error);
    }
  }
}
