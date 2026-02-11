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

    // 1. 验证tempToken
    let decoded: { userId: string; email: string; purpose?: string }
    try {
      decoded = verify(
        tempToken,
        process.env.JWT_SECRET!
      ) as { userId: string; email: string; purpose?: string }
    } catch {
      return NextResponse.json(
        { error: '验证已过期，请重新登录' },
        { status: 401 }
      )
    }

    if (decoded.purpose !== 'mfa_pending') {
      return NextResponse.json(
        { error: '无效的验证请求' },
        { status: 401 }
      )
    }

    // 2. 获取用户并验证MFA
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { accounts: true }
    })

    if (!user?.mfaSecret || !user.mfaEnabled) {
      return NextResponse.json(
        { error: '请先完成MFA设置' },
        { status: 400 }
      )
    }

    const result = await verifyOTP({
      token: code,
      secret: user.mfaSecret,
    })

    if (!result.valid) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 401 }
      )
    }

    // 3. 签发正式token（带上 role，供 RBAC 校验）
    const token = sign(
      { userId: user.id, email: user.email, role: (user as { role?: string }).role ?? 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 4. 存Session到MongoDB
    await connectMongoDB()
    await Session.create({
      userId: user.id,
      token,
      userAgent: req.headers.get('user-agent') || 'unknown',
      ipAddress: req.headers.get('x-forwarded-for') || 'localhost',
    })

    return NextResponse.json({
      message: '登录成功',
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
        { error: '输入数据有误' },
        { status: 400 }
      )
    }
    console.error('MFA登录失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
