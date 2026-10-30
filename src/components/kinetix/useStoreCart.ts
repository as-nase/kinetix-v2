import { useEffect, useState } from "react"
import { products, type CartItem } from "./storeData"

const CART_KEY = "kinetix-store-cart"

function readCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return []
      const value = entry as { id?: unknown; quantity?: unknown }
      const product = products.find((item) => item.id === value.id)
      const quantity = Number(value.quantity)
      return product && Number.isInteger(quantity) && quantity > 0 ? [{ product, quantity }] : []
    })
  } catch {
    return []
  }
}

export function useStoreCart() {
  const [cart, setCart] = useState<CartItem[]>(readCart)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart.map(({ product, quantity }) => ({ id: product.id, quantity }))))
  }, [cart])

  const addToCart = (id: string) => {
    const product = products.find((item) => item.id === id)
    if (!product) return
    setCart((current) => {
      const existing = current.find((item) => item.product.id === id)
      return existing
        ? current.map((item) => item.product.id === id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }]
    })
  }

  const changeQuantity = (id: string, change: number) => {
    setCart((current) => current.map((item) => item.product.id === id ? { ...item, quantity: item.quantity + change } : item).filter((item) => item.quantity > 0))
  }

  return { cart, addToCart, changeQuantity }
}
