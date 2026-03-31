'use client'

import { Sidebar, MobileSidebar } from '@/components/Sidebar'
import { LayoutDashboard, Users, Camera, FileText, Calendar, BarChart3 } from 'lucide-react'

const adminLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Groups', href: '/admin/groups', icon: Users },
    { name: 'Subjects', href: '/admin/subjects', icon: FileText },
    { name: 'Schedule', href: '/admin/schedule', icon: Calendar },
    { name: 'Face Data', href: '/admin/faces', icon: Camera },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Statistics', href: '/admin/statistics', icon: BarChart3 },
]

export function AdminSidebar() {
    return (
        <>
            <div className="hidden md:block w-64 h-full">
                <Sidebar links={adminLinks} className="h-full" />
            </div>
            <div className="md:hidden">
                <MobileSidebar links={adminLinks} />
            </div>
        </>
    )
}
