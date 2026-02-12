import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req, user) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { 
        userId: user.userId
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    return NextResponse.json({ accounts })

  } catch (error) {
    console.error('Failed to fetch accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
