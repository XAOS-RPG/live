import { defineStore } from 'pinia'
import { getItemById } from '../data/items'
import { fakeUsers } from '../data/fakeUsers'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useCraftingStore } from './craftingStore'

// ── Constants ────────────────────────────────────────────────────────────────
const SNIPE_WINDOW_MS    = 5 * 60 * 1000   // 5 min before end
const SNIPE_EXTENSION_MS = 5 * 60 * 1000   // extend by 5 min
const NPC_BID_INTERVAL_MS = 90 * 1000      // NPCs bid every ~90 s
const LISTING_FEE_RATE   = 0.05            // 5% of starting bid deducted upfront
const MAX_PLAYER_LISTINGS = 5

// Minimum increment: +5% of currentBid, minimum +€50
export function minNextBid(currentBid) {
  return currentBid + Math.max(50, Math.floor(currentBid * 0.05))
}

// Seed NPC listings for a fresh save
const INITIAL_NPC_LISTINGS = [
  { sellerId: 'fuser_8',  sellerName: 'xXDimitrisXx',      itemId: 'craft_kevlar_vest', startBid: 850,  durationH: 18 },
  { sellerId: 'fuser_13', sellerName: 'Kingpin_GR',         itemId: 'ak47',              startBid: 5500, durationH: 12 },
  { sellerId: 'fuser_7',  sellerName: 'Σπύρος_Underground', itemId: 'adrenaline',        startBid: 650,  durationH: 16 },
  { sellerId: 'fuser_9',  sellerName: 'GR_Enforcer',        itemId: 'craft_elec_blade',  startBid: 400,  durationH: 8  },
  { sellerId: 'fuser_10', sellerName: 'PeiraiosWolf',       itemId: 'ancient_vase',      startBid: 4500, durationH: 24 },
  { sellerId: 'fuser_12', sellerName: 'Δράκος_Αθηνών',     itemId: 'full_armor',        startBid: 8500, durationH: 24 },
]

// NPC pool for bidding (exclude sellers above)
const NPC_BIDDER_POOL = fakeUsers.filter(u =>
  !INITIAL_NPC_LISTINGS.some(l => l.sellerId === u.id)
)

function _buildListing({ id, sellerId, sellerName, itemId, startBid, durationH, craftMultiplier = null, nowMs }) {
  const item = getItemById(itemId)
  return {
    id,
    sellerId,
    sellerName,
    itemId,
    itemName:    item?.name  ?? itemId,
    itemIcon:    item?.icon  ?? '📦',
    itemRarity:  item?.rarity ?? 'common',
    craftMultiplier,
    startingBid: startBid,
    currentBid:  startBid,
    highestBidderId:   null,
    highestBidderName: null,
    bids: [],
    postedAt:   nowMs,
    expiresAt:  nowMs + durationH * 3_600_000,
    duration:   durationH * 3_600_000,
    status:     'active',   // 'active' | 'ended'
    winnerId:   null,
    winnerName: null,
    finalAmount: null,
    sellerCollected:  false,
    winnerCollected:  false,
    lastNpcBidAt: 0,
  }
}

let _nextId = 1
function _newId() { return `auction_${Date.now()}_${_nextId++}` }

export const useAuctionStore = defineStore('auction', {
  state: () => ({
    listings: [],          // AuctionListing[]
    initialized: false,
    // notifications to show in the UI (outbid alerts, won alerts)
    pendingAlerts: [],     // { type: 'outbid'|'won'|'sold', listingId, message }
  }),

  getters: {
    activeListings(state) {
      return state.listings.filter(l => l.status === 'active')
    },
    endedListings(state) {
      return state.listings.filter(l => l.status === 'ended')
    },
    myActiveListings(state) {
      const player = usePlayerStore()
      return state.listings.filter(l => l.sellerId === player.id && l.status === 'active')
    },
    myEndedListings(state) {
      const player = usePlayerStore()
      return state.listings.filter(l => l.sellerId === player.id && l.status === 'ended')
    },
    wonListings(state) {
      const player = usePlayerStore()
      return state.listings.filter(l => l.status === 'ended' && l.winnerId === player.id)
    },
    uncollectedWins(state) {
      const player = usePlayerStore()
      return state.listings.filter(l =>
        l.status === 'ended' && l.winnerId === player.id && !l.winnerCollected
      ).length
    },
    uncollectedSales(state) {
      const player = usePlayerStore()
      return state.listings.filter(l =>
        l.status === 'ended' && l.sellerId === player.id && !l.sellerCollected &&
        l.winnerId !== null
      ).length
    },
  },

  actions: {
    initAuction() {
      if (this.initialized) return
      this.initialized = true
      const nowMs = Date.now()
      for (const seed of INITIAL_NPC_LISTINGS) {
        const item = getItemById(seed.itemId)
        if (!item) continue
        this.listings.push(_buildListing({ ...seed, id: _newId(), nowMs }))
      }
    },

    // ── Player lists an item ─────────────────────────────────────────────
    listItem({ itemId, startBid, durationH }) {
      const player = usePlayerStore()
      const gameStore = useGameStore()

      if (this.myActiveListings.length >= MAX_PLAYER_LISTINGS) {
        return { ok: false, message: `Μέγιστο ${MAX_PLAYER_LISTINGS} ενεργές αγγελίες.` }
      }

      const item = getItemById(itemId)
      if (!item) return { ok: false, message: 'Άγνωστο αντικείμενο.' }

      const fee = Math.max(50, Math.floor(startBid * LISTING_FEE_RATE))
      if (player.cash < fee) {
        return { ok: false, message: `Χρειάζεται €${fee} ως προμήθεια καταχώρησης.` }
      }

      // Remove 1 item from inventory
      const inventoryStore = useInventoryStore()
      const removed = inventoryStore.removeItem(itemId, 1)
      if (!removed) return { ok: false, message: 'Δεν βρέθηκε το αντικείμενο στην τσέπη σου.' }

      player.removeCash(fee)
      player.logActivity(`🏪 Καταχώρηση δημοπρασίας: ${item.name} (προμήθεια €${fee})`, 'info')

      const craftingStore = useCraftingStore()
      const craftMultiplier = craftingStore.craftedBuffs?.[itemId] ?? null

      const nowMs = Date.now()
      const listing = _buildListing({
        id: _newId(),
        sellerId:   player.id,
        sellerName: player.name,
        itemId,
        startBid,
        durationH,
        craftMultiplier,
        nowMs,
      })
      this.listings.push(listing)
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Player places a bid ──────────────────────────────────────────────
    placeBid(listingId, amount) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const listing = this.listings.find(l => l.id === listingId)

      if (!listing || listing.status !== 'active') {
        return { ok: false, message: 'Η δημοπρασία δεν είναι ενεργή.' }
      }
      if (listing.sellerId === player.id) {
        return { ok: false, message: 'Δεν μπορείς να κάνεις προσφορά σε δική σου δημοπρασία.' }
      }
      if (amount < minNextBid(listing.currentBid)) {
        return { ok: false, message: `Ελάχιστη προσφορά: €${minNextBid(listing.currentBid)}` }
      }
      if (player.cash < amount) {
        return { ok: false, message: 'Δεν έχεις αρκετά χρήματα.' }
      }

      const nowMs = Date.now()

      // Refund previous highest bidder (direct cash assignment bypasses prestige mult)
      if (listing.highestBidderId === player.id) {
        // they are outbidding themselves — refund their last bid first
        player.cash += listing.currentBid
      } else if (listing.highestBidderId && listing.highestBidderId !== player.id) {
        // Another player was highest — but in single-player context this is just the player.
        // For NPC highest bidder — no real cash to refund, just state update.
        if (listing.highestBidderId === player.id) {
          player.cash += listing.currentBid
        }
        // NPCs don't need refunds
      }

      // Deduct new bid from player
      player.cash -= amount

      listing.bids.push({
        bidderId:   player.id,
        bidderName: player.name,
        amount,
        timestamp:  nowMs,
      })
      listing.currentBid       = amount
      listing.highestBidderId  = player.id
      listing.highestBidderName = player.name

      // Anti-snipe: if bid in final SNIPE_WINDOW_MS, extend
      const timeLeft = listing.expiresAt - nowMs
      if (timeLeft > 0 && timeLeft < SNIPE_WINDOW_MS) {
        listing.expiresAt = nowMs + SNIPE_EXTENSION_MS
        gameStore.addNotification('⏱️ Αντι-snipe: η δημοπρασία παρατάθηκε κατά 5 λεπτά!', 'info')
      }

      gameStore.addNotification(`Προσφορά €${amount} για ${listing.itemName}!`, 'success')
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Collect won item (winner) ────────────────────────────────────────
    collectWonItem(listingId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const listing = this.listings.find(l => l.id === listingId)

      if (!listing || listing.status !== 'ended') return { ok: false, message: 'Η δημοπρασία δεν έχει λήξει.' }
      if (listing.winnerId !== player.id) return { ok: false, message: 'Δεν είσαι ο νικητής.' }
      if (listing.winnerCollected) return { ok: false, message: 'Έχεις ήδη παραλάβει το αντικείμενο.' }

      const inventoryStore = useInventoryStore()
      inventoryStore.addItem(listing.itemId, 1)
      listing.winnerCollected = true

      const craftInfo = listing.craftMultiplier ? ` (x${listing.craftMultiplier.toFixed(2)} ποιότητα)` : ''
      player.logActivity(`🏆 Παραλαβή: ${listing.itemName}${craftInfo}`, 'success')
      gameStore.addNotification(`Παρέλαβες: ${listing.itemName}${craftInfo}!`, 'success')
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Collect sale proceeds (seller) ───────────────────────────────────
    collectSaleProceeds(listingId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const listing = this.listings.find(l => l.id === listingId)

      if (!listing || listing.status !== 'ended') return { ok: false, message: 'Η δημοπρασία δεν έχει λήξει.' }
      if (listing.sellerId !== player.id) return { ok: false, message: 'Δεν είσαι ο πωλητής.' }
      if (listing.sellerCollected) return { ok: false, message: 'Έχεις ήδη εισπράξει.' }
      if (!listing.winnerId) return { ok: false, message: 'Δεν υπήρξε νικητής.' }

      // Direct cash assignment — seller proceeds bypass prestige multiplication
      player.cash += listing.finalAmount
      listing.sellerCollected = true

      player.logActivity(`💰 Είσπραξη δημοπρασίας: ${listing.itemName} +€${listing.finalAmount}`, 'cash')
      gameStore.addNotification(`Εισέπραξες €${listing.finalAmount} από ${listing.itemName}!`, 'success')
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Cancel (only if no bids yet) ─────────────────────────────────────
    cancelListing(listingId) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      const listing = this.listings.find(l => l.id === listingId)

      if (!listing || listing.status !== 'active') return { ok: false, message: 'Η αγγελία δεν είναι ενεργή.' }
      if (listing.sellerId !== player.id) return { ok: false, message: 'Δεν είσαι ο πωλητής.' }
      if (listing.bids.length > 0) return { ok: false, message: 'Δεν μπορείς να ακυρώσεις αγγελία με προσφορές.' }

      // Return item to inventory
      useInventoryStore().addItem(listing.itemId, 1)
      listing.status = 'ended'
      listing.sellerCollected = true // nothing to collect

      gameStore.addNotification(`Η αγγελία για ${listing.itemName} ακυρώθηκε.`, 'info')
      gameStore.saveGame()
      return { ok: true }
    },

    // ── Game loop tick ───────────────────────────────────────────────────
    tickAuctions(nowMs) {
      const player = usePlayerStore()
      const gameStore = useGameStore()
      let changed = false

      for (const listing of this.listings) {
        if (listing.status !== 'active') continue

        // ── Expire check ──────────────────────────────────────────────
        if (nowMs >= listing.expiresAt) {
          listing.status = 'ended'
          changed = true

          if (listing.highestBidderId) {
            listing.winnerId   = listing.highestBidderId
            listing.winnerName = listing.highestBidderName
            listing.finalAmount = listing.currentBid

            // Notify player if they won
            if (listing.winnerId === player.id) {
              gameStore.addNotification(`🏆 Κέρδισες: ${listing.itemName} (€${listing.finalAmount})!`, 'success')
              this.pendingAlerts.push({ type: 'won', listingId: listing.id, message: `Κέρδισες ${listing.itemName}!` })
            }

            // Notify player if their listing sold
            if (listing.sellerId === player.id && listing.winnerId !== player.id) {
              gameStore.addNotification(`💰 Πουλήθηκε: ${listing.itemName} (€${listing.finalAmount})!`, 'success')
              this.pendingAlerts.push({ type: 'sold', listingId: listing.id, message: `${listing.itemName} πουλήθηκε!` })
            }
          } else {
            // No bids — return item to seller if seller is player
            if (listing.sellerId === player.id) {
              useInventoryStore().addItem(listing.itemId, 1)
              listing.sellerCollected = true
              gameStore.addNotification(`Η δημοπρασία για ${listing.itemName} έληξε χωρίς προσφορές. Επεστράφη.`, 'warning')
            }
          }
          continue
        }

        // ── NPC bidding simulation ────────────────────────────────────
        if (nowMs - listing.lastNpcBidAt < NPC_BID_INTERVAL_MS) continue
        // 30% chance per interval for NPC bid on NPC listings; 15% on player listings
        const bidChance = listing.sellerId === player.id ? 0.15 : 0.30
        if (Math.random() > bidChance) {
          listing.lastNpcBidAt = nowMs
          continue
        }

        // Don't bid if player is already highest
        if (listing.highestBidderId === player.id) {
          // 20% chance NPC outbids player
          if (Math.random() > 0.20) {
            listing.lastNpcBidAt = nowMs
            continue
          }
        }

        // Pick random NPC
        const npc = NPC_BIDDER_POOL[Math.floor(Math.random() * NPC_BIDDER_POOL.length)]
        if (!npc) continue

        // Don't let same NPC bid against itself
        if (listing.highestBidderId === npc.id) continue

        const bid = minNextBid(listing.currentBid)

        // If player was highest, refund them and notify
        if (listing.highestBidderId === player.id) {
          player.cash += listing.currentBid
          gameStore.addNotification(`😤 Ξεπεράστηκες! ${npc.nickname} έδωσε €${bid} για ${listing.itemName}`, 'warning')
          this.pendingAlerts.push({ type: 'outbid', listingId: listing.id, message: `${npc.nickname} σε ξεπέρασε στο ${listing.itemName}!` })
        }

        listing.bids.push({ bidderId: npc.id, bidderName: npc.nickname, amount: bid, timestamp: nowMs })
        listing.currentBid       = bid
        listing.highestBidderId  = npc.id
        listing.highestBidderName = npc.nickname
        listing.lastNpcBidAt     = nowMs

        // Anti-snipe for NPC bid too
        const timeLeft = listing.expiresAt - nowMs
        if (timeLeft > 0 && timeLeft < SNIPE_WINDOW_MS) {
          listing.expiresAt = nowMs + SNIPE_EXTENSION_MS
        }

        changed = true
      }

      if (changed) gameStore.saveGame()
    },

    dismissAlert(index) {
      this.pendingAlerts.splice(index, 1)
    },

    // ── Persistence ──────────────────────────────────────────────────────
    getSerializable() {
      return {
        listings:    this.listings,
        initialized: this.initialized,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.listings)    this.listings    = data.listings
      if (data.initialized) this.initialized = data.initialized
    },
  },
})
