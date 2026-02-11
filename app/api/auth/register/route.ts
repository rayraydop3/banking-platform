import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ===== 核心知识点：Zod数据验证 =====
// Zod定义数据的"形状"，自动验证输入是否合法
// 好处：一行代码搞定验证，自动生成TypeScript类型
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少8位'),
  name: z.string().min(2, '姓名至少2个字符'),
})

export async function POST(req: NextRequest) {
  try {
    // 1. 解析请求body
    const body = await req.json()

    // 2. Zod验证输入数据
    // parse()如果验证失败会自动抛出错误
    const { email, password, name } = registerSchema.parse(body)

    // 3. 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // ===== 核心知识点：bcrypt密码加密 =====
    // 为什么不直接存明文密码？
    // 如果数据库被黑，所有用户密码都泄露
    // bcrypt特点：
    // 1. 加盐（salt）：每次加密结果不同，防止彩虹表攻击
    // 2. 慢哈希：故意设计得很慢，防止暴力破解
    // 数字12是cost factor：越大越慢越安全，12是推荐值
    const hashedPassword = await hash(password, 12)

    // 4. 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      // select只返回需要的字段，不返回密码
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    })

    // 5. 同时创建一个默认银行账户
    // ===== 核心知识点：cuid()生成唯一账号 =====
    const accountNumber = `ACC${Date.now()}`
    
    await prisma.account.create({
      data: {
        userId: user.id,
        accountNumber,
        accountType: 'savings',
        balance: 1000, // 初始余额1000AUD（演示用）
        currency: 'AUD',
      }
    })

    return NextResponse.json(
      { 
        message: '注册成功',
        user 
      },
      { status: 201 }  // 201表示资源创建成功
    )

  } catch (error) {
    // Zod验证错误
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据有误', details: error.errors },
        { status: 400 }
      )
    }

    console.error('注册失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}