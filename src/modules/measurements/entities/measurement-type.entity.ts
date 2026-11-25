import { Field, Int, ObjectType } from "@nestjs/graphql";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@ObjectType({
  description: "Master catalog of supported health and body measurements",
})
@Entity({ name: "measurement_types" })
export class MeasurementType {
  @Field(() => Int)
  @PrimaryGeneratedColumn({ type: "smallint" })
  id!: number;

  @Field(() => String)
  @Column({ name: "code", type: "varchar", length: 50, unique: true })
  code!: string;

  @Field(() => String)
  @Column({ name: "name", type: "varchar", length: 100 })
  name!: string;

  @Field(() => String)
  @Column({ name: "category", type: "varchar", length: 50 })
  category!: string;

  @Field(() => String)
  @Column({ name: "default_unit", type: "varchar", length: 20 })
  defaultUnit!: string;

  @Field(() => String, { nullable: true })
  @Column({ name: "description", type: "text", nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;
}
