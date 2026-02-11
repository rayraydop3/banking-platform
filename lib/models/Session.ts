import mongoose from 'mongoose'

// 核心知识点：MongoDB Schema
// 不像PostgreSQL需要migration，MongoDB可以随时改结构
// Schema定义文档的"形状"，但不强制
const sessionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true  // 加索引，加速按userId查询
  },
  token: { 
    type: String, 
    required: true 
  },
  userAgent: String,   // 浏览器信息
  ipAddress: String,   // IP地址
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 604800  // 7天后自动删除（TTL索引）
  }
})

// 核心知识点：TTL索引
// expires: 604800 = 7天（秒）
// MongoDB会自动删除过期的session
// 不需要手动清理，很适合session管理

export const Session = mongoose.models.Session || 
  mongoose.model('Session', sessionSchema)