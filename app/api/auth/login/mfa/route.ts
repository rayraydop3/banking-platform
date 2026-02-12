import { NextRequest, NextResponse } from 'next/server'
import { sign, verify } from 'jsonwebtoken'
import { verify as verifyOTP } from 'otplib'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { connectMongoDB } from '@/lib/mongodb'
import { Session } from '@/lib/models/Session'

const mfaLoginSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tempToken, code } = mfaLoginSchema.parse(body)

    // 1. Verify the temporary token
    let decoded: { userId: string; email: string; purpose?: string }
    try {
      decoded = verify(
        tempToken,
        process.env.JWT_SECRET!
      ) as { userId: string; email: string; purpose?: string }
    } catch {
      return NextResponse.json(
        { error: 'Verification expired, please log in again' },
        { status: 401 }
      )
    }

    if (decoded.purpose !== 'mfa_pending') {
      return NextResponse.json(
        { error: 'Invalid verification request' },
        { status: 401 }
      )
    }

    // 2. Fetch user and verify MFA code
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { accounts: true }
    })

    if (!user?.mfaSecret || !user.mfaEnabled) {
      return NextResponse.json(
        { error: 'Please complete MFA setup first' },
        { status: 400 }
      )
    }

    const result = await verifyOTP({
      token: code,
      secret: user.mfaSecret,
    })

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      )
    }

    // 3. Issue full JWT with role for RBAC
    const token = sign(
      { userId: user.id, email: user.email, role: (user as { role?: string }).role ?? 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 4. Store session in MongoDB
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
    console.error('MFA login failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
