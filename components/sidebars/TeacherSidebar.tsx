'use client'

import { Sidebar, MobileSidebar } from '@/components/Sidebar'
import { Calendar, Camera, ClipboardList } from 'lucide-react'

const teacherLinks = [
    { name: 'Dashboard', href: '/teacher', icon: Calendar },
    { name: 'Start Class', href: '/teacher/session/new', icon: Camera },
    { name: 'History', href: '/teacher/history', icon: ClipboardList },
]

export function TeacherSidebar() {
    return (
        <>
            <div className="hidden md:block w-64 h-full">
                <Sidebar links={teacherLinks} className="h-full" />
            </div>
            <div className="md:hidden">
                <MobileSidebar links={teacherLinks} />
            </div>
        </>
    )
}
