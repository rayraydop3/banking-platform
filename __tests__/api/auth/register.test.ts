import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'

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
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

function createMockRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('邮箱已存在时返回 400', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'exist@test.com',
    })

    const req = createMockRequest({
      email: 'exist@test.com',
      password: 'password123',
      name: 'User',
    })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain('邮箱')
  })

  it('注册成功时返回 201 和用户信息', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'new@test.com',
      name: 'New User',
      createdAt: new Date(),
    })

    const req = createMockRequest({
      email: 'new@test.com',
      password: 'password123',
      name: 'New User',
    })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.user.email).toBe('new@test.com')
    expect(data.user.password).toBeUndefined()
  })
})
