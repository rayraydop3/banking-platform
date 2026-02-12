import { NextResponse } from 'next/server'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (req, user) => {
  try {
    // 1. Generate a TOTP secret key
    const secret = generateSecret()
    
    // 2. Generate TOTP URI for Google Authenticator
    const otpauth = generateURI({
      issuer: 'Banking Platform',
      label: user.email,
      secret,
    })
    
    // 3. Store the secret in the database (MFA not yet enabled)
    await prisma.user.update({
      where: { id: user.userId },
      data: { mfaSecret: secret }
    })
    
    // 4. Generate QR code image in base64 format
    const qrCodeUrl = await QRCode.toDataURL(otpauth)
    
    return NextResponse.json({
      message: 'Scan the QR code with Google Authenticator',
      qrCode: qrCodeUrl,   // Display this image on the frontend
      secret,               // Also return secret for manual entry
    })
    
  } catch (error) {
    console.error('MFA setup failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
