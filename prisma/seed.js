const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const user1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: await hash('password123', 12),
      name: '测试用户',
      mfaEnabled: false,
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: await hash('admin123', 12),
      name: '管理员',
      mfaEnabled: false,
    },
  })

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user1.id },
  })
  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user1.id,
        accountNumber: `ACC${Date.now()}`,
        accountType: 'savings',
        balance: 1000,
        currency: 'AUD',
      },
    })
  }

  console.log('✅ 种子数据已创建')
  console.log('')
  console.log('测试账号：')
  console.log('  邮箱: test@example.com  密码: password123')
  console.log('  邮箱: admin@example.com 密码: admin123')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
