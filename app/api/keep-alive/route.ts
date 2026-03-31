import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // Simple query to keep the database awake
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })

        if (error) throw error

        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
            users: count,
        })
    } catch (err) {
        console.error('Keep-alive failed:', err)
        return NextResponse.json(
            { ok: false, error: String(err) },
            { status: 500 }
        )
    }
}
