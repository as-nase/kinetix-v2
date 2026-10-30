import { useMemo } from "react"
import { StorefrontNav } from "@/components/kinetix/StorefrontNav"
import { BuiltForLongSessions, FiveBestSellers, ProductComparison, PulseProHero, SetupNewsletter, ShopByCategoryBento, StorefrontFooter } from "@/components/kinetix/StoreSections"
import { products } from "@/components/kinetix/storeData"
import { useStoreCart } from "@/components/kinetix/useStoreCart"

const Index = () => {
  const { cart, addToCart, changeQuantity } = useStoreCart()
  const storeProducts = useMemo(() => products, [])
  return <div className="min-h-screen bg-background text-foreground"><StorefrontNav cart={cart} onQuantity={changeQuantity} products={storeProducts} /><main><PulseProHero onAdd={addToCart} /><ShopByCategoryBento /><ProductComparison products={storeProducts} /><FiveBestSellers products={storeProducts} onAdd={addToCart} /><BuiltForLongSessions /><SetupNewsletter /></main><StorefrontFooter /></div>
}

export default Index
