'use client'

import { Sidebar, MobileSidebar } from '@/components/Sidebar'
import { BarChart, User, Bell } from 'lucide-react'

const studentLinks = [
    { name: 'Dashboard', href: '/student', icon: BarChart },
    { name: 'Profile', href: '/student/profile', icon: User },
    { name: 'Notifications', href: '/student/notifications', icon: Bell },
]

export function StudentSidebar() {
    return (
        <>
            <div className="hidden md:block w-64 h-full">
                <Sidebar links={studentLinks} className="h-full" />
            </div>
            <div className="md:hidden">
                <MobileSidebar links={studentLinks} />
            </div>
        </>
    )
}
