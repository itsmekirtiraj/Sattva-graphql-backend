import { Field, InputType, Int } from "@nestjs/graphql";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Trim } from "../../../common/decorators/transform.decorators";
import { MeasurementSource } from "../enums/measurement-source.enum";

@InputType({ description: "Input for recording a new user measurement" })
export class CreateUserMeasurementInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(32767)
  measurementTypeId!: number;

  /**
   * Provisional business rule: non-negative values (including 0) respecting decimal(10,3).
   */
  @Field(() => String, {
    description:
      "Non-negative decimal value up to 7 integer digits and 3 fractional digits",
  })
  @Trim()
  @IsString()
  @Matches(/^\d{1,7}(\.\d{1,3})?$/, {
    message:
      "value must be a non-negative decimal with up to 7 integer digits and 3 fractional digits",
  })
  value!: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Optional unit; defaults to the measurement type defaultUnit when omitted",
  })
  @Trim()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string | null;

  @Field(() => Date)
  @IsDate()
  measuredAt!: Date;

  @Field(() => MeasurementSource, { defaultValue: MeasurementSource.USER })
  @IsEnum(MeasurementSource)
  source: MeasurementSource = MeasurementSource.USER;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
