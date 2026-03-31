import { StudentSidebar } from '@/components/sidebars/StudentSidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'student') {
        redirect('/')
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
