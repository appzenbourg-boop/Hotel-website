/**
 * Pricing calculation utility.
 * Used when creating bookings to apply GST, service charge, luxury tax, and discounts.
 */

export interface PricingSettings {
    gstPercent: number
    serviceChargePercent: number
    luxuryTaxPercent: number
    defaultDiscountPercent: number
    discountLabel?: string | null
}

export interface PricingBreakdown {
    baseAmount: number
    gstPercent: number
    gstAmount: number
    serviceChargePercent: number
    serviceChargeAmount: number
    luxuryTaxPercent: number
    luxuryTaxAmount: number
    discountPercent: number
    discountAmount: number
    totalAmount: number   // base + all taxes
    finalAmount: number   // totalAmount - discount
}

/**
 * Calculate full pricing breakdown for a booking.
 * @param baseAmount  Room rate × nights (before any tax)
 * @param settings    Property-level tax/discount settings
 * @param overrideDiscountPercent  Optional manual discount override
 */
export function calculatePricing(
    baseAmount: number,
    settings: PricingSettings,
    overrideDiscountPercent?: number
): PricingBreakdown {
    const gstPercent = settings.gstPercent ?? 0
    const serviceChargePercent = settings.serviceChargePercent ?? 0
    const luxuryTaxPercent = settings.luxuryTaxPercent ?? 0
    const discountPercent = overrideDiscountPercent ?? settings.defaultDiscountPercent ?? 0

    const gstAmount = round2(baseAmount * gstPercent / 100)
    const serviceChargeAmount = round2(baseAmount * serviceChargePercent / 100)
    const luxuryTaxAmount = round2(baseAmount * luxuryTaxPercent / 100)

    const totalAmount = round2(baseAmount + gstAmount + serviceChargeAmount + luxuryTaxAmount)
    const discountAmount = round2(totalAmount * discountPercent / 100)
    const finalAmount = round2(totalAmount - discountAmount)

    return {
        baseAmount: round2(baseAmount),
        gstPercent,
        gstAmount,
        serviceChargePercent,
        serviceChargeAmount,
        luxuryTaxPercent,
        luxuryTaxAmount,
        discountPercent,
        discountAmount,
        totalAmount,
        finalAmount,
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100
}

/**
 * Format a pricing breakdown as a human-readable invoice line list.
 */
export function formatBreakdown(b: PricingBreakdown, symbol = '₹'): string[] {
    const lines: string[] = []
    lines.push(`Room Charges: ${symbol}${b.baseAmount.toLocaleString('en-IN')}`)
    if (b.gstAmount > 0) lines.push(`GST (${b.gstPercent}%): ${symbol}${b.gstAmount.toLocaleString('en-IN')}`)
    if (b.serviceChargeAmount > 0) lines.push(`Service Charge (${b.serviceChargePercent}%): ${symbol}${b.serviceChargeAmount.toLocaleString('en-IN')}`)
    if (b.luxuryTaxAmount > 0) lines.push(`Luxury Tax (${b.luxuryTaxPercent}%): ${symbol}${b.luxuryTaxAmount.toLocaleString('en-IN')}`)
    if (b.discountAmount > 0) lines.push(`Discount (${b.discountPercent}%): -${symbol}${b.discountAmount.toLocaleString('en-IN')}`)
    lines.push(`Total: ${symbol}${b.finalAmount.toLocaleString('en-IN')}`)
    return lines
}
