import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType({ description: 'System role' })
@Entity({ name: 'roles' })
export class Role {
  @Field(() => Int)
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Field(() => String)
  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 100 })
  name!: string;
}
