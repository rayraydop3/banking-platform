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
    
    // 1. Retrieve the MFA secret from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })
    
    if (!dbUser?.mfaSecret) {
      return NextResponse.json(
        { error: 'Please set up MFA first' },
        { status: 400 }
      )
    }
    
    // 2. Verify the 6-digit TOTP code
    // verifyOTP() compares the user's code against the expected code
    // generated from the secret + current time window
    const result = await verifyOTP({
      token: code,
      secret: dbUser.mfaSecret,
    })
    const isValid = result.valid
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      )
    }
    
    // 3. Enable MFA for the user
    await prisma.user.update({
      where: { id: user.userId },
      data: { mfaEnabled: true }
    })
    
    return NextResponse.json({ message: 'MFA enabled successfully' })
    
  } catch (error) {
    console.error('MFA verification failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
