import mongoose from 'mongoose'

// MongoDB Schema for user sessions
// Unlike PostgreSQL which requires migrations, MongoDB schemas are flexible
// The schema defines the document "shape" but doesn't strictly enforce it
const sessionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true  // Index for faster lookups by userId
  },
  token: { 
    type: String, 
    required: true 
  },
  userAgent: String,   // Browser/client info
  ipAddress: String,   // Client IP address
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 604800  // TTL index: auto-delete after 7 days (in seconds)
  }
})

// TTL (Time-To-Live) Index:
// expires: 604800 = 7 days in seconds
// MongoDB automatically deletes expired sessions
// No manual cleanup needed — ideal for session management

export const Session = mongoose.models.Session || 
  mongoose.model('Session', sessionSchema)
