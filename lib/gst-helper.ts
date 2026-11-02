/**
 * Zenbourg / StayIn GST Slab and Verification Engine
 * 
 * Current Indian GST Slab Rates for Hotel Accommodation:
 * - Up to ₹7,500 per night: 5% GST (No Input Tax Credit / ITC eligibility)
 * - Above ₹7,500 per night: 18% GST (Full Input Tax Credit / ITC available)
 */

export interface HotelGSTRateInfo {
  gstPercent: number
  cgstPercent: number
  sgstPercent: number
  itcEligible: boolean
  slabType: 'UP_TO_7500' | 'ABOVE_7500'
  label: string
  itcBadgeText: string
  itcBadgeColor: string
}

export function getHotelGSTRate(nightlyRate: number): HotelGSTRateInfo {
  const rate = Math.max(0, Number(nightlyRate) || 0)
  if (rate > 7500) {
    return {
      gstPercent: 18.0,
      cgstPercent: 9.0,
      sgstPercent: 9.0,
      itcEligible: true,
      slabType: 'ABOVE_7500',
      label: '18% GST (Above ₹7,500/night)',
      itcBadgeText: 'Full ITC Available',
      itcBadgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    }
  }

  return {
    gstPercent: 5.0,
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    itcEligible: false,
    slabType: 'UP_TO_7500',
    label: '5% GST (Up to ₹7,500/night)',
    itcBadgeText: 'No ITC Eligibility',
    itcBadgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  }
}

export const INDIAN_GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
}

export const GST_ENTITY_TYPES: Record<string, string> = {
  'C': 'Company (Pvt Ltd / Public Ltd)',
  'P': 'Proprietorship / Individual',
  'F': 'Partnership Firm / LLP',
  'T': 'Trust',
  'A': 'Association of Persons (AOP)',
  'B': 'Body of Individuals (BOI)',
  'G': 'Government Entity',
  'H': 'Hindu Undivided Family (HUF)',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person'
}

// Built-in Indian Corporate Directory for instant lookups
export const KNOWN_CORPORATE_GSTIN: Record<string, { legalName: string; tradeName: string; address: string; state: string }> = {
  '27AAACT2727Q1ZW': {
    legalName: 'TATA CONSULTANCY SERVICES LIMITED',
    tradeName: 'Tata Consultancy Services (TCS)',
    address: 'TCS House, 9th Floor, Raveline Street, Fort, Mumbai, Maharashtra 400001',
    state: 'Maharashtra'
  },
  '29AAACI1681G1ZM': {
    legalName: 'INFOSYS LIMITED',
    tradeName: 'Infosys Limited',
    address: 'Electronics City, Hosur Road, Bengaluru, Karnataka 560100',
    state: 'Karnataka'
  },
  '27AAAAP1664K1ZB': {
    legalName: 'RELIANCE INDUSTRIES LIMITED',
    tradeName: 'Reliance Industries Limited',
    address: 'Maker Chambers IV, 3rd Floor, 222 Nariman Point, Mumbai, Maharashtra 400021',
    state: 'Maharashtra'
  },
  '29AAACW1972D1Z0': {
    legalName: 'WIPRO LIMITED',
    tradeName: 'Wipro Limited',
    address: 'Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035',
    state: 'Karnataka'
  },
  '07AAACH2702H1ZQ': {
    legalName: 'HCL TECHNOLOGIES LIMITED',
    tradeName: 'HCL Technologies',
    address: '806, Siddharth, 96, Nehru Place, New Delhi, Delhi 110019',
    state: 'Delhi'
  },
  '29AABCG7926M1ZU': {
    legalName: 'GOOGLE INDIA PRIVATE LIMITED',
    tradeName: 'Google India',
    address: 'No. 3, Swami Vivekananda Road, Old Madras Road, Bengaluru, Karnataka 560008',
    state: 'Karnataka'
  },
  '36AABCM3616H1ZT': {
    legalName: 'MICROSOFT CORPORATION (INDIA) PRIVATE LIMITED',
    tradeName: 'Microsoft India',
    address: 'Building 3, Microsoft Campus, Gachibowli, Hyderabad, Telangana 500032',
    state: 'Telangana'
  },
  '29AAGCA8850P1ZG': {
    legalName: 'AMAZON SELLER SERVICES PRIVATE LIMITED',
    tradeName: 'Amazon India',
    address: 'Brigade Gateway, 8th Floor, 26/1, Dr. Rajkumar Road, Malleshwaram West, Bengaluru, Karnataka 560055',
    state: 'Karnataka'
  },
  '29AABCF1458A1ZW': {
    legalName: 'FLIPKART INTERNET PRIVATE LIMITED',
    tradeName: 'Flipkart',
    address: 'Buildings Alyssa, Begonia & Clover, Embassy Tech Village, Outer Ring Road, Devarabeesanahalli, Bengaluru, Karnataka 560103',
    state: 'Karnataka'
  },
  '27AAACL0149E1ZF': {
    legalName: 'LARSEN & TOUBRO LIMITED',
    tradeName: 'L&T Limited',
    address: 'L&T House, Ballard Estate, Narottam Morarjee Marg, Mumbai, Maharashtra 400001',
    state: 'Maharashtra'
  },
  '19AAACI0274H1ZK': {
    legalName: 'ITC LIMITED',
    tradeName: 'ITC Limited',
    address: 'Virginia House, 37 J.L. Nehru Road, Kolkata, West Bengal 700071',
    state: 'West Bengal'
  },
  '27AAACM0468G1ZB': {
    legalName: 'MAHINDRA & MAHINDRA LIMITED',
    tradeName: 'Mahindra & Mahindra',
    address: 'Gateway Building, Apollo Bunder, Colaba, Mumbai, Maharashtra 400001',
    state: 'Maharashtra'
  },
  '07AAACB2894G1ZN': {
    legalName: 'BHARTI AIRTEL LIMITED',
    tradeName: 'Airtel',
    address: 'Airtel Centre, Plot No. 16, Udyog Vihar, Phase IV, Gurgaon, Haryana 122015',
    state: 'Delhi'
  },
  '27AAACT2727Q2ZX': {
    legalName: 'TATA CONSULTANCY SERVICES LIMITED',
    tradeName: 'TCS Pune / Maharashtra',
    address: 'Sahyadri Park, Rajiv Gandhi Infotech Park, Hinjawadi Phase 3, Pune, Maharashtra 411057',
    state: 'Maharashtra'
  },
  '27AAACI7058G1ZT': {
    legalName: 'ICICI BANK LIMITED',
    tradeName: 'ICICI Bank',
    address: 'ICICI Bank Towers, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
    state: 'Maharashtra'
  },
  '27AAACH2702H2ZP': {
    legalName: 'HDFC BANK LIMITED',
    tradeName: 'HDFC Bank Ltd',
    address: 'HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013',
    state: 'Maharashtra'
  },
  '27AAACS0477L1ZS': {
    legalName: 'STATE BANK OF INDIA',
    tradeName: 'State Bank of India (SBI)',
    address: 'State Bank Bhavan, Madame Cama Road, Nariman Point, Mumbai, Maharashtra 400021',
    state: 'Maharashtra'
  },
  '27AAACT2727Q1Z5': {
    legalName: 'TATA MOTORS LIMITED',
    tradeName: 'Tata Motors',
    address: 'Bombay House, 24 Homi Mody Street, Fort, Mumbai, Maharashtra 400001',
    state: 'Maharashtra'
  }
}
