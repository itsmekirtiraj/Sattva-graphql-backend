import { Module } from '@nestjs/common';
import { UsersModule } from '../../modules/users/users.module';
import { DataloadersService } from './dataloaders.service';

@Module({
  imports: [UsersModule],
  providers: [DataloadersService],
  exports: [DataloadersService],
})
export class DataloadersModule {}

