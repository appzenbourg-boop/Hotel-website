import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function migrate() {
  console.log('Starting ServiceRequest migration...')
  
  // Update all ServiceRequests where assignedToId is missing/null to explicit null
  // MongoDB find often finds "null" when field is absent, but we want to be explicit
  const result = await prisma.serviceRequest.updateMany({
    where: {
      status: 'PENDING',
      assignedToId: { not: { not: null } } // This is a trick to find both null and missing
    },
    data: {
      assignedToId: null
    }
  })
  
  console.log(`Updated ${result.count} service requests to explicit null assignment.`)
  
  // Also fix any COMPLETETED/ACCEPTED that might have missing fields if needed, 
  // but PENDING is the priority for auto-assignment.
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
