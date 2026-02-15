import { StudentSidebar } from '@/components/sidebars/StudentSidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await (await supabase).auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <StudentSidebar />
            <div className="md:hidden p-4 border-b flex items-center">
                <span className="font-semibold ml-2">Student Portal</span>
            </div>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
}
