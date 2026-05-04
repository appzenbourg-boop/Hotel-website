import { DefaultSession, DefaultUser } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            propertyId?: string | null
            ownedPropertyIds?: string[] | null
            department?: string | null
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        role: string
        propertyId?: string | null
        ownedPropertyIds?: string[] | null
        department?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        propertyId?: string | null
        department?: string | null
    }
}
