import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// ===== Role-Based Access Control (RBAC) =====
// withAuth wrapper ensures only authenticated users can access this route
// Users can only view their own accounts, not others'
// This is a fundamental RBAC pattern: resource-level authorization

export const GET = withAuth(async (req, user) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { 
        userId: user.userId  // Only query the current user's accounts
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5  // Return only the 5 most recent transactions
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
