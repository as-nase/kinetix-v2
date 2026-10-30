import { useState } from "react"
import { useLocation } from "react-router-dom"
import { ArrowRight, Menu, Minus, Plus, Search, ShoppingBag, X, Zap } from "lucide-react"
import type { CartItem, Product } from "./storeData"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

export function StorefrontNav({ cart, onQuantity, products }: { cart: CartItem[]; onQuantity: (id: string, change: number) => void; products: Product[] }) {
  const location = useLocation()
  const home = location.pathname === "/" ? "" : "/"
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const matches = search.trim() ? products.filter((product) => `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.toLowerCase())) : []

  return <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 md:px-10">
        <a href={`${home}#top`} aria-label="KINETIX home" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Zap size={19} fill="currentColor" /></span>
          <span className="text-lg font-extrabold tracking-[0.13em]">KINETIX</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex" aria-label="Main navigation">
          <a className="transition-colors hover:text-primary" href={`${home}#best-sellers`}>Shop</a><a className="transition-colors hover:text-primary" href={`${home}#categories`}>Categories</a><a className="transition-colors hover:text-primary" href={`${home}#about`}>About</a><a className="transition-colors hover:text-primary" href={`${home}#contact`}>Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          {searchOpen && <div className="absolute left-4 right-4 top-[84px] z-50 sm:relative sm:left-auto sm:right-auto sm:top-auto"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find your setup upgrade." aria-label="Search products" className="h-10 w-full rounded-lg sm:w-56 border border-white/10 bg-white/[0.06] px-3 text-sm text-foreground outline-none transition focus:border-primary/70" />{search && <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#111925] shadow-2xl">{matches.length ? matches.map((product) => <a key={product.id} href={`/products/${product.id}`} onClick={() => { setSearchOpen(false); setSearch("") }} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/[0.06]"><span>{product.name}</span><span className="text-primary">{money(product.price)}</span></a>) : <p className="px-4 py-3 text-sm text-muted-foreground">No gear found. Try another search.</p>}</div>}</div>}
          <button type="button" aria-label={searchOpen ? "Close search" : "Open search"} onClick={() => { setSearchOpen(!searchOpen); setSearch("") }} className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"><Search size={19} /></button>
          <button type="button" aria-label={`Open cart, ${count} items`} onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-lg text-foreground transition hover:bg-white/[0.06]"><ShoppingBag size={20} />{count > 0 && <span className="absolute -right-1 -top-1 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>}</button>
          <button type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)} className="ml-1 grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-foreground md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {menuOpen && <nav className="grid gap-1 border-t border-white/10 px-5 py-3 text-sm md:hidden">{[["Shop", "#best-sellers"], ["Categories", "#categories"], ["About", "#about"], ["Contact", "#contact"]].map(([label, href]) => <a key={label} href={`${home}${href}`} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground">{label}</a>)}</nav>}
    </header>
    {cartOpen && <div className="fixed inset-0 z-50"><button aria-label="Close cart" className="absolute inset-0 bg-black/65" onClick={() => setCartOpen(false)} /><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0E1520] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div><h2 className="text-xl font-bold">Your cart</h2><p className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? "item" : "items"}</p></div><button onClick={() => setCartOpen(false)} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"><X size={19} /></button></div>
      {cart.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><span className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary"><ShoppingBag size={27} /></span><h3 className="text-lg font-semibold">Your cart is taking a breather.</h3><p className="mt-2 max-w-xs text-sm text-muted-foreground">Add a setup upgrade and it’ll show up here.</p><button onClick={() => setCartOpen(false)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110">Explore gear <ArrowRight size={16} /></button></div> : <><div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{cart.map(({ product, quantity }) => <article key={product.id} className="flex gap-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-3"><img src={product.image} alt={product.name} className="h-20 w-20 rounded-lg object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{product.name}</h3><span className="text-sm font-semibold">{money(product.price * quantity)}</span></div><p className="mt-1 text-xs text-muted-foreground">{money(product.price)} each</p><div className="mt-3 inline-flex items-center gap-3 rounded-md border border-white/10 px-2 py-1"><button aria-label={`Remove one ${product.name}`} onClick={() => onQuantity(product.id, -1)} className="text-muted-foreground hover:text-foreground"><Minus size={14} /></button><span className="min-w-4 text-center text-xs">{quantity}</span><button aria-label={`Add one ${product.name}`} onClick={() => onQuantity(product.id, 1)} className="text-muted-foreground hover:text-foreground"><Plus size={14} /></button></div></div></article>)}</div><div className="border-t border-white/10 px-6 py-5"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><strong>{money(subtotal)}</strong></div><p className="mt-2 text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p><button className="mt-5 w-full rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-110" onClick={() => setCartOpen(false)}>Continue shopping</button></div></>}
    </aside></div>}
  </>
}
