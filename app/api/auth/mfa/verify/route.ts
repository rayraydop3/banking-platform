import { NextResponse } from 'next/server'
import { verify as verifyOTP } from 'otplib'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const verifySchema = z.object({
  code: z.string().length(6),
})

export const POST = withAuth(async (req, user) => {
  try {
    const { code } = verifySchema.parse(await req.json())
    
    // 1. 从数据库获取secret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })
    
    if (!dbUser?.mfaSecret) {
      return NextResponse.json(
        { error: '请先设置MFA' },
        { status: 400 }
      )
    }
    
    // 2. 验证6位数字是否正确
    // 核心知识点：verify() 是异步函数
    // 用secret + 当前时间生成预期code，和用户输入的比对
    const result = await verifyOTP({
      token: code,
      secret: dbUser.mfaSecret,
    })
    const isValid = result.valid
    
    if (!isValid) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 401 }
      )
    }
    
    // 3. 启用MFA
    await prisma.user.update({
      where: { id: user.userId },
      data: { mfaEnabled: true }
    })
    
    return NextResponse.json({ message: 'MFA启用成功' })
    
  } catch (error) {
    console.error('MFA verify失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
})