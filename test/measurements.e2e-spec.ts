import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { UserRole } from "../src/common/decorators/roles.decorator";
import { MeasurementType } from "../src/modules/measurements/entities/measurement-type.entity";
import { UserMeasurement } from "../src/modules/measurements/entities/user-measurement.entity";
import { MeasurementSource } from "../src/modules/measurements/enums/measurement-source.enum";
import { User } from "../src/modules/users/entities/user.entity";
import { AccountStatus } from "../src/modules/users/enums/account-status.enum";

describe("Measurements GraphQL API (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let activeUser: User;
  let secondUser: User;
  let inactiveUser: User;
  let adminUser: User;

  let userToken: string;
  let secondUserToken: string;
  let inactiveUserToken: string;
  let adminToken: string;

  const createdTypeIds: number[] = [];
  const createdReadingIds: string[] = [];

  const gql = (
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ) => {
    const req = request(app.getHttpServer()).post("/graphql");
    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }
    return req.send({ query, variables });
  };

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);

    const userRepo = dataSource.getRepository(User);
    const suffix = Date.now().toString().slice(-6);

    activeUser = await userRepo.save(
      userRepo.create({
        phoneCountryCode: "+91",
        phoneNumber: `9100${suffix}`,
        status: AccountStatus.ACTIVE,
      }),
    );
    secondUser = await userRepo.save(
      userRepo.create({
        phoneCountryCode: "+91",
        phoneNumber: `9200${suffix}`,
        status: AccountStatus.ACTIVE,
      }),
    );
    inactiveUser = await userRepo.save(
      userRepo.create({
        phoneCountryCode: "+91",
        phoneNumber: `9300${suffix}`,
        status: AccountStatus.INACTIVE,
      }),
    );
    adminUser = await userRepo.save(
      userRepo.create({
        phoneCountryCode: "+91",
        phoneNumber: `9400${suffix}`,
        status: AccountStatus.ACTIVE,
      }),
    );

    userToken = await jwtService.signAsync({
      id: activeUser.id,
      phoneCountryCode: activeUser.phoneCountryCode,
      phoneNumber: activeUser.phoneNumber,
      role: UserRole.USER,
    });
    secondUserToken = await jwtService.signAsync({
      id: secondUser.id,
      phoneCountryCode: secondUser.phoneCountryCode,
      phoneNumber: secondUser.phoneNumber,
      role: UserRole.USER,
    });
    inactiveUserToken = await jwtService.signAsync({
      id: inactiveUser.id,
      phoneCountryCode: inactiveUser.phoneCountryCode,
      phoneNumber: inactiveUser.phoneNumber,
      role: UserRole.USER,
    });
    adminToken = await jwtService.signAsync({
      id: adminUser.id,
      phoneCountryCode: adminUser.phoneCountryCode,
      phoneNumber: adminUser.phoneNumber,
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      if (createdReadingIds.length > 0) {
        await dataSource
          .getRepository(UserMeasurement)
          .delete(createdReadingIds);
      }
      if (createdTypeIds.length > 0) {
        await dataSource.getRepository(MeasurementType).delete(createdTypeIds);
      }
      const userIds = [
        activeUser?.id,
        secondUser?.id,
        inactiveUser?.id,
        adminUser?.id,
      ].filter((id): id is string => Boolean(id));
      if (userIds.length > 0) {
        await dataSource.getRepository(User).delete(userIds);
      }
    }
    await app?.close();
  });

  it("requires authentication for measurementSources and returns all enum values", async () => {
    const unauth = await gql(`query { measurementSources }`).expect(200);
    expect(unauth.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");

    const auth = await gql(
      `query { measurementSources }`,
      undefined,
      userToken,
    ).expect(200);
    expect(auth.body.errors).toBeUndefined();
    expect(auth.body.data.measurementSources).toEqual(
      expect.arrayContaining([
        "USER",
        "DIETITIAN",
        "DEVICE",
        "IMPORTED",
        "AI_ESTIMATE",
      ]),
    );
  });

  it("enforces ADMIN role for measurement type mutations and supports full catalog lifecycle", async () => {
    const code = `weight_${Date.now()}`;
    const createMutation = `
      mutation CreateType($input: CreateMeasurementTypeInput!) {
        createMeasurementType(input: $input) {
          id
          code
          name
          category
          defaultUnit
          isActive
        }
      }
    `;

    const forbidden = await gql(
      createMutation,
      {
        input: {
          code,
          name: "Weight",
          category: "body",
          defaultUnit: "kg",
          isActive: true,
        },
      },
      userToken,
    ).expect(200);
    expect(forbidden.body.errors[0].extensions.code).toBe("FORBIDDEN");

    const created = await gql(
      createMutation,
      {
        input: {
          code,
          name: "Body Weight",
          category: "body",
          defaultUnit: "kg",
          description: "Weight in kg",
          isActive: true,
        },
      },
      adminToken,
    ).expect(200);
    expect(created.body.errors).toBeUndefined();
    const typeId = created.body.data.createMeasurementType.id as number;
    createdTypeIds.push(typeId);

    const duplicate = await gql(
      createMutation,
      {
        input: {
          code,
          name: "Duplicate",
          category: "body",
          defaultUnit: "kg",
          isActive: true,
        },
      },
      adminToken,
    ).expect(200);
    expect(duplicate.body.errors[0].extensions.code).toBe("CONFLICT");

    const listRes = await gql(
      `query ListTypes($limit: Int, $offset: Int) {
        measurementTypes(limit: $limit, offset: $offset) {
          items { id code isActive }
          total
          hasMore
        }
      }`,
      { limit: 20, offset: 0 },
      userToken,
    ).expect(200);
    expect(
      listRes.body.data.measurementTypes.items.some(
        (t: { id: number }) => t.id === typeId,
      ),
    ).toBe(true);

    const getRes = await gql(
      `query GetType($id: Int!) { measurementType(id: $id) { id code name } }`,
      { id: typeId },
      userToken,
    ).expect(200);
    expect(getRes.body.data.measurementType.code).toBe(code);

    const updateRes = await gql(
      `mutation UpdateType($id: Int!, $input: UpdateMeasurementTypeInput!) {
        updateMeasurementType(id: $id, input: $input) { id name }
      }`,
      { id: typeId, input: { name: "Updated Weight" } },
      adminToken,
    ).expect(200);
    expect(updateRes.body.data.updateMeasurementType.name).toBe(
      "Updated Weight",
    );
  });

  it("supports user measurement creation, unit defaulting, history, scoping, notes update, and soft delete", async () => {
    const typeRes = await gql(
      `mutation CreateType($input: CreateMeasurementTypeInput!) {
        createMeasurementType(input: $input) { id }
      }`,
      {
        input: {
          code: `waist_${Date.now()}`,
          name: "Waist",
          category: "body",
          defaultUnit: "cm",
          isActive: true,
        },
      },
      adminToken,
    ).expect(200);
    const typeId = typeRes.body.data.createMeasurementType.id as number;
    createdTypeIds.push(typeId);

    const createReadingMutation = `
      mutation CreateReading($input: CreateUserMeasurementInput!) {
        createUserMeasurement(input: $input) {
          id
          userId
          recordedByUserId
          measurementTypeId
          value
          unit
          source
          notes
          measurementType { id code defaultUnit }
        }
      }
    `;

    // Rejects inactive account
    const inactiveRes = await gql(
      createReadingMutation,
      {
        input: {
          measurementTypeId: typeId,
          value: "80.5",
          measuredAt: "2026-02-01T08:00:00.000Z",
        },
      },
      inactiveUserToken,
    ).expect(200);
    expect(inactiveRes.body.errors[0].extensions.code).toBe("FORBIDDEN");

    // Rejects negative value
    const negativeRes = await gql(
      createReadingMutation,
      {
        input: {
          measurementTypeId: typeId,
          value: "-5",
          measuredAt: "2026-02-01T08:00:00.000Z",
        },
      },
      userToken,
    ).expect(200);
    expect(negativeRes.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");

    // Rejects spoofed source for USER
    const spoofedSourceRes = await gql(
      createReadingMutation,
      {
        input: {
          measurementTypeId: typeId,
          value: "80",
          measuredAt: "2026-02-01T08:00:00.000Z",
          source: MeasurementSource.DEVICE.toUpperCase(),
        },
      },
      userToken,
    ).expect(200);
    expect(spoofedSourceRes.body.errors[0].extensions.code).toBe("FORBIDDEN");

    // Creates reading with omitted unit -> defaults to cm
    const firstRes = await gql(
      createReadingMutation,
      {
        input: {
          measurementTypeId: typeId,
          value: "80.250",
          measuredAt: "2026-02-01T08:00:00.000Z",
          notes: "Day 1",
        },
      },
      userToken,
    ).expect(200);
    expect(firstRes.body.errors).toBeUndefined();
    const readingId = firstRes.body.data.createUserMeasurement.id as string;
    createdReadingIds.push(readingId);
    expect(firstRes.body.data.createUserMeasurement.unit).toBe("cm");
    expect(firstRes.body.data.createUserMeasurement.userId).toBe(activeUser.id);
    expect(firstRes.body.data.createUserMeasurement.recordedByUserId).toBe(
      activeUser.id,
    );

    // Other user cannot read or update this measurement
    const otherUserRead = await gql(
      `query GetReading($id: ID!) { userMeasurement(id: $id) { id } }`,
      { id: readingId },
      secondUserToken,
    ).expect(200);
    expect(otherUserRead.body.errors[0].extensions.code).toBe("NOT_FOUND");

    // Owner updates notes
    const updateNotesRes = await gql(
      `mutation UpdateReading($id: ID!, $input: UpdateUserMeasurementInput!) {
        updateUserMeasurement(id: $id, input: $input) { id value unit notes }
      }`,
      { id: readingId, input: { notes: "Updated Day 1" } },
      userToken,
    ).expect(200);
    expect(updateNotesRes.body.data.updateUserMeasurement.notes).toBe(
      "Updated Day 1",
    );
    expect(updateNotesRes.body.data.updateUserMeasurement.unit).toBe("cm");

    // List readings for owner
    const listReadingsRes = await gql(
      `query ListReadings($limit: Int, $offset: Int) {
        userMeasurements(limit: $limit, offset: $offset) {
          items { id value }
          total
          hasMore
        }
      }`,
      { limit: 10, offset: 0 },
      userToken,
    ).expect(200);
    expect(
      listReadingsRes.body.data.userMeasurements.total,
    ).toBeGreaterThanOrEqual(1);

    // Owner soft-deletes reading
    const deleteRes = await gql(
      `mutation DeleteReading($id: ID!) { deleteUserMeasurement(id: $id) }`,
      { id: readingId },
      userToken,
    ).expect(200);
    expect(deleteRes.body.data.deleteUserMeasurement).toBe(true);

    const afterDeleteRes = await gql(
      `query GetReading($id: ID!) { userMeasurement(id: $id) { id } }`,
      { id: readingId },
      userToken,
    ).expect(200);
    expect(afterDeleteRes.body.errors[0].extensions.code).toBe("NOT_FOUND");

    // Admin deactivates measurement type -> user can no longer see or use it
    const deactivateRes = await gql(
      `mutation DeleteType($id: Int!) { deleteMeasurementType(id: $id) }`,
      { id: typeId },
      adminToken,
    ).expect(200);
    expect(deactivateRes.body.data.deleteMeasurementType).toBe(true);

    const inactiveCreateRes = await gql(
      createReadingMutation,
      {
        input: {
          measurementTypeId: typeId,
          value: "79",
          measuredAt: "2026-02-02T08:00:00.000Z",
        },
      },
      userToken,
    ).expect(200);
    expect(inactiveCreateRes.body.errors[0].extensions.code).toBe(
      "BAD_USER_INPUT",
    );
  });
});
