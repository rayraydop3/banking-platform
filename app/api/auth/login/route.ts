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

    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 2. 验证密码
    const isValid = await compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 3. 若已启用MFA，返回tempToken，不签发正式token
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

    // 4. 生成正式JWT（带上 role，供 RBAC 校验）
    const token = sign(
      { userId: user.id, email: user.email, role: (user as { role?: string }).role ?? 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 5. 存Session到MongoDB
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
    console.error('登录失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}