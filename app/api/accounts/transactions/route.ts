import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const transactionSchema = z.object({
  accountId: z.string(),
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  toAccountId: z.string().optional(), // Required for transfers
})

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()
    const { accountId, type, amount, description, toAccountId } 
      = transactionSchema.parse(body)

    // Verify the account belongs to the current user
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId: user.userId 
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // ===== PostgreSQL Transactions (Atomicity) =====
    // A transaction is a group of operations that either all succeed or all fail.
    // For example, in a transfer: debit + credit must both succeed.
    // If debit succeeds but credit fails, money would disappear!
    //
    // prisma.$transaction() wraps operations in a transaction.
    // All operations inside either commit together or rollback entirely.

    if (type === 'transfer') {
      // Transfer logic
      if (!toAccountId) {
        return NextResponse.json(
          { error: 'Target account is required for transfers' },
          { status: 400 }
        )
      }

      if (account.balance < amount) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        )
      }

      // Use a transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Deduct from source account
        const fromAccount = await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } }
        })

        // 2. Add to target account
        const toAccount = await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } }
        })

        // 3. Create transaction record for source account
        const fromTransaction = await tx.transaction.create({
          data: {
            accountId,
            type: 'transfer',
            amount: -amount,
            description: description || `Transfer to ${toAccountId}`,
            status: 'completed'
          }
        })

        // 4. Create transaction record for target account
        await tx.transaction.create({
          data: {
            accountId: toAccountId,
            type: 'transfer',
            amount,
            description: description || `Transfer from ${accountId}`,
            status: 'completed'
          }
        })

        return { fromAccount, toAccount, fromTransaction }
      })

      return NextResponse.json({
        message: 'Transfer successful',
        transaction: result.fromTransaction
      })

    } else if (type === 'deposit') {
      // Deposit logic
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updatedAccount = await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } }
        })

        const transaction = await tx.transaction.create({
          data: {
            accountId,
            type: 'deposit',
            amount,
            description: description || 'Deposit',
            status: 'completed'
          }
        })

        return { account: updatedAccount, transaction }
      })

      return NextResponse.json({
        message: 'Deposit successful',
        account: result.account,
        transaction: result.transaction
      })

    } else if (type === 'withdrawal') {
        if (account.balance < amount) {
          return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400 }
          )
        }
  
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const updatedAccount = await tx.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } }
          })
  
          const transaction = await tx.transaction.create({
            data: {
              accountId,
              type: 'withdrawal',
              amount: -amount,
              description: description || 'Withdrawal',
              status: 'completed'
            }
          })
  
          return { account: updatedAccount, transaction }
        })
  
        return NextResponse.json({
          message: 'Withdrawal successful',
          account: result.account,
          transaction: result.transaction
        })
      }
  
      // Fallback for invalid transaction type
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
  
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data' },
          { status: 400 }
        )
      }
  
      console.error('Transaction failed:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
