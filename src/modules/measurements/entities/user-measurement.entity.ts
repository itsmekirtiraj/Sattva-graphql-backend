import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { MeasurementSource } from "../enums/measurement-source.enum";
import { MeasurementType } from "./measurement-type.entity";

@ObjectType({
  description: "Historical user health or body measurement reading",
})
@Entity({ name: "user_measurements" })
@Index(["userId", "measurementTypeId", "measuredAt"])
@Index(["userId", "measuredAt"])
export class UserMeasurement {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => ID)
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Field(() => Int)
  @Column({ name: "measurement_type_id", type: "smallint" })
  measurementTypeId!: number;

  @Field(() => MeasurementType)
  @ManyToOne(() => MeasurementType, { nullable: false })
  @JoinColumn({ name: "measurement_type_id" })
  measurementType!: MeasurementType;

  @Field(() => String, {
    description:
      "Exact non-negative decimal value, up to three fractional digits",
  })
  @Column({ name: "value", type: "decimal", precision: 10, scale: 3 })
  value!: string;

  @Field(() => String)
  @Column({ name: "unit", type: "varchar", length: 20 })
  unit!: string;

  @Field(() => Date)
  @Column({ name: "measured_at", type: "timestamp" })
  measuredAt!: Date;

  @Field(() => MeasurementSource)
  @Column({
    name: "source",
    type: "enum",
    enum: MeasurementSource,
    enumName: "measurement_source",
    default: MeasurementSource.USER,
  })
  source!: MeasurementSource;

  @Field(() => ID)
  @Column({ name: "recorded_by_user_id", type: "uuid" })
  recordedByUserId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "recorded_by_user_id" })
  recordedByUser!: User;

  @Field(() => String, { nullable: true })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string | null;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt?: Date | null;
}
