"use client"

import { useState, useMemo, useEffect } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { OneInchToken, fetchWhitelistedTokens, searchTokens, getPopularTokens, SUPPORTED_CHAINS, SupportedChain } from "@/lib/oneinch-api"

// Fallback tokens when API fails
const FALLBACK_TOKENS: Record<number, OneInchToken[]> = {
  1: [ // Ethereum
    { symbol: "USDT", name: "Tether USD", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", address: "0xa0b86a33e6ba5f69b37c9fcb6e1d6b1f3d3a3e3d", decimals: 6 },
    { symbol: "WETH", name: "Wrapped Ethereum", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
    { symbol: "WPOL", name: "Polygon", address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", decimals: 18 },

  ],
  137: [ // Polygon
    { symbol: "WPOL", name: "Polygon", address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", decimals: 18 },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", decimals: 6 },
  ],
}

interface TokenSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  chainId?: number
  placeholder?: string
  className?: string
}

export function TokenSelect({ 
  value, 
  onValueChange, 
  chainId = SUPPORTED_CHAINS.ethereum,
  placeholder = "Select token...",
  className 
}: TokenSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [tokens, setTokens] = useState<OneInchToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tokens when chainId changes
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log(`TokenSelect: Loading tokens for chainId ${chainId}`)
        const fetchedTokens = await fetchWhitelistedTokens(chainId)
        console.log(`TokenSelect: Successfully loaded ${fetchedTokens.length} tokens`)
        setTokens(fetchedTokens)
      } catch (err) {
        console.error('TokenSelect: Failed to load tokens from API, using fallback:', err)
        // Use fallback tokens when API fails
        const fallbackTokens = FALLBACK_TOKENS[chainId] || FALLBACK_TOKENS[1] || []
        setTokens(fallbackTokens)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`API Error: ${errorMessage}. Using limited token list.`)
      } finally {
        setLoading(false)
      }
    }

    loadTokens()
  }, [chainId])

  const selectedToken = useMemo(() => {
    return tokens.find(token => token.symbol === value || token.address === value)
  }, [tokens, value])

  const filteredTokens = useMemo(() => {
    if (loading) return []
    
    const searched = searchTokens(tokens, searchQuery)
    
    // If no search query, show popular tokens first
    if (!searchQuery.trim()) {
      const popular = getPopularTokens(tokens)
      const remaining = tokens.filter(token => 
        !popular.some(p => p.address === token.address)
      ).slice(0, 50) // Limit to prevent performance issues
      
      return [...popular, ...remaining]
    }
    
    return searched.slice(0, 100) // Limit search results
  }, [tokens, searchQuery, loading])

  const handleSelect = (token: OneInchToken) => {
    onValueChange?.(token.symbol)
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={loading}
        >
          {selectedToken ? (
            <div className="flex items-center space-x-2">
              {selectedToken.logoURI && (
                <img 
                  src={selectedToken.logoURI} 
                  alt={selectedToken.symbol}
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
              <span className="font-medium">{selectedToken.symbol}</span>
              <span className="text-sm text-muted-foreground truncate">
                {selectedToken.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0 bg-popover border border-border shadow-lg token-dropdown-fix" 
        align="start"
        style={{ backgroundColor: 'hsl(var(--popover))' }}
      >
        <Command className="bg-popover token-dropdown-fix" style={{ backgroundColor: 'hsl(var(--popover))' }}>
          <div className="flex items-center border-b px-3 bg-popover" style={{ backgroundColor: 'hsl(var(--popover))' }}>
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 h-11 bg-popover text-popover-foreground"
              style={{ backgroundColor: 'hsl(var(--popover))' }}
            />
          </div>
          
          {loading ? (
            <div className="p-4 space-y-2 bg-popover">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-popover">
              {tokens.length > 0 ? (
                // Show warning but still show tokens
                <>
                  <div className="p-2 text-center text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-b">
                    {error}
                  </div>
                  <CommandGroup className="max-h-64 overflow-auto bg-popover">
                    {filteredTokens.map((token) => {
                      const isSelected = value === token.symbol || value === token.address
                      
                      return (
                        <CommandItem
                          key={token.address}
                          value={`${token.symbol} ${token.name} ${token.address}`}
                          onSelect={() => handleSelect(token)}
                          className="flex items-center space-x-2 px-2 py-2 bg-popover hover:bg-accent"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{token.symbol}</span>
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {token.name}
                              </div>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              ) : (
                // Show error when no tokens available
                <div className="p-4 text-center text-sm text-red-500 bg-popover">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <>
              <CommandEmpty className="bg-popover">No tokens found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto bg-popover">
                {!searchQuery.trim() && (
                  <div className="px-2 py-1 bg-popover">
                    <div className="flex items-center space-x-1 mb-2">
                      <Badge variant="secondary" className="text-xs">Popular</Badge>
                    </div>
                  </div>
                )}
                {filteredTokens.map((token) => {
                  const isSelected = value === token.symbol || value === token.address
                  const isPopular = !searchQuery.trim() && getPopularTokens(tokens).some(p => p.address === token.address)
                  
                  return (
                    <CommandItem
                      key={token.address}
                      value={`${token.symbol} ${token.name} ${token.address}`}
                      onSelect={() => handleSelect(token)}
                      className="flex items-center space-x-2 px-2 py-2 bg-popover hover:bg-accent"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {token.logoURI && (
                          <img 
                            src={token.logoURI} 
                            alt={token.symbol}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{token.symbol}</span>
                            {isPopular && (
                              <Badge variant="outline" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {token.name}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
