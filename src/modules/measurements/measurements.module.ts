import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { MeasurementType } from "./entities/measurement-type.entity";
import { UserMeasurement } from "./entities/user-measurement.entity";
import { MeasurementsResolver } from "./measurements.resolver";
import { MeasurementsService } from "./measurements.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, MeasurementType, UserMeasurement])],
  providers: [MeasurementsResolver, MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
