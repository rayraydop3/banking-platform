import { NextResponse } from 'next/server'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (req, user) => {
  try {
    // 1. 生成secret密钥
    const secret = generateSecret()
    
    // 2. 生成TOTP URI（给Google Authenticator用）
    const otpauth = generateURI({
      issuer: 'Banking Platform',
      label: user.email,
      secret,
    })
    
    // 3. 把secret临时存到数据库（未启用状态）
    await prisma.user.update({
      where: { id: user.userId },
      data: { mfaSecret: secret }
    })
    
    // 4. 生成QR码图片（base64格式）
    const qrCodeUrl = await QRCode.toDataURL(otpauth)
    
    return NextResponse.json({
      message: '请用Google Authenticator扫描二维码',
      qrCode: qrCodeUrl,  // 前端显示这个图片
      secret,             // 也返回secret，方便手动输入
    })
    
  } catch (error) {
    console.error('MFA setup失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
})