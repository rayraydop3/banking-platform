import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const transactionSchema = z.object({
  accountId: z.string(),
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: z.number().positive('金额必须大于0'),
  description: z.string().optional(),
  toAccountId: z.string().optional(), // 转账时用
})

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const { accountId, type, amount, description, toAccountId } 
      = transactionSchema.parse(body)

    // 验证账户属于当前用户
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId: user.userId 
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: '账户不存在' },
        { status: 404 }
      )
    }

    // ===== 核心知识点：PostgreSQL事务（两阶段提交） =====
    // 什么是事务？一组操作要么全部成功，要么全部失败
    // 比如转账：扣钱 + 加钱，必须同时成功
    // 如果扣钱成功但加钱失败，钱就消失了！
    //
    // prisma.$transaction() 就是事务
    // 里面所有操作要么全成功，要么全回滚
    //
    // 两阶段提交协议：
    // 第一阶段（准备）：检查余额是否足够
    // 第二阶段（提交）：执行扣款和加款

    if (type === 'transfer') {
      // 转账逻辑
      if (!toAccountId) {
        return NextResponse.json(
          { error: '转账需要目标账户' },
          { status: 400 }
        )
      }

      if (account.balance < amount) {
        return NextResponse.json(
          { error: '余额不足' },
          { status: 400 }
        )
      }

      // 用事务确保数据一致性
      const result = await prisma.$transaction(async (tx) => {
        // 1. 扣除源账户余额
        const fromAccount = await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } }
        })

        // 2. 增加目标账户余额
        const toAccount = await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } }
        })

        // 3. 创建源账户交易记录
        const fromTransaction = await tx.transaction.create({
          data: {
            accountId,
            type: 'transfer',
            amount: -amount,
            description: description || `转账到 ${toAccountId}`,
            status: 'completed'
          }
        })

        // 4. 创建目标账户交易记录
        await tx.transaction.create({
          data: {
            accountId: toAccountId,
            type: 'transfer',
            amount,
            description: description || `来自 ${accountId} 的转账`,
            status: 'completed'
          }
        })

        return { fromAccount, toAccount, fromTransaction }
      })

      return NextResponse.json({
        message: '转账成功',
        transaction: result.fromTransaction
      })

    } else if (type === 'deposit') {
      // 存款逻辑
      const result = await prisma.$transaction(async (tx) => {
        const updatedAccount = await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } }
        })

        const transaction = await tx.transaction.create({
          data: {
            accountId,
            type: 'deposit',
            amount,
            description: description || '存款',
            status: 'completed'
          }
        })

        return { account: updatedAccount, transaction }
      })

      return NextResponse.json({
        message: '存款成功',
        account: result.account,
        transaction: result.transaction
      })

    } else if (type === 'withdrawal') {
        if (account.balance < amount) {
          return NextResponse.json(
            { error: '余额不足' },
            { status: 400 }
          )
        }
  
        const result = await prisma.$transaction(async (tx) => {
          const updatedAccount = await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } }
          })
  
          const transaction = await tx.transaction.create({
            data: {
              accountId,
              type: 'withdrawal',
              amount: -amount,
              description: description || '取款',
              status: 'completed'
            }
          })
  
          return { account: updatedAccount, transaction }
        })
  
        return NextResponse.json({
          message: '取款成功',
          account: result.account,
          transaction: result.transaction
        })
      }
  
      // 加这行！
      return NextResponse.json(
        { error: '无效的交易类型' },
        { status: 400 }
      )
  
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '输入数据有误' },
          { status: 400 }
        )
      }
  
      console.error('交易失败:', error)
      return NextResponse.json(
        { error: '服务器错误' },
        { status: 500 }
      )
    }
  })