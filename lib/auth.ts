import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

export interface AuthUser {
  userId: string
  email: string
  role: string
}

type Handler = (req: NextRequest, user: AuthUser) => Promise<NextResponse>

export function withAuth(handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization')

      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: '未登录' },
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
        { error: 'Token无效或已过期' },
        { status: 401 }
      )
    }
  }
}

export function withRole(allowedRoles: string[]) {
  return (handler: Handler) => {
    return withAuth(async (req, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: '权限不足' },
          { status: 403 }
        )
      }
      return handler(req, user)
    })
  }
}