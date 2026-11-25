import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/decorators/roles.decorator";
import { User } from "../users/entities/user.entity";
import { AccountStatus } from "../users/enums/account-status.enum";
import { CreateMeasurementTypeInput } from "./dto/create-measurement-type.input";
import { CreateUserMeasurementInput } from "./dto/create-user-measurement.input";
import { UpdateMeasurementTypeInput } from "./dto/update-measurement-type.input";
import { UpdateUserMeasurementInput } from "./dto/update-user-measurement.input";
import { MeasurementType } from "./entities/measurement-type.entity";
import { UserMeasurement } from "./entities/user-measurement.entity";
import { MeasurementSource } from "./enums/measurement-source.enum";
import { MeasurementsService } from "./measurements.service";

describe("MeasurementsService", () => {
  let service: MeasurementsService;
  let typesRepo: {
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let readingsRepo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let usersRepo: {
    exists: jest.Mock;
  };

  const userActor: AuthenticatedUser = {
    id: "11111111-1111-4111-8111-111111111111",
    phoneCountryCode: "+91",
    phoneNumber: "9876543210",
    role: UserRole.USER,
  };

  const adminActor: AuthenticatedUser = {
    id: "22222222-2222-4222-8222-222222222222",
    phoneCountryCode: "+91",
    phoneNumber: "9876543211",
    role: UserRole.ADMIN,
  };

  const sampleType: MeasurementType = {
    id: 1,
    code: "weight",
    name: "Body Weight",
    category: "body",
    defaultUnit: "kg",
    description: "Body weight measurement",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    typesRepo = {
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => entity),
    };

    readingsRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => ({ id: "reading-1", ...entity })),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    usersRepo = {
      exists: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementsService,
        { provide: getRepositoryToken(MeasurementType), useValue: typesRepo },
        {
          provide: getRepositoryToken(UserMeasurement),
          useValue: readingsRepo,
        },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get<MeasurementsService>(MeasurementsService);
  });

  describe("account & role authorization", () => {
    it("rejects inactive or missing user accounts", async () => {
      usersRepo.exists.mockResolvedValue(false);

      await expect(
        service.listTypes(userActor, { limit: 20, offset: 0 }),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepo.exists).toHaveBeenCalledWith({
        where: { id: userActor.id, status: AccountStatus.ACTIVE },
      });
    });

    it("rejects non-admin users from creating, updating, or deleting measurement types", async () => {
      await expect(
        service.createType(userActor, {
          code: "weight",
          name: "Weight",
          category: "body",
          defaultUnit: "kg",
          isActive: true,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateType(userActor, 1, { name: "Updated" }),
      ).rejects.toThrow(ForbiddenException);

      await expect(service.deleteType(userActor, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("measurement types catalog", () => {
    it("lists only active types for USER and all types for ADMIN with pagination", async () => {
      typesRepo.findAndCount.mockResolvedValue([[sampleType], 3]);

      const userResult = await service.listTypes(userActor, {
        limit: 1,
        offset: 0,
      });
      expect(typesRepo.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { id: "ASC" },
        skip: 0,
        take: 1,
      });
      expect(userResult).toEqual({
        items: [sampleType],
        total: 3,
        hasMore: true,
      });

      typesRepo.findAndCount.mockResolvedValue([[sampleType], 1]);
      const adminResult = await service.listTypes(adminActor, {
        limit: 20,
        offset: 0,
      });
      expect(typesRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { id: "ASC" },
        skip: 0,
        take: 20,
      });
      expect(adminResult.hasMore).toBe(false);
    });

    it("validates measurement type ID bounds on getType", async () => {
      await expect(service.getType(userActor, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getType(userActor, 32768)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getType(userActor, 1.5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFoundException when measurement type is missing or inactive for USER", async () => {
      typesRepo.findOneBy.mockResolvedValue(null);

      await expect(service.getType(userActor, 99)).rejects.toThrow(
        NotFoundException,
      );
      expect(typesRepo.findOneBy).toHaveBeenCalledWith({
        id: 99,
        isActive: true,
      });
    });

    it("creates a measurement type as ADMIN and maps duplicate code to ConflictException", async () => {
      typesRepo.save.mockResolvedValueOnce({ ...sampleType });
      const created = await service.createType(adminActor, {
        code: "weight",
        name: "Body Weight",
        category: "body",
        defaultUnit: "kg",
        isActive: true,
      });
      expect(created.code).toBe("weight");

      typesRepo.save.mockRejectedValueOnce({ code: "23505" });
      await expect(
        service.createType(adminActor, {
          code: "weight",
          name: "Duplicate",
          category: "body",
          defaultUnit: "kg",
          isActive: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("updates only provided fields on updateType and soft-deactivates on deleteType", async () => {
      typesRepo.findOneBy.mockResolvedValue({ ...sampleType });

      const updated = await service.updateType(adminActor, 1, {
        name: "Updated Weight",
      });
      expect(updated.name).toBe("Updated Weight");
      expect(updated.code).toBe("weight");

      const deleted = await service.deleteType(adminActor, 1);
      expect(deleted).toBe(true);
      expect(typesRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe("user measurements", () => {
    const baseInput: CreateUserMeasurementInput = {
      measurementTypeId: 1,
      value: "72.125",
      unit: "kg",
      measuredAt: new Date("2026-02-01T10:00:00Z"),
      source: MeasurementSource.USER,
      notes: "Morning weight",
    };

    it("rejects non-USER source for non-admin actors", async () => {
      await expect(
        service.createReading(userActor, {
          ...baseInput,
          source: MeasurementSource.DEVICE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to create a measurement with privileged source", async () => {
      typesRepo.findOneBy.mockResolvedValue(sampleType);
      readingsRepo.findOne.mockResolvedValue({
        id: "reading-1",
        userId: adminActor.id,
        recordedByUserId: adminActor.id,
        source: MeasurementSource.DEVICE,
        measurementType: sampleType,
      });

      const created = await service.createReading(adminActor, {
        ...baseInput,
        source: MeasurementSource.DEVICE,
      });

      expect(readingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminActor.id,
          recordedByUserId: adminActor.id,
          source: MeasurementSource.DEVICE,
        }),
      );
      expect(created.source).toBe(MeasurementSource.DEVICE);
    });

    it("throws NotFoundException when measurement type does not exist", async () => {
      typesRepo.findOneBy.mockResolvedValue(null);

      await expect(service.createReading(userActor, baseInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when measurement type is inactive", async () => {
      typesRepo.findOneBy.mockResolvedValue({ ...sampleType, isActive: false });

      await expect(service.createReading(userActor, baseInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("defaults unit to measurementType.defaultUnit when unit is omitted or null", async () => {
      typesRepo.findOneBy.mockResolvedValue(sampleType);
      readingsRepo.findOne.mockResolvedValue({
        id: "reading-1",
        unit: "kg",
        measurementType: sampleType,
      });

      await service.createReading(userActor, {
        measurementTypeId: 1,
        value: "0",
        measuredAt: new Date("2026-02-01T10:00:00Z"),
        source: MeasurementSource.USER,
      });

      expect(readingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          value: "0",
          unit: "kg",
          userId: userActor.id,
          recordedByUserId: userActor.id,
        }),
      );
    });

    it("scopes listReadings and getReading to the authenticated user", async () => {
      readingsRepo.findAndCount.mockResolvedValue([[], 0]);
      const list = await service.listReadings(userActor, {
        limit: 10,
        offset: 0,
      });
      expect(list).toEqual({ items: [], total: 0, hasMore: false });
      expect(readingsRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: userActor.id },
        relations: { measurementType: true },
        order: { measuredAt: "DESC", id: "ASC" },
        skip: 0,
        take: 10,
      });

      readingsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getReading(userActor, "33333333-3333-4333-8333-333333333333"),
      ).rejects.toThrow(NotFoundException);
      expect(readingsRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: "33333333-3333-4333-8333-333333333333",
          userId: userActor.id,
        },
        relations: { measurementType: true },
      });
    });

    it("updates only notes on updateReading and skips update when notes is undefined", async () => {
      const ownedReading = {
        id: "reading-1",
        userId: userActor.id,
        notes: "Initial",
        measurementType: sampleType,
      };
      readingsRepo.findOne.mockResolvedValue(ownedReading);

      await service.updateReading(userActor, "reading-1", {});
      expect(readingsRepo.update).not.toHaveBeenCalled();

      await service.updateReading(userActor, "reading-1", {
        notes: "Updated note",
      });
      expect(readingsRepo.update).toHaveBeenCalledWith(
        { id: "reading-1", userId: userActor.id },
        { notes: "Updated note" },
      );
    });

    it("soft deletes owned readings", async () => {
      readingsRepo.findOne.mockResolvedValue({
        id: "reading-1",
        userId: userActor.id,
      });

      const result = await service.deleteReading(userActor, "reading-1");
      expect(result).toBe(true);
      expect(readingsRepo.softDelete).toHaveBeenCalledWith({
        id: "reading-1",
        userId: userActor.id,
      });
    });
  });

  describe("DTO validation", () => {
    it("accepts zero and valid decimal(10,3) values and rejects negative or over-precise values", async () => {
      const validZero = plainToInstance(CreateUserMeasurementInput, {
        measurementTypeId: 1,
        value: "0",
        measuredAt: new Date(),
      });
      expect(await validate(validZero)).toHaveLength(0);

      const validMaxScale = plainToInstance(CreateUserMeasurementInput, {
        measurementTypeId: 1,
        value: "1234567.123",
        unit: "  kg  ",
        measuredAt: new Date(),
      });
      expect(validMaxScale.unit).toBe("kg");
      expect(await validate(validMaxScale)).toHaveLength(0);

      const negativeValue = plainToInstance(CreateUserMeasurementInput, {
        measurementTypeId: 1,
        value: "-1.5",
        measuredAt: new Date(),
      });
      expect(
        (await validate(negativeValue)).some((e) => e.property === "value"),
      ).toBe(true);

      const excessivePrecision = plainToInstance(CreateUserMeasurementInput, {
        measurementTypeId: 1,
        value: "72.1234",
        measuredAt: new Date(),
      });
      expect(
        (await validate(excessivePrecision)).some(
          (e) => e.property === "value",
        ),
      ).toBe(true);

      const blankUnit = plainToInstance(CreateUserMeasurementInput, {
        measurementTypeId: 1,
        value: "72",
        unit: "   ",
        measuredAt: new Date(),
      });
      expect(
        (await validate(blankUnit)).some((e) => e.property === "unit"),
      ).toBe(true);
    });

    it("validates CreateMeasurementTypeInput and UpdateMeasurementTypeInput", async () => {
      const invalidType = plainToInstance(CreateMeasurementTypeInput, {
        code: "   ",
        name: "Weight",
        category: "body",
        defaultUnit: "kg",
      });
      expect(
        (await validate(invalidType)).some((e) => e.property === "code"),
      ).toBe(true);

      const validPartialUpdate = plainToInstance(UpdateMeasurementTypeInput, {
        description: null,
      });
      expect(await validate(validPartialUpdate)).toHaveLength(0);

      const validNotesUpdate = plainToInstance(UpdateUserMeasurementInput, {
        notes: "  fasted  ",
      });
      expect(validNotesUpdate.notes).toBe("fasted");
      expect(await validate(validNotesUpdate)).toHaveLength(0);
    });
  });
});
