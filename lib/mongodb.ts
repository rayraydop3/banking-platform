import mongoose from 'mongoose'

// Connection pooling: reuse existing connection across hot reloads (same pattern as Prisma)
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
