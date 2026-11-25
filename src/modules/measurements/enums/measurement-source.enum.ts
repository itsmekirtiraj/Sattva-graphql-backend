import { registerEnumType } from "@nestjs/graphql";

export enum MeasurementSource {
  USER = "user",
  DIETITIAN = "dietitian",
  DEVICE = "device",
  IMPORTED = "imported",
  AI_ESTIMATE = "ai_estimate",
}

registerEnumType(MeasurementSource, {
  name: "MeasurementSource",
  description: "Origin of a recorded user measurement",
});
