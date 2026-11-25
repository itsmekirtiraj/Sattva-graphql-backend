import { Field, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Trim } from "../../../common/decorators/transform.decorators";

@InputType({ description: "Input for creating a measurement type" })
export class CreateMeasurementTypeInput {
  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultUnit!: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  isActive: boolean = true;
}
