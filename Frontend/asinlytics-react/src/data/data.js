export const SELLERS = [
  { name: "QuickShip India",  loc: "Mumbai, MH",    price: 2199, type: "FBA", region: "West",  trend: "↑ Growing",   products: 48, sales: "₹12.4L" },
  { name: "FastDelivery Pvt", loc: "Delhi, DL",     price: 2350, type: "FBA", region: "North", trend: "↓ Declining", products: 32, sales: "₹9.1L"  },
  { name: "PrimeDeals India", loc: "Bangalore, KA", price: 2499, type: "FBA", region: "South", trend: "↑ Growing",   products: 76, sales: "₹21.7L" },
  { name: "DirectSource",     loc: "Pune, MH",      price: 2599, type: "FBM", region: "West",  trend: "↓ Declining", products: 21, sales: "₹5.3L"  },
  { name: "BearingWorld",     loc: "Chennai, TN",   price: 2420, type: "FBM", region: "South", trend: "→ Stable",    products: 55, sales: "₹14.2L" },
  { name: "SKF Authorized",   loc: "Kolkata, WB",   price: 2750, type: "FBA", region: "East",  trend: "→ Stable",    products: 90, sales: "₹28.9L" },
];

export const INITIAL_ALERTS = [
  { id: 1, icon: "⚠️", title: "Competitor Undercut",    desc: "QuickShip India dropped to ₹2,199 on ASIN B08XYZ2 — below your price by ₹51.", time: "2 min ago",  sev: "high", read: false },
  { id: 2, icon: "📈", title: "Price Spike Detected",   desc: "B07ABC increased 15% across 4 Delhi sellers. Opportunity window open.",          time: "18 min ago", sev: "med",  read: false },
  { id: 3, icon: "👤", title: "New Competitor Entered", desc: "3 new sellers detected for B09DEF in Bangalore region.",                          time: "45 min ago", sev: "low",  read: false },
  // { id: 4, icon: "📦", title: "Regional Stock Shortage",desc: "Low inventory warning in North India (Mumbai warehouses).",                        time: "1 hr ago",   sev: "med",  read: false },
];

export const INITIAL_ASINS = [
  { asin: "B08XYZ2",  name: "SKF 6205 Bearing", sellers: 12, lowest: "₹2,199", scraped: "2 min ago"  },
  { asin: "B07ABCDE", name: "SKF 6305 Bearing", sellers: 8,  lowest: "₹1,850", scraped: "2 min ago"  },
  { asin: "B09FGHIJ", name: "FAG 6206 Bearing", sellers: 5,  lowest: "₹2,100", scraped: "30 min ago" },
];

export const INITIAL_RULES = [
  { name: "Beat Lowest FBA",  asin: "B08XYZ2",  strategy: "Competitive", minMargin: "5", lastRun: "2 min ago"  },
  { name: "Margin Protector", asin: "B07ABCDE", strategy: "Margin-First", minMargin: "12",  lastRun: "32 min ago" },
];

export const TD = {
  "7d":  { labels: ["Mar 24","Mar 25","Mar 26","Mar 27","Mar 28","Mar 29","Mar 30"], mine: [2300,2280,2310,2250,2230,2220,2249], market: [2450,2420,2400,2390,2380,2370,2380] },
  "30d": { labels: ["Mar 1","Mar 5","Mar 10","Mar 15","Mar 20","Mar 25","Mar 30"],   mine: [2400,2380,2360,2330,2300,2270,2249], market: [2550,2520,2500,2480,2450,2420,2380] },
  "90d": { labels: ["Jan","Jan W3","Feb","Feb W3","Mar","Mar W2","Mar W4"],           mine: [2600,2550,2500,2460,2420,2350,2249], market: [2750,2700,2650,2600,2550,2480,2380] },
};

export const REGDATA = {
  north: { name: "North India", cities: "Delhi · Chandigarh · Lucknow · Jaipur",         avg: "₹2,350", low: "₹2,280", sel: "38" },
  south: { name: "South India", cities: "Chennai · Bangalore · Hyderabad · Kochi",        avg: "₹2,290", low: "₹2,210", sel: "41" },
  west:  { name: "West India",  cities: "Mumbai · Pune · Ahmedabad · Surat",              avg: "₹2,310", low: "₹2,199", sel: "29" },
  east:  { name: "East India",  cities: "Kolkata · Bhubaneswar · Patna · Ranchi",         avg: "₹2,480", low: "₹2,400", sel: "19" },
};

export const META = {
  dashboard: { t: "Dashboard",          s: "Competitive pricing intelligence · India" },
  asin:      { t: "ASIN Tracker",       s: "Monitor individual products"              },
  sellers:   { t: "Seller Intelligence",s: "Analyze competitor profiles"              },
  trends:    { t: "Price Trends",       s: "Historical price movements"              },
  reprice:   { t: "Reprice Engine",     s: "Dynamic pricing recommendations"         },
  regions:   { t: "Regional Insights",  s: "Pricing across India"                    },
  alerts:    { t: "Alerts Center",      s: "Notifications requiring attention"       },
  settings:  { t: "Settings",           s: "Configure your dashboard"                },
};

export const CHART_OPTIONS = {
  responsive: true,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { labels: { color: "#5e7296", font: { family: "JetBrains Mono", size: 10 }, boxWidth: 12 } },
    tooltip: {
      backgroundColor: "#0e1320", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1,
      titleColor: "#dde6f5", bodyColor: "#8a9bb8",
      titleFont: { family: "Syne", weight: "700" },
      callbacks: { label: (c) => " " + c.dataset.label + ": ₹" + c.raw.toLocaleString("en-IN") },
    },
  },
  scales: {
    x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 } } },
    y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5e7296", font: { family: "JetBrains Mono", size: 9 }, callback: (v) => "₹" + v.toLocaleString("en-IN") } },
  },
};
