process.env.JWT_SECRET = 'test-secret-key'
process.env.MONGODB_URL = 'mongodb://localhost:27017/test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    portfolio: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/lib/mongodb', () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/models/Session', () => ({
  Session: {
    create: jest.fn().mockResolvedValue({}),
  },
}))
