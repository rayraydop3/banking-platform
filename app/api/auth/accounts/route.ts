import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// ===== 核心知识点：RBAC权限控制 =====
// withAuth包装器确保只有登录用户才能访问
// 用户只能看到自己的账户，不能看别人的
// 这就是基于角色的访问控制（Role-Based Access Control）

export const GET = withAuth(async (req, user) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { 
        userId: user.userId  // 只查当前用户的账户
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5  // 只返回最近5条交易
        }
      }
    })

    return NextResponse.json({ accounts })

  } catch (error) {
    console.error('获取账户失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
})