/**
 * Greek stock market — fictional companies inspired by real Greek sectors.
 * Prices fluctuate each game tick cycle based on volatility.
 * Dividends pay out periodically.
 */

export const stocks = [
  {
    id: 'olymp_bank',
    name: 'Τράπεζα Ολύμπου',
    ticker: 'ΟΛΥΜΠ',
    sector: 'Τραπεζικά',
    icon: '🏦',
    basePrice: 12.50,
    volatility: 0.03,     // 3% max change per tick
    dividendRate: 0.02,   // 2% quarterly dividend
  },
  {
    id: 'aegean_ship',
    name: 'Αιγαίο Ναυτιλία',
    ticker: 'ΑΙΓΝ',
    sector: 'Ναυτιλία',
    icon: '🚢',
    basePrice: 28.00,
    volatility: 0.06,
    dividendRate: 0.03,
  },
  {
    id: 'attica_telecom',
    name: 'Αττική Τηλεπικοινωνίες',
    ticker: 'ΑΤΤΚ',
    sector: 'Τεχνολογία',
    icon: '📱',
    basePrice: 8.75,
    volatility: 0.05,
    dividendRate: 0.01,
  },
  {
    id: 'crete_oil',
    name: 'Κρήτη Πετρέλαια',
    ticker: 'ΚΡΗΤ',
    sector: 'Ενέργεια',
    icon: '⛽',
    basePrice: 45.00,
    volatility: 0.07,
    dividendRate: 0.04,
  },
  {
    id: 'delphi_pharma',
    name: 'Δελφοί Φαρμακευτική',
    ticker: 'ΔΕΛΦ',
    sector: 'Υγεία',
    icon: '💊',
    basePrice: 15.00,
    volatility: 0.04,
    dividendRate: 0.015,
  },
  {
    id: 'sparta_construction',
    name: 'Σπάρτη Κατασκευές',
    ticker: 'ΣΠΑΡ',
    sector: 'Κατασκευές',
    icon: '🏗️',
    basePrice: 5.50,
    volatility: 0.08,
    dividendRate: 0.005,
  },
  {
    id: 'mykonos_tourism',
    name: 'Μύκονος Τουρισμός',
    ticker: 'ΜΥΚΝ',
    sector: 'Τουρισμός',
    icon: '🏖️',
    basePrice: 20.00,
    volatility: 0.06,
    dividendRate: 0.025,
  },
  {
    id: 'thessaly_agri',
    name: 'Θεσσαλία Αγροτικά',
    ticker: 'ΘΕΣΣ',
    sector: 'Αγροτικά',
    icon: '🌾',
    basePrice: 3.20,
    volatility: 0.04,
    dividendRate: 0.035,
  },
]

export function getStockById(id) {
  return stocks.find(s => s.id === id) || null
}
