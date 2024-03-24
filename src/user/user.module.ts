import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KbEmbeddingsPg } from '../common/entity/kbEmbeddings.entity';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ApikeyController } from './apikey/apikey.controller';
import { ApikeyService } from './apikey/apikey.service';
import { UsersController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MongoModule,
    forwardRef(() => SubscriptionModule),
    // TODO: Understand why TypeOrmModule.forFeature is needed here. user.service was failing without it.
    TypeOrmModule.forFeature([KbEmbeddingsPg]),
  ],
  controllers: [UsersController, ApikeyController],
  providers: [UserService, ApikeyService],
  exports: [UserService],
})
export class UserModule {}
