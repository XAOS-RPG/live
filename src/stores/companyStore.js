import { defineStore } from 'pinia'

export const COMPANY_TYPES = [
  {
    id: 'periptero',
    name: 'Περίπτερο',
    icon: '🏪',
    description: 'Μια μικρή αλλά σταθερή επιχείρηση στη γειτονιά σου.',
    foundingCost: 5000,
    baseIncomePerHour: 50,
    maxLevel: 5,
    levelUpCostBase: 3000,
  },
  {
    id: 'estiatório',
    name: 'Εστιατόριο',
    icon: '🍽️',
    description: 'Εστιατόριο με φαγητό που "δεν ρωτάς από πού ήρθε".',
    foundingCost: 15000,
    baseIncomePerHour: 150,
    maxLevel: 5,
    levelUpCostBase: 10000,
  },
  {
    id: 'garage',
    name: 'Γκαράζ',
    icon: '🔧',
    description: 'Συνεργείο αυτοκινήτων — ορισμένα εξαρτήματα δεν έχουν απόδειξη.',
    foundingCost: 25000,
    baseIncomePerHour: 280,
    maxLevel: 5,
    levelUpCostBase: 18000,
  },
  {
    id: 'farmakeio',
    name: 'Φαρμακείο',
    icon: '💊',
    description: 'Φαρμακείο με... ευρεία ποικιλία προϊόντων.',
    foundingCost: 40000,
    baseIncomePerHour: 450,
    maxLevel: 5,
    levelUpCostBase: 30000,
  },
  {
    id: 'xenodocheio',
    name: 'Ξενοδοχείο',
    icon: '🏨',
    description: 'Πολυτελές ξενοδοχείο. Οι επισκέπτες δεν κάνουν ερωτήσεις.',
    foundingCost: 100000,
    baseIncomePerHour: 1200,
    maxLevel: 5,
    levelUpCostBase: 75000,
  },
]

const EMPLOYEE_COST = 500
const EMPLOYEE_INCOME_BONUS = 0.10 // +10% per employee
const MAX_EMPLOYEES_PER_LEVEL = 5
const MAX_OFFLINE_HOURS = 24

export const useCompanyStore = defineStore('company', {
  state: () => ({
    company: null,
    // company shape: { typeId, name, icon, level, employees, lastCollected, totalEarned }
  }),

  getters: {
    companyType(state) {
      if (!state.company) return null
      return COMPANY_TYPES.find(t => t.id === state.company.typeId) || null
    },

    pendingIncome(state) {
      if (!state.company || !this.companyType) return 0
      const type = this.companyType
      const now = Date.now()
      const lastCollected = state.company.lastCollected || now
      const elapsedMs = Math.min(now - lastCollected, MAX_OFFLINE_HOURS * 3600 * 1000)
      const elapsedHours = elapsedMs / 3600000
      const base = type.baseIncomePerHour * state.company.level
      const bonus = 1 + state.company.employees * EMPLOYEE_INCOME_BONUS
      return Math.floor(base * bonus * elapsedHours)
    },

    incomePerHour(state) {
      if (!state.company || !this.companyType) return 0
      const type = this.companyType
      const base = type.baseIncomePerHour * state.company.level
      const bonus = 1 + state.company.employees * EMPLOYEE_INCOME_BONUS
      return Math.floor(base * bonus)
    },

    maxEmployees(state) {
      if (!state.company) return 0
      return state.company.level * MAX_EMPLOYEES_PER_LEVEL
    },

    levelUpCost(state) {
      if (!state.company || !this.companyType) return Infinity
      const type = this.companyType
      return Math.floor(type.levelUpCostBase * Math.pow(2, state.company.level - 1))
    },

    isMaxLevel(state) {
      if (!state.company || !this.companyType) return false
      return state.company.level >= this.companyType.maxLevel
    },
  },

  actions: {
    foundCompany(typeId, playerCash) {
      const type = COMPANY_TYPES.find(t => t.id === typeId)
      if (!type || playerCash < type.foundingCost) return false
      this.company = {
        typeId,
        name: type.name,
        icon: type.icon,
        level: 1,
        employees: 0,
        lastCollected: Date.now(),
        totalEarned: 0,
      }
      return type.foundingCost
    },

    collectIncome() {
      if (!this.company) return 0
      const income = this.pendingIncome
      this.company.lastCollected = Date.now()
      this.company.totalEarned += income
      return income
    },

    levelUp(playerCash) {
      if (!this.company || this.isMaxLevel) return false
      const cost = this.levelUpCost
      if (playerCash < cost) return false
      this.company.level++
      return cost
    },

    hireEmployee(playerCash) {
      if (!this.company) return false
      if (this.company.employees >= this.maxEmployees) return false
      if (playerCash < EMPLOYEE_COST) return false
      this.company.employees++
      return EMPLOYEE_COST
    },

    fireEmployee() {
      if (!this.company || this.company.employees <= 0) return false
      this.company.employees--
      return true
    },

    getSerializable() {
      return {
        company: this.company ? { ...this.company } : null,
      }
    },

    hydrate(data) {
      if (!data) return
      if (data.company !== undefined) this.company = data.company
    },
  },
})

export { EMPLOYEE_COST }
