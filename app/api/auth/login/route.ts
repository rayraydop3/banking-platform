import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { connectMongoDB } from '@/lib/mongodb'
import { Session } from '@/lib/models/Session'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 2. Verify password
    const isValid = await compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 3. If MFA is enabled, return a temporary token instead of a full JWT
    if (user.mfaEnabled) {
      const tempToken = sign(
        { userId: user.id, email: user.email, purpose: 'mfa_pending' },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      )
      return NextResponse.json({
        needsMfa: true,
        tempToken,
        email: user.email,
      })
    }

    // 4. Issue full JWT with role for RBAC
    const token = sign(
      { userId: user.id, email: user.email, role: (user as { role?: string }).role ?? 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 5. Store session in MongoDB
    await connectMongoDB()
    await Session.create({
      userId: user.id,
      token,
      userAgent: req.headers.get('user-agent') || 'unknown',
      ipAddress: req.headers.get('x-forwarded-for') || 'localhost',
    })

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accounts: user.accounts,
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    console.error('Login failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
