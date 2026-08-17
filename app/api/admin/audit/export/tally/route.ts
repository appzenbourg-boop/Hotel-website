import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = (session.user as any).propertyId
        if (!propertyId) {
            return NextResponse.json({ error: 'No property selected' }, { status: 400 })
        }

        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

        // Get all transactions for export (in a real system, this might be filtered by date range, but we want to ensure data shows up)
        const transactions = await prisma.ledgerTransaction.findMany({
            where: {
                propertyId
            }
        })

        // Generate Tally XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
        xml += `<ENVELOPE>\n`
        xml += `  <HEADER>\n`
        xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`
        xml += `  </HEADER>\n`
        xml += `  <BODY>\n`
        xml += `    <IMPORTDATA>\n`
        xml += `      <REQUESTDESC>\n`
        xml += `        <REPORTNAME>Vouchers</REPORTNAME>\n`
        xml += `      </REQUESTDESC>\n`
        xml += `      <REQUESTDATA>\n`

        for (const [index, t] of transactions.entries()) {
            xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`
            xml += `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`
            xml += `            <DATE>${dateStr}</DATE>\n`
            xml += `            <NARRATION>${t.description || 'Night Audit Import'}</NARRATION>\n`
            xml += `            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>\n`
            xml += `            <VOUCHERNUMBER>${t.id.slice(-6).toUpperCase()}</VOUCHERNUMBER>\n`

            // Credit Ledger
            xml += `            <ALLLEDGERENTRIES.LIST>\n`
            xml += `              <LEDGERNAME>${t.category}</LEDGERNAME>\n`
            xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`
            xml += `              <AMOUNT>${t.type === 'CREDIT' ? t.amount : -t.amount}</AMOUNT>\n`
            xml += `            </ALLLEDGERENTRIES.LIST>\n`
            
            // Debit Ledger (Mocking cash/bank account for double entry)
            xml += `            <ALLLEDGERENTRIES.LIST>\n`
            xml += `              <LEDGERNAME>Main Safe Account</LEDGERNAME>\n`
            xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`
            xml += `              <AMOUNT>${t.type === 'CREDIT' ? -t.amount : t.amount}</AMOUNT>\n`
            xml += `            </ALLLEDGERENTRIES.LIST>\n`

            xml += `          </VOUCHER>\n`
            xml += `        </TALLYMESSAGE>\n`
        }

        xml += `      </REQUESTDATA>\n`
        xml += `    </IMPORTDATA>\n`
        xml += `  </BODY>\n`
        xml += `</ENVELOPE>`

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Content-Disposition': `attachment; filename="Tally_NightAudit_${dateStr}.xml"`
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
