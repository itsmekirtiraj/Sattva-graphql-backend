import { ParseUUIDPipe, UseGuards } from "@nestjs/common";
import {
  Args,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "@nestjs/graphql";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../../common/decorators/current-user.decorator";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Paginated } from "../../common/pagination/paginated.type";
import { PaginationArgs } from "../../common/pagination/pagination.args";
import { CreateMeasurementTypeInput } from "./dto/create-measurement-type.input";
import { CreateUserMeasurementInput } from "./dto/create-user-measurement.input";
import { UpdateMeasurementTypeInput } from "./dto/update-measurement-type.input";
import { UpdateUserMeasurementInput } from "./dto/update-user-measurement.input";
import { MeasurementType } from "./entities/measurement-type.entity";
import { UserMeasurement } from "./entities/user-measurement.entity";
import { MeasurementSource } from "./enums/measurement-source.enum";
import { MeasurementsService } from "./measurements.service";

@ObjectType()
class PaginatedMeasurementTypes extends Paginated(MeasurementType) {}

@ObjectType()
class PaginatedUserMeasurements extends Paginated(UserMeasurement) {}

@Resolver()
export class MeasurementsResolver {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Query(() => [MeasurementSource], {
    description: "List supported measurement sources",
  })
  measurementSources(): MeasurementSource[] {
    return Object.values(MeasurementSource);
  }

  @Query(() => PaginatedMeasurementTypes, {
    description: "List measurement types with pagination",
  })
  measurementTypes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args() pagination: PaginationArgs,
  ): Promise<PaginatedMeasurementTypes> {
    return this.measurementsService.listTypes(currentUser, pagination);
  }

  @Query(() => MeasurementType, {
    description: "Get a single measurement type by ID",
  })
  measurementType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => Int }) id: number,
  ): Promise<MeasurementType> {
    return this.measurementsService.getType(currentUser, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => MeasurementType, {
    description: "Create a new measurement type (Admin only)",
  })
  createMeasurementType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("input") input: CreateMeasurementTypeInput,
  ): Promise<MeasurementType> {
    return this.measurementsService.createType(currentUser, input);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => MeasurementType, {
    description: "Update an existing measurement type (Admin only)",
  })
  updateMeasurementType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => Int }) id: number,
    @Args("input") input: UpdateMeasurementTypeInput,
  ): Promise<MeasurementType> {
    return this.measurementsService.updateType(currentUser, id, input);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Boolean, {
    description: "Deactivate a measurement type (Admin only)",
  })
  deleteMeasurementType(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => Int }) id: number,
  ): Promise<boolean> {
    return this.measurementsService.deleteType(currentUser, id);
  }

  @Query(() => PaginatedUserMeasurements, {
    description: "List measurements for the authenticated user",
  })
  userMeasurements(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args() pagination: PaginationArgs,
  ): Promise<PaginatedUserMeasurements> {
    return this.measurementsService.listReadings(currentUser, pagination);
  }

  @Query(() => UserMeasurement, {
    description: "Get a single measurement owned by the authenticated user",
  })
  userMeasurement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<UserMeasurement> {
    return this.measurementsService.getReading(currentUser, id);
  }

  @Mutation(() => UserMeasurement, {
    description: "Record a new measurement for the authenticated user",
  })
  createUserMeasurement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("input") input: CreateUserMeasurementInput,
  ): Promise<UserMeasurement> {
    return this.measurementsService.createReading(currentUser, input);
  }

  @Mutation(() => UserMeasurement, {
    description:
      "Update notes on a measurement owned by the authenticated user",
  })
  updateUserMeasurement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @Args("input") input: UpdateUserMeasurementInput,
  ): Promise<UserMeasurement> {
    return this.measurementsService.updateReading(currentUser, id, input);
  }

  @Mutation(() => Boolean, {
    description: "Soft-delete a measurement owned by the authenticated user",
  })
  deleteUserMeasurement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.measurementsService.deleteReading(currentUser, id);
  }
}
