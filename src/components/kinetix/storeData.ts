export type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
}

export type CartItem = { product: Product; quantity: number }

export const products: Product[] = [
  { id: "pulse-pro", name: "Kinetix Pulse Pro", description: "Heated, percussion massage posture-correcting desk cushion", price: 149, image: "/assets/product-kinetix-pulse-pro.webp", category: "Posture & Recovery" },
  { id: "lumabar-ultra", name: "LumaBar Ultra", description: "Monitor light bar", price: 89, image: "/assets/product-lumabar-ultra.webp", category: "Desk Lighting" },
  { id: "aerowrist-mag", name: "AeroWrist Mag", description: "Magnetic ergonomic wrist rest", price: 39, image: "/assets/product-aerowrist-mag.webp", category: "Posture & Recovery" },
  { id: "zendesk-mat", name: "ZenDesk Mat", description: "Felt & vegan leather desk pad", price: 59, image: "/assets/product-zendesk-mat.webp", category: "Surface & Mats" },
  { id: "thermomug-smart", name: "ThermoMug Smart", description: "Temperature-controlled mug", price: 119, image: "/assets/product-thermomug-smart.webp", category: "Smart Drinkware" },
]

export const categories = [
  { title: "Posture & Recovery", copy: "Support for the long haul.", image: "/assets/category-posture-recovery.webp", id: "posture-recovery", span: "md:col-span-7" },
  { title: "Desk Lighting", copy: "Focus without the glare.", image: "/assets/category-desk-lighting.webp", id: "desk-lighting", span: "md:col-span-5" },
  { title: "Surface & Mats", copy: "A better foundation for every move.", image: "/assets/category-surface-mats.webp", id: "surface-mats", span: "md:col-span-5" },
  { title: "Smart Drinkware", copy: "Your drink, at your temperature.", image: "/assets/category-smart-drinkware.webp", id: "smart-drinkware", span: "md:col-span-7" },
]
