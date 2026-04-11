import { defineStore } from 'pinia'
import { items } from '../data/items'
import { fakeUsers } from '../data/fakeUsers'

// Static fake marketplace listings (regenerated each session)
function generateFakeListings() {
  const sellers = fakeUsers.slice(0, 10)
  const sellableItems = items.filter(i => i.sellPrice > 0)
  const listings = []
  const used = new Set()

  const picks = [
    'kitchen_knife', 'bat', 'switchblade', 'pistol_small',
    'leather_jacket', 'vest_light', 'vest_medium',
    'bandages', 'first_aid', 'painkillers', 'surgical_kit',
    'alcohol', 'hash', 'cocaine', 'cigarettes',
    'watch_cheap', 'car_radio', 'jewelry', 'laptop', 'ancient_coin',
  ]

  picks.forEach((itemId, i) => {
    const item = sellableItems.find(it => it.id === itemId)
    if (!item || used.has(itemId)) return
    used.add(itemId)
    const seller = sellers[i % sellers.length]
    const markup = 1.1 + (Math.sin(i * 7.3) * 0.5 + 0.5) * 0.4 // 110-150%
    const price = Math.ceil(item.sellPrice * markup)
    listings.push({
      id: `fl_${itemId}`,
      itemId: item.id,
      itemName: item.name,
      itemIcon: item.icon,
      itemType: item.type,
      itemRarity: item.rarity,
      price,
      quantity: 1 + (i % 3),
      sellerName: seller.nickname,
      sellerIcon: seller.icon,
    })
  })
  return listings
}

export const useBazaarStore = defineStore('bazaar', {
  state: () => ({
    // Player's own sell listings
    myListings: [],
    // Track which fake listings the player has already bought (by listing id)
    boughtFakeIds: [],
    nextId: 1,
  }),

  getters: {
    fakeListings() {
      const all = generateFakeListings()
      return all.filter(l => !this.boughtFakeIds.includes(l.id))
    },

    pendingSales(state) {
      // Listings that have been "sold" (auto-filled after delay) — simplified:
      // we consider a listing "sold" if it's been up for more than 5 minutes
      const now = Date.now()
      return state.myListings.filter(l => now - l.postedAt >= 5 * 60 * 1000 && !l.collected)
    },
  },

  actions: {
    postListing(itemId, itemData, price, quantity) {
      if (this.myListings.filter(l => !l.collected).length >= 5) return false
      this.myListings.push({
        id: this.nextId++,
        itemId,
        itemName: itemData.name,
        itemIcon: itemData.icon,
        itemRarity: itemData.rarity,
        price,
        quantity,
        postedAt: Date.now(),
        collected: false,
        sold: false,
      })
      return true
    },

    cancelListing(id) {
      const idx = this.myListings.findIndex(l => l.id === id)
      if (idx !== -1) this.myListings.splice(idx, 1)
    },

    markSold(id) {
      const listing = this.myListings.find(l => l.id === id)
      if (listing) {
        listing.sold = true
        listing.collected = true
      }
    },

    collectSale(id) {
      const listing = this.myListings.find(l => l.id === id)
      if (!listing || listing.collected) return 0
      listing.collected = true
      listing.sold = true
      return listing.price * listing.quantity
    },

    buyFakeListing(listingId) {
      if (!this.boughtFakeIds.includes(listingId)) {
        this.boughtFakeIds.push(listingId)
      }
    },

    getSerializable() {
      return {
        myListings: this.myListings.map(l => ({ ...l })),
        boughtFakeIds: [...this.boughtFakeIds],
        nextId: this.nextId,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.myListings) this.myListings = data.myListings
      if (data.boughtFakeIds) this.boughtFakeIds = data.boughtFakeIds
      if (data.nextId) this.nextId = data.nextId
    },
  },
})
