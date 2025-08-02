"use client"

import { create } from "zustand"

interface Order {
  id: string
  type: "buy" | "sell"
  price: number
  amount: number
  status: "pending" | "filled" | "cancelled"
  timestamp: Date
}

interface TradingStore {
  // Connection & Status
  botStatus: "running" | "paused" | "stopped"
  uptime: string

  // Trading Pair
  baseAsset: string
  quoteAsset: string
  currentPrice: number

  // Orders & Performance
  orders: Order[]
  totalOrders: number
  filledOrders: number
  pendingOrders: number
  totalPnL: number

  // Actions
  setBotStatus: (status: "running" | "paused" | "stopped") => void
  setBaseAsset: (asset: string) => void
  setQuoteAsset: (asset: string) => void
  updatePrice: (price: number) => void
}

// Mock orders data
const mockOrders: Order[] = [
  {
    id: "1",
    type: "buy",
    price: 2320,
    amount: 0.1,
    status: "pending",
    timestamp: new Date(),
  },
  {
    id: "2",
    type: "sell",
    price: 2380,
    amount: 0.1,
    status: "filled",
    timestamp: new Date(),
  },
  {
    id: "3",
    type: "buy",
    price: 2300,
    amount: 0.1,
    status: "filled",
    timestamp: new Date(),
  },
  {
    id: "4",
    type: "sell",
    price: 2400,
    amount: 0.1,
    status: "pending",
    timestamp: new Date(),
  },
  {
    id: "5",
    type: "buy",
    price: 2280,
    amount: 0.1,
    status: "cancelled",
    timestamp: new Date(),
  },
]

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Initial state
  botStatus: "stopped",
  uptime: "02:34:12",
  baseAsset: "ETH",
  quoteAsset: "USDT",
  currentPrice: 2340.5,
  orders: mockOrders,
  totalOrders: mockOrders.length,
  filledOrders: mockOrders.filter((o) => o.status === "filled").length,
  pendingOrders: mockOrders.filter((o) => o.status === "pending").length,
  totalPnL: 234.56,

  // Actions
  setBotStatus: (status) => set({ botStatus: status }),
  setBaseAsset: (asset) => set({ baseAsset: asset }),
  setQuoteAsset: (asset) => set({ quoteAsset: asset }),
  updatePrice: (price) => set({ currentPrice: price }),
}))

// Simulate real-time price updates
if (typeof window !== "undefined") {
  setInterval(() => {
    const store = useTradingStore.getState()
    const variation = (Math.random() - 0.5) * 10 // ±5 price variation
    const newPrice = Math.max(2200, Math.min(2500, store.currentPrice + variation))
    store.updatePrice(newPrice)
  }, 3000)
}
