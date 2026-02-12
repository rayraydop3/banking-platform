import { POST } from '@/app/api/auth/login/route'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    account: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    portfolio: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))
jest.mock('@/lib/mongodb', () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/models/Session', () => ({
  Session: { create: jest.fn().mockResolvedValue({}) },
}))
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const mockCompare = compare as jest.MockedFunction<typeof compare>
const mockSign = sign as jest.MockedFunction<typeof sign>

function createMockRequest(body: object) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when email does not exist', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const req = createMockRequest({ email: 'wrong@test.com', password: '12345678' })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toContain('Invalid email or password')
  })

  it('should return 401 when password is incorrect', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      password: 'hashed',
      name: 'Test',
      mfaEnabled: false,
      role: 'USER',
    })
    mockCompare.mockResolvedValue(false as never)

    const req = createMockRequest({ email: 'test@test.com', password: 'wrong' })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.error).toContain('Invalid email or password')
  })

  it('should return token when credentials are valid and MFA is disabled', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      password: 'hashed',
      name: 'Test',
      mfaEnabled: false,
      role: 'USER',
      accounts: [],
    })
    mockCompare.mockResolvedValue(true as never)
    mockSign.mockReturnValue('fake-jwt-token' as any)

    const req = createMockRequest({ email: 'test@test.com', password: 'correct' })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.token).toBe('fake-jwt-token')
    expect(data.user.email).toBe('test@test.com')
  })

  it('should return needsMfa and tempToken when MFA is enabled', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      password: 'hashed',
      name: 'Test',
      mfaEnabled: true,
      role: 'USER',
      accounts: [],
    })
    mockCompare.mockResolvedValue(true as never)
    mockSign.mockReturnValue('fake-temp-token' as any)

    const req = createMockRequest({ email: 'test@test.com', password: 'correct' })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.needsMfa).toBe(true)
    expect(data.tempToken).toBe('fake-temp-token')
    expect(data.token).toBeUndefined()
  })
})
