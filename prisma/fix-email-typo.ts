import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Fixing typo in the recently registered email in MongoDB...')
    
    const wrongEmail = 'harshfinaltestharsh@gmail..com'
    const fixedEmail = 'harshfinaltestharsh@gmail.com'

    // Check if user exists first
    const user = await prisma.user.findFirst({
        where: { email: wrongEmail }
    })

    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { email: fixedEmail }
        })
        console.log(`✅ Successfully updated user email to: ${fixedEmail}`)
    } else {
        console.log('❌ Could not find the user with double dot email in DB!')
    }
}

main().finally(() => prisma.$disconnect())
