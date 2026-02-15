'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklySchedule, ScheduleItem } from '@/components/WeeklySchedule'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    // const [loading, setLoading] = useState(true) // Unused
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchSchedule = async () => {
            // setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                // setLoading(false)
                return
            }

            const { data } = await supabase
                .from('schedule')
                .select(`
                    id, day_of_week, start_time, end_time,
                    groups (name),
                    subjects (name),
                    users (full_name)
                `)
                .eq('teacher_id', user.id)
                .order('day_of_week')
                .order('start_time')

            if (data) {
                // @ts-expect-error Supabase join types are not fully inferred
                setSchedule(data)
            }
            // setLoading(false)
        }

        fetchSchedule()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleEventClick = (item: ScheduleItem) => {
        // Navigate to start session for this class?
        // For now, maybe just log or alert, or navigate to a specific session page if exists
        // router.push(`/teacher/session/${item.id}`) 
        // The current "Start Class" page is generic /teacher/session/new
        router.push('/teacher/session/new')
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight shrink-0">Teacher Dashboard</h1>

            {/* Stats Cards (Optional - can be kept or removed if space is needed) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 shrink-0">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Weekly Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{schedule.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 overflow-hidden min-h-[500px]">
                <WeeklySchedule
                    schedule={schedule}
                    role="teacher"
                    onEventClick={handleEventClick}
                    readOnly={true} // Teachers can't delete from here
                />
            </div>
        </div>
    )
}
