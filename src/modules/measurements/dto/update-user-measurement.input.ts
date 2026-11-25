import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { Trim } from "../../../common/decorators/transform.decorators";

@InputType({
  description: "Input for updating notes on an existing user measurement",
})
export class UpdateUserMeasurementInput {
  @Field(() => String, { nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
