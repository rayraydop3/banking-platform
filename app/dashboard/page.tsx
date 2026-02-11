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
        setMessage(`❌ ${data.error}`)
      } else {
        setMessage(`✅ ${data.message}`)
        setTransactionForm({ type: 'deposit', amount: '', description: '', toAccountId: '' })
        fetchAccounts()
        setTimeout(() => setShowTransactionModal(false), 1500)
      }
    } catch {
      setMessage('❌ 网络错误')
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
        setMessage(`❌ ${data.error}`)
      } else {
        setMessage(`✅ ${data.message}`)
        setPortfolioForm({ action: 'buy', symbol: '', shares: '', price: '' })
        fetchPortfolios()
        setTimeout(() => setShowPortfolioModal(false), 1500)
      }
    } catch {
      setMessage('❌ 网络错误')
    } finally {
      setPortfolioLoading(false)
    }
  }

  const stockNames: Record<string, string> = {
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft',
    GOOGL: 'Alphabet',
    TSLA: 'Tesla',
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl animate-pulse">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🏦 Banking Platform</h1>
          <div className="flex items-center gap-6">
            {['overview', 'transactions', 'portfolio'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-medium capitalize transition-colors ${
                  activeTab === tab ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
            <span className="text-gray-400 text-sm">Hi, {user?.name}</span>
            <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Total Balance Hero */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8">
              <p className="text-blue-200 text-sm mb-2">Total Balance</p>
              <h2 className="text-5xl font-bold mb-3">
                AUD {totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'deposit'}); setShowTransactionModal(true) }}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Deposit
                </button>
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'withdrawal'}); setShowTransactionModal(true) }}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  - Withdraw
                </button>
                <button
                  onClick={() => { setTransactionForm({...transactionForm, type: 'transfer'}); setShowTransactionModal(true) }}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  ↔ Transfer
                </button>
              </div>
            </div>

            {/* Account Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(account => (
                <div key={account.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-widest">{account.accountType}</p>
                      <p className="text-gray-500 text-xs mt-1 font-mono">{account.accountNumber}</p>
                    </div>
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">● Active</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {account.currency} {account.balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            {/* Balance Chart */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-1">Balance Trend</h3>
              <p className="text-gray-400 text-sm mb-4">6 month overview</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" fill="url(#balanceGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-blue-400 text-sm hover:text-blue-300">
                  View all →
                </button>
              </div>
              {allTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-1">
                  {allTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                          tx.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : '↔'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.description}</p>
                          <p className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('en-AU')}</p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} AUD
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
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">All Transactions</h3>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
              >
                + New Transaction
              </button>
            </div>
            {allTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No transactions yet</p>
            ) : (
              <div className="space-y-1">
                {allTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-4 border-b border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : '↔'}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-gray-500 text-xs">{tx.type} · {new Date(tx.createdAt).toLocaleString('en-AU')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} AUD
                      </p>
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        {tx.status}
                      </span>
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
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Investment Portfolio</h3>
                <button
                  onClick={() => { setShowPortfolioModal(true); setMessage('') }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                >
                  + Buy / Sell
                </button>
              </div>
              {portfolios.length === 0 ? (
                <p className="text-gray-500 text-center py-12">暂无持仓，点击上方按钮买入</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {portfolios.map(stock => (
                    <div key={stock.id} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-lg">{stock.symbol}</span>
                      </div>
                      <p className="text-gray-400 text-xs mb-2">{stockNames[stock.symbol] || stock.symbol}</p>
                      <p className="font-semibold">${stock.avgPrice.toFixed(2)}</p>
                      <p className="text-gray-500 text-xs">{stock.shares} shares</p>
                      <p className="text-blue-400 text-sm font-medium mt-1">
                        ${(stock.shares * stock.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Chart */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">New Transaction</h3>
              <button onClick={() => { setShowTransactionModal(false); setMessage('') }} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {message && (
              <div className={`rounded-lg p-3 mb-4 text-sm ${
                message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              {/* Transaction Type */}
              <div className="grid grid-cols-3 gap-2">
                {['deposit', 'withdrawal', 'transfer'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTransactionForm({...transactionForm, type})}
                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      transactionForm.type === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Amount (AUD)</label>
                <input
                  type="number"
                  value={transactionForm.amount}
                  onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Description</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Salary, Rent..."
                />
              </div>

              {transactionForm.type === 'transfer' && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">To Account ID</label>
                  <input
                    type="text"
                    value={transactionForm.toAccountId}
                    onChange={e => setTransactionForm({...transactionForm, toAccountId: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Account ID"
                    required={transactionForm.type === 'transfer'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={transactionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {transactionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Buy/Sell Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Buy / Sell Stock</h3>
              <button onClick={() => { setShowPortfolioModal(false); setMessage('') }} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {message && (
              <div className={`rounded-lg p-3 mb-4 text-sm ${
                message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
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
                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      portfolioForm.action === action
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">股票代码 (如 AAPL, MSFT)</label>
                <input
                  type="text"
                  value={portfolioForm.symbol}
                  onChange={e => setPortfolioForm({ ...portfolioForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AAPL"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">股数</label>
                <input
                  type="number"
                  value={portfolioForm.shares}
                  onChange={e => setPortfolioForm({ ...portfolioForm, shares: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              {portfolioForm.action === 'buy' && (
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">单价 (USD)</label>
                  <input
                    type="number"
                    value={portfolioForm.price}
                    onChange={e => setPortfolioForm({ ...portfolioForm, price: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {portfolioLoading ? '处理中...' : '确认'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}