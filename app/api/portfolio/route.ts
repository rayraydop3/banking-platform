import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const postSchema = z.object({
  action: z.enum(['buy', 'sell']),
  symbol: z.string().min(1).max(10),
  shares: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(), // Not required for sell, required for buy
})

// GET /api/portfolio - Fetch current user's portfolio holdings
export const GET = withAuth(async (req, user) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.userId },
      orderBy: { symbol: 'asc' },
    })

    return NextResponse.json({ portfolios })
  } catch (error) {
    console.error('Failed to fetch portfolio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/portfolio - Buy or sell stocks
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const { action, symbol, shares, price } = postSchema.parse(body)

    if (action === 'buy') {
      if (price === undefined || price <= 0) {
        return NextResponse.json({ error: 'Price is required for buy orders' }, { status: 400 })
      }
      // Buy: upsert — update shares and avgPrice if position exists
      const existing = await prisma.portfolio.findUnique({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
      })

      let newShares: number
      let newAvgPrice: number

      if (existing) {
        // Weighted average cost: avgPrice = (oldShares * oldAvgPrice + newShares * price) / totalShares
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
        message: `Successfully bought ${shares} shares of ${symbol}`,
        portfolio,
      })
    } else {
      // Sell
      const existing = await prisma.portfolio.findUnique({
        where: {
          userId_symbol: { userId: user.userId, symbol: symbol.toUpperCase() },
        },
      })

      if (!existing) {
        return NextResponse.json({ error: 'No position found for this stock' }, { status: 400 })
      }
      if (existing.shares < shares) {
        return NextResponse.json(
          { error: `Insufficient shares, currently holding ${existing.shares}` },
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
          message: `Sold all shares of ${symbol}`,
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
        message: `Successfully sold ${shares} shares of ${symbol}`,
        portfolio,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((e: { message: string }) => e.message).join(', ') },
        { status: 400 }
      )
    }
    console.error('Portfolio operation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
