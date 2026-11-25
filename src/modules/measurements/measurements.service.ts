import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/decorators/roles.decorator";
import { PaginatedResult } from "../../common/pagination/paginated.type";
import { PaginationArgs } from "../../common/pagination/pagination.args";
import { User } from "../users/entities/user.entity";
import { AccountStatus } from "../users/enums/account-status.enum";
import { CreateMeasurementTypeInput } from "./dto/create-measurement-type.input";
import { CreateUserMeasurementInput } from "./dto/create-user-measurement.input";
import { UpdateMeasurementTypeInput } from "./dto/update-measurement-type.input";
import { UpdateUserMeasurementInput } from "./dto/update-user-measurement.input";
import { MeasurementType } from "./entities/measurement-type.entity";
import { UserMeasurement } from "./entities/user-measurement.entity";
import { MeasurementSource } from "./enums/measurement-source.enum";

@Injectable()
export class MeasurementsService {
  constructor(
    @InjectRepository(MeasurementType)
    private readonly typesRepository: Repository<MeasurementType>,
    @InjectRepository(UserMeasurement)
    private readonly readingsRepository: Repository<UserMeasurement>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private async ensureActiveActor(actor: AuthenticatedUser): Promise<void> {
    const isActive = await this.usersRepository.exists({
      where: { id: actor.id, status: AccountStatus.ACTIVE },
    });
    if (!isActive) {
      throw new ForbiddenException("Active account required");
    }
  }

  private async ensureAdmin(actor: AuthenticatedUser): Promise<void> {
    await this.ensureActiveActor(actor);
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Admin required");
    }
  }

  async listTypes(
    actor: AuthenticatedUser,
    pagination: PaginationArgs,
  ): Promise<PaginatedResult<MeasurementType>> {
    await this.ensureActiveActor(actor);
    const where = actor.role === UserRole.ADMIN ? {} : { isActive: true };
    const [items, total] = await this.typesRepository.findAndCount({
      where,
      order: { id: "ASC" },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return {
      items,
      total,
      hasMore: pagination.offset + items.length < total,
    };
  }

  async getType(
    actor: AuthenticatedUser,
    id: number,
  ): Promise<MeasurementType> {
    await this.ensureActiveActor(actor);
    if (!Number.isInteger(id) || id < 1 || id > 32767) {
      throw new BadRequestException("Invalid measurement type ID");
    }

    const where =
      actor.role === UserRole.ADMIN ? { id } : { id, isActive: true };
    const measurementType = await this.typesRepository.findOneBy(where);
    if (!measurementType) {
      throw new NotFoundException("Measurement type not found");
    }
    return measurementType;
  }

  private async saveType(
    measurementType: MeasurementType,
  ): Promise<MeasurementType> {
    try {
      return await this.typesRepository.save(measurementType);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new ConflictException("Measurement type code already exists");
      }
      throw error;
    }
  }

  async createType(
    actor: AuthenticatedUser,
    input: CreateMeasurementTypeInput,
  ): Promise<MeasurementType> {
    await this.ensureAdmin(actor);
    const measurementType = this.typesRepository.create(input);
    return this.saveType(measurementType);
  }

  async updateType(
    actor: AuthenticatedUser,
    id: number,
    input: UpdateMeasurementTypeInput,
  ): Promise<MeasurementType> {
    await this.ensureAdmin(actor);
    const measurementType = await this.getType(actor, id);

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        (measurementType as unknown as Record<string, unknown>)[key] = value;
      }
    }

    return this.saveType(measurementType);
  }

  async deleteType(actor: AuthenticatedUser, id: number): Promise<boolean> {
    await this.updateType(actor, id, { isActive: false });
    return true;
  }

  async listReadings(
    actor: AuthenticatedUser,
    pagination: PaginationArgs,
  ): Promise<PaginatedResult<UserMeasurement>> {
    await this.ensureActiveActor(actor);
    const [items, total] = await this.readingsRepository.findAndCount({
      where: { userId: actor.id },
      relations: { measurementType: true },
      order: { measuredAt: "DESC", id: "ASC" },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return {
      items,
      total,
      hasMore: pagination.offset + items.length < total,
    };
  }

  async getReading(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<UserMeasurement> {
    await this.ensureActiveActor(actor);
    const reading = await this.readingsRepository.findOne({
      where: { id, userId: actor.id },
      relations: { measurementType: true },
    });
    if (!reading) {
      throw new NotFoundException("Measurement not found");
    }
    return reading;
  }

  async createReading(
    actor: AuthenticatedUser,
    input: CreateUserMeasurementInput,
  ): Promise<UserMeasurement> {
    await this.ensureActiveActor(actor);

    const source = input.source ?? MeasurementSource.USER;
    if (source !== MeasurementSource.USER && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Source requires privileged ingestion");
    }

    const measurementType = await this.typesRepository.findOneBy({
      id: input.measurementTypeId,
    });
    if (!measurementType) {
      throw new NotFoundException("Measurement type not found");
    }
    if (!measurementType.isActive) {
      throw new BadRequestException("Measurement type is inactive");
    }

    // Provisional business rule: default to measurementType.defaultUnit when unit is omitted.
    const unit = input.unit ?? measurementType.defaultUnit;

    const reading = this.readingsRepository.create({
      measurementTypeId: input.measurementTypeId,
      value: input.value,
      unit,
      measuredAt: input.measuredAt,
      source,
      notes: input.notes ?? null,
      userId: actor.id,
      recordedByUserId: actor.id,
    });

    const saved = await this.readingsRepository.save(reading);
    return this.getReading(actor, saved.id);
  }

  async updateReading(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateUserMeasurementInput,
  ): Promise<UserMeasurement> {
    await this.getReading(actor, id);
    if (input.notes !== undefined) {
      await this.readingsRepository.update(
        { id, userId: actor.id },
        { notes: input.notes },
      );
    }
    return this.getReading(actor, id);
  }

  async deleteReading(actor: AuthenticatedUser, id: string): Promise<boolean> {
    await this.getReading(actor, id);
    await this.readingsRepository.softDelete({ id, userId: actor.id });
    return true;
  }
}
