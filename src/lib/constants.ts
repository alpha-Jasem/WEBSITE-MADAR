export const MADAR_WHATSAPP_NUMBER = '966546666005'

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Pro',
  enterprise: 'Premium',
}

export const PLAN_PRICES: Record<string, string> = {
  starter: '299',
  growth: '799',
  enterprise: '1,999',
}

export const DAILY_LIMITS: Record<string, { cars: number; qr: number; screenUpdates: number; whatsapp: number }> = {
  starter:    { cars: 50,  qr: 30,  screenUpdates: 150, whatsapp: 30  },
  growth:     { cars: 100, qr: 75,  screenUpdates: 300, whatsapp: 100 },
  enterprise: { cars: 300, qr: 200, screenUpdates: 1000, whatsapp: 300 },
}

export const MONTHLY_LIMITS: Record<string, { cars: number; whatsapp: number }> = {
  starter:    { cars: 1_000,  whatsapp: 500  },
  growth:     { cars: 3_000,  whatsapp: 2_000 },
  enterprise: { cars: 9_000,  whatsapp: 8_000 },
}
