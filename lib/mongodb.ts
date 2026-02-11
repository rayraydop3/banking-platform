import mongoose from 'mongoose'

// 核心知识点：连接池
// 和Prisma一样，防止热重载时创建多个连接
const MONGODB_URL = process.env.MONGODB_URL!

if (!MONGODB_URL) {
  throw new Error('MONGODB_URL not defined in .env')
}

const globalForMongo = globalThis as unknown as {
  mongoConn: typeof mongoose | null
}

export async function connectMongoDB() {
  if (globalForMongo.mongoConn) {
    return globalForMongo.mongoConn
  }
  
  const conn = await mongoose.connect(MONGODB_URL)
  globalForMongo.mongoConn = mongoose
  console.log('MongoDB connected')
  return conn
}