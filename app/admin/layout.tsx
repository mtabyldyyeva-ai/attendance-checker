import { AdminSidebar } from '@/components/sidebars/AdminSidebar'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = createClient()
    const { data: { user } } = await (await supabase).auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // TODO: Add stricter role check here by querying public.users

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <AdminSidebar />
            <div className="md:hidden p-4 border-b flex items-center">
                <span className="font-semibold ml-2">Admin Panel</span>
            </div>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    )
}
