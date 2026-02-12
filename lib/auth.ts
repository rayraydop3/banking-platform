import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

export interface AuthUser {
  userId: string
  email: string
  role: string
}

type Handler = (req: NextRequest, user: AuthUser) => Promise<NextResponse>

// Authentication middleware: verifies JWT from Authorization header
export function withAuth(handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization')

      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)

      const decoded = verify(
        token,
        process.env.JWT_SECRET!
      ) as AuthUser

      return handler(req, decoded)

    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }
}

// RBAC middleware: checks if the user's role is in the allowed list
export function withRole(allowedRoles: string[]) {
  return (handler: Handler) => {
    return withAuth(async (req, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
      return handler(req, user)
    })
  }
}
