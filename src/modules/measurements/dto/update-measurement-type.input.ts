import { Field, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Trim } from "../../../common/decorators/transform.decorators";

@InputType({ description: "Input for updating a measurement type" })
export class UpdateMeasurementTypeInput {
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultUnit?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => Boolean, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
