import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ===== Zod Schema Validation =====
// Zod defines the "shape" of data and automatically validates input
// Benefits: single-line validation with auto-generated TypeScript types
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    const body = await req.json()

    // 2. Validate input with Zod
    // parse() automatically throws an error if validation fails
    const { email, password, name } = registerSchema.parse(body)

    // 3. Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      )
    }

    // ===== Password Hashing with bcrypt =====
    // Why not store plaintext passwords?
    // If the database is breached, all user passwords would be exposed.
    // bcrypt features:
    // 1. Salting: each hash is unique, preventing rainbow table attacks
    // 2. Slow hashing: intentionally slow to prevent brute-force attacks
    // The number 12 is the cost factor: higher = slower = more secure (12 is recommended)
    const hashedPassword = await hash(password, 12)

    // 4. Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      // select only returns needed fields, excludes password
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    })

    // 5. Create a default bank account for the new user
    // Generate a unique account number using timestamp
    const accountNumber = `ACC${Date.now()}`
    
    await prisma.account.create({
      data: {
        userId: user.id,
        accountNumber,
        accountType: 'savings',
        balance: 1000, // Initial balance of 1000 AUD (for demo purposes)
        currency: 'AUD',
      }
    })

    return NextResponse.json(
      { 
        message: 'Registration successful',
        user 
      },
      { status: 201 }  // 201 indicates resource created successfully
    )

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Registration failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
