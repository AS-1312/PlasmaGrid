import { ethers } from 'ethers'
import { OneInchToken } from './oneinch-api'

export interface HotWallet {
  address: string
  privateKey: string
  balance: Record<string, string> // tokenAddress -> balance
}

export interface HotWalletStore {
  hotWallet: HotWallet | null
  balances: Record<string, string>
  balancesLoading: boolean
  fundingInProgress: boolean
  fundingError: string | null
  
  // Actions
  generateHotWallet: () => void
  fundHotWallet: (tokenAddress: string, amount: string, userAddress: string) => Promise<void>
  getHotWalletBalance: (tokenAddress: string, chainId: number) => Promise<string>
  refreshBalances: (tokens: OneInchToken[], chainId: number) => Promise<void>
}

class HotWalletManager {
  private static instance: HotWalletManager
  private wallet: HotWallet | null = null

  static getInstance(): HotWalletManager {
    if (!HotWalletManager.instance) {
      HotWalletManager.instance = new HotWalletManager()
    }
    return HotWalletManager.instance
  }

  generateWallet(): HotWallet {
    const randomWallet = ethers.Wallet.createRandom()
    this.wallet = {
      address: randomWallet.address,
      privateKey: randomWallet.privateKey,
      balance: {}
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('plasma_hot_wallet', JSON.stringify({
      address: this.wallet.address,
      privateKey: this.wallet.privateKey
    }))
    
    return this.wallet
  }

  loadWallet(): HotWallet | null {
    if (this.wallet) return this.wallet

    try {
      const stored = localStorage.getItem('plasma_hot_wallet')
      if (stored) {
        const walletData = JSON.parse(stored)
        this.wallet = {
          address: walletData.address,
          privateKey: walletData.privateKey,
          balance: {}
        }
        return this.wallet
      }
    } catch (error) {
      console.error('Failed to load hot wallet:', error)
    }
    
    return null
  }

  getWallet(): HotWallet | null {
    return this.loadWallet()
  }

  async getTokenBalance(tokenAddress: string, chainId: number): Promise<string> {
    if (!this.wallet) return '0'

    try {
      // Get RPC URL based on chain ID
      const rpcUrl = this.getRpcUrl(chainId)
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      
      if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        // Native token balance
        const balance = await provider.getBalance(this.wallet.address)
        return ethers.formatEther(balance)
      } else {
        // ERC20 token balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
          provider
        )
        
        const [balance, decimals] = await Promise.all([
          tokenContract.balanceOf(this.wallet.address),
          tokenContract.decimals()
        ])
        
        return ethers.formatUnits(balance, decimals)
      }
    } catch (error) {
      console.error('Failed to get token balance:', error)
      return '0'
    }
  }

  private getRpcUrl(chainId: number): string {
    const rpcUrls: Record<number, string> = {
      1: 'https://rpc.eth.gateway.fm',
      137: 'https://1rpc.io/matic',
      56: 'https://bsc-dataseed.binance.org',
      42161: 'https://arb1.arbitrum.io/rpc',
      10: 'https://mainnet.optimism.io',
      43114: 'https://api.avax.network/ext/bc/C/rpc',
      250: 'https://rpc.ftm.tools',
      8453: 'https://mainnet.base.org'
    }
    
    return rpcUrls[chainId] || rpcUrls[1]
  }

  async fundFromUserWallet(
    tokenAddress: string,
    amount: string,
    userAddress: string,
    signer: ethers.Signer
  ): Promise<string> {
    if (!this.wallet) throw new Error('Hot wallet not initialized')

    try {
      if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        // Transfer native token
        const tx = await signer.sendTransaction({
          to: this.wallet.address,
          value: ethers.parseEther(amount)
        })
        
        await tx.wait()
        return tx.hash
      } else {
        // Transfer ERC20 token
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          signer
        )
        
        const decimals = await tokenContract.decimals()
        const amountWei = ethers.parseUnits(amount, decimals)
        
        const tx = await tokenContract.transfer(this.wallet.address, amountWei)
        await tx.wait()
        
        return tx.hash
      }
    } catch (error) {
      console.error('Failed to fund hot wallet:', error)
      throw error
    }
  }

  clearWallet(): void {
    this.wallet = null
    localStorage.removeItem('plasma_hot_wallet')
  }
}

export const hotWalletManager = HotWalletManager.getInstance()
