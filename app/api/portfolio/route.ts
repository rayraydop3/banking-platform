import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const postSchema = z.object({
  action: z.enum(['buy', 'sell']),
  symbol: z.string().min(1).max(10),
  shares: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(), // 卖出时不需要，买入时必填
})

// GET /api/portfolio - 获取当前用户持仓列表
export const GET = withAuth(async (req, user) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.userId },
      orderBy: { symbol: 'asc' },
    })

    return NextResponse.json({ portfolios })
  } catch (error) {
    console.error('获取持仓失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
})

// POST /api/portfolio - 买入或卖出
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const { action, symbol, shares, price } = postSchema.parse(body)

    if (action === 'buy') {
      if (price === undefined || price <= 0) {
        return NextResponse.json({ error: '买入时需提供价格' }, { status: 400 })
      }
      // 买入：upsert，有则更新 shares 和 avgPrice
      const existing = await prisma.portfolio.findUnique({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
      })

      let newShares: number
      let newAvgPrice: number

      if (existing) {
        // 加权平均成本：avgPrice = (oldShares * oldAvgPrice + newShares * price) / (oldShares + newShares)
        newShares = existing.shares + shares
        newAvgPrice = (existing.shares * existing.avgPrice + shares * price) / newShares
      } else {
        newShares = shares
        newAvgPrice = price
      }

      const portfolio = await prisma.portfolio.upsert({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
        create: {
          userId: user.userId,
          symbol: symbol.toUpperCase(),
          shares: newShares,
          avgPrice: newAvgPrice,
        },
        update: {
          shares: newShares,
          avgPrice: newAvgPrice,
        },
      })

      return NextResponse.json({
        message: `成功买入 ${shares} 股 ${symbol}`,
        portfolio,
      })
    } else {
      // 卖出
      const existing = await prisma.portfolio.findUnique({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
      })

      if (!existing) {
        return NextResponse.json({ error: '无该股票持仓' }, { status: 400 })
      }
      if (existing.shares < shares) {
        return NextResponse.json(
          { error: `持仓不足，当前持有 ${existing.shares} 股` },
          { status: 400 }
        )
      }

      const newShares = existing.shares - shares

      if (newShares === 0) {
        await prisma.portfolio.delete({
          where: {
            userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
          },
        })
        return NextResponse.json({
          message: `已全部卖出 ${symbol}`,
          portfolio: null,
        })
      }

      const portfolio = await prisma.portfolio.update({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
        data: { shares: newShares },
      })

      return NextResponse.json({
        message: `成功卖出 ${shares} 股 ${symbol}`,
        portfolio,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    console.error('Portfolio 操作失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
})
