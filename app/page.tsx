import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { autoClosePastLessons } from '@/lib/auto-close-lessons'

export default async function Home() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Auto-close lessons older than 7 days (runs on each login redirect)
    await autoClosePastLessons(supabase)

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role

    if (role === 'admin') redirect('/admin')
    else if (role === 'teacher') redirect('/teacher')
    else if (role === 'student') redirect('/student')
    else redirect('/login')
}
