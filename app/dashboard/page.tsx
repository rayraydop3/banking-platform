'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  status: string
  createdAt: string
}

interface Account {
  id: string
  accountNumber: string
  accountType: string
  balance: number
  currency: string
  transactions: Transaction[]
}

interface PortfolioItem {
  id: string
  symbol: string
  shares: number
  avgPrice: number
}

export default function Dashboard() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    type: 'deposit',
    amount: '',
    description: '',
    toAccountId: '',
  })
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([])
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({ action: 'buy' as 'buy' | 'sell', symbol: '', shares: '', price: '' })
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/'); return }
    setUser(JSON.parse(userData || '{}'))
    fetchAccounts(token)
    fetchPortfolios(token)
  }, [router])

  const fetchPortfolios = async (token?: string) => {
    const t = token || localStorage.getItem('token')
    try {
      const res = await fetch('/api/portfolio', {
        headers: { 'Authorization': `Bearer ${t}` }
      })
      const data = await res.json()
      setPortfolios(data.portfolios || [])
    } catch (err) {
      console.error('fetchPortfolios failed:', err)
    }
  }

  const fetchAccounts = async (token?: string) => {
    const t = token || localStorage.getItem('token')
    try {
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${t}` }
      })
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      console.error('fetchAccounts failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransactionLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: accounts[0]?.id,
          type: transactionForm.type,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          toAccountId: transactionForm.toAccountId || undefined,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessageType('error')
        setMessage(data.error)
      } else {
        setMessageType('success')
        setMessage(data.message)
        setTransactionForm({ type: 'deposit', amount: '', description: '', toAccountId: '' })
        fetchAccounts()
        setTimeout(() => setShowTransactionModal(false), 1500)
      }
    } catch {
      setMessageType('error')
      setMessage('Network error')
    } finally {
      setTransactionLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handlePortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    setPortfolioLoading(true)
    setMessage('')
    try {
      const token = localStorage.getItem('token')
      const body: Record<string, unknown> = {
        action: portfolioForm.action,
        symbol: portfolioForm.symbol.toUpperCase(),
        shares: parseFloat(portfolioForm.shares),
      }
      if (portfolioForm.action === 'buy') {
        body.price = parseFloat(portfolioForm.price)
      }
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessageType('error')
        setMessage(data.error)
      } else {
        setMessageType('success')
        setMessage(data.message)
        setPortfolioForm({ action: 'buy', symbol: '', shares: '', price: '' })
        fetchPortfolios()
        setTimeout(() => setShowPortfolioModal(false), 1500)
      }
    } catch {
      setMessageType('error')
      setMessage('Network error')
    } finally {
      setPortfolioLoading(false)
    }
  }

  const stockNames: Record<string, string> = {
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corp.',
    GOOGL: 'Alphabet Inc.',
    TSLA: 'Tesla Inc.',
    AMZN: 'Amazon.com Inc.',
    NVDA: 'NVIDIA Corp.',
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const allTransactions = accounts.flatMap(acc => acc.transactions)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const chartData = [
    { month: 'Sep', balance: 800 },
    { month: 'Oct', balance: 950 },
    { month: 'Nov', balance: 1100 },
    { month: 'Dec', balance: 900 },
    { month: 'Jan', balance: 1200 },
    { month: 'Feb', balance: totalBalance },
  ]

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading your accounts...</div>
    </div>
  )

  const tabLabels: Record<string, string> = {
    overview: 'Overview',
    transactions: 'Transactions',
    portfolio: 'Portfolio',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-base font-semibold tracking-tight">Banking Platform</h1>
            <div className="flex items-center gap-1">
              {['overview', 'transactions', 'portfolio'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user?.name || user?.email}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Total Balance */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-1">Total Balance</p>
              <h2 className="text-4xl font-semibold tracking-tight mb-4">
                AUD {totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'deposit'}); setShowTransactionModal(true); setMessage('') }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Deposit
                </button>
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'withdrawal'}); setShowTransactionModal(true); setMessage('') }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'transfer'}); setShowTransactionModal(true); setMessage('') }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Account Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(account => (
                <div key={account.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">{account.accountType}</p>
                      <p className="text-slate-500 text-xs mt-1 font-mono">{account.accountNumber}</p>
                    </div>
                    <span className="text-green-400 text-xs font-medium">Active</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {account.currency} {account.balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            {/* Balance Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-sm font-medium mb-1">Balance Trend</h3>
              <p className="text-slate-500 text-xs mb-4">Last 6 months</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '6px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" fill="url(#balanceGradient)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Transactions */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Recent Transactions</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                  View all
                </button>
              </div>
              {allTransactions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
              ) : (
                <div>
                  {allTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                          tx.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {tx.type === 'deposit' ? 'D' : tx.type === 'withdrawal' ? 'W' : 'T'}
                        </div>
                        <div>
                          <p className="text-sm">{tx.description}</p>
                          <p className="text-slate-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('en-AU')}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} AUD
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-medium">All Transactions</h3>
              <button
                onClick={() => { setShowTransactionModal(true); setMessage('') }}
                className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                New Transaction
              </button>
            </div>
            {allTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No transactions yet</p>
            ) : (
              <div>
                {allTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3.5 border-b border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                        tx.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.type === 'deposit' ? 'D' : tx.type === 'withdrawal' ? 'W' : 'T'}
                      </div>
                      <div>
                        <p className="text-sm">{tx.description}</p>
                        <p className="text-slate-500 text-xs capitalize">{tx.type} &middot; {new Date(tx.createdAt).toLocaleString('en-AU')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} AUD
                      </p>
                      <span className="text-xs text-slate-500 capitalize">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Investment Portfolio</h3>
                <button
                  onClick={() => { setShowPortfolioModal(true); setMessage('') }}
                  className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  Trade
                </button>
              </div>
              {portfolios.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-12">No holdings yet. Use the Trade button to buy stocks.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800">
                        <th className="text-left py-2 font-medium">Symbol</th>
                        <th className="text-left py-2 font-medium">Name</th>
                        <th className="text-right py-2 font-medium">Shares</th>
                        <th className="text-right py-2 font-medium">Avg. Price</th>
                        <th className="text-right py-2 font-medium">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolios.map(stock => (
                        <tr key={stock.id} className="border-b border-slate-800/50 last:border-0">
                          <td className="py-3 font-medium">{stock.symbol}</td>
                          <td className="py-3 text-slate-400">{stockNames[stock.symbol] || stock.symbol}</td>
                          <td className="py-3 text-right font-mono">{stock.shares}</td>
                          <td className="py-3 text-right font-mono">${stock.avgPrice.toFixed(2)}</td>
                          <td className="py-3 text-right font-medium">${(stock.shares * stock.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Portfolio Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-sm font-medium mb-4">Portfolio Performance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={(() => {
                  const total = portfolios.reduce((sum, p) => sum + p.shares * p.avgPrice, 0)
                  return [
                    { month: 'Sep', value: total * 0.85 },
                    { month: 'Oct', value: total * 0.9 },
                    { month: 'Nov', value: total * 0.88 },
                    { month: 'Dec', value: total * 1.05 },
                    { month: 'Jan', value: total * 1.1 },
                    { month: 'Feb', value: total },
                  ]
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '6px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} dot={{ fill: '#10B981', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-medium">New Transaction</h3>
              <button onClick={() => { setShowTransactionModal(false); setMessage('') }} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {message && (
              <div className={`rounded-md p-3 mb-4 text-sm ${
                messageType === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['deposit', 'withdrawal', 'transfer'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTransactionForm({...transactionForm, type})}
                    className={`py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                      transactionForm.type === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Amount (AUD)</label>
                <input
                  type="number"
                  value={transactionForm.amount}
                  onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Description</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g. Salary, Rent"
                />
              </div>

              {transactionForm.type === 'transfer' && (
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Recipient Account ID</label>
                  <input
                    type="text"
                    value={transactionForm.toAccountId}
                    onChange={e => setTransactionForm({...transactionForm, toAccountId: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Account ID"
                    required={transactionForm.type === 'transfer'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={transactionLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
              >
                {transactionLoading ? 'Processing...' : 'Confirm Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Trade Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-medium">Trade Stock</h3>
              <button onClick={() => { setShowPortfolioModal(false); setMessage('') }} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {message && (
              <div className={`rounded-md p-3 mb-4 text-sm ${
                messageType === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handlePortfolio} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['buy', 'sell'] as const).map(action => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setPortfolioForm({ ...portfolioForm, action })}
                    className={`py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                      portfolioForm.action === action
                        ? action === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Stock Symbol</label>
                <input
                  type="text"
                  value={portfolioForm.symbol}
                  onChange={e => setPortfolioForm({ ...portfolioForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  placeholder="AAPL"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">Number of Shares</label>
                <input
                  type="number"
                  value={portfolioForm.shares}
                  onChange={e => setPortfolioForm({ ...portfolioForm, shares: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="10"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              {portfolioForm.action === 'buy' && (
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Price per Share (USD)</label>
                  <input
                    type="number"
                    value={portfolioForm.price}
                    onChange={e => setPortfolioForm({ ...portfolioForm, price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="182.50"
                    required={portfolioForm.action === 'buy'}
                    min="0.01"
                    step="0.01"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={portfolioLoading}
                className={`w-full disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-md transition-colors ${
                  portfolioForm.action === 'buy'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {portfolioLoading ? 'Processing...' : portfolioForm.action === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
