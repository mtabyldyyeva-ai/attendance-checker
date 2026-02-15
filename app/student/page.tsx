'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklySchedule, ScheduleItem } from '@/components/WeeklySchedule'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export default function StudentDashboard() {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setLoading(false)
                return
            }

            // Get Student's Group ID
            const { data: studentData } = await supabase
                .from('users')
                .select('group_id')
                .eq('id', user.id)
                .single()

            if (studentData?.group_id) {
                const { data } = await supabase
                    .from('schedule')
                    .select(`
                        id, day_of_week, start_time, end_time,
                        groups (name),
                        subjects (name),
                        users (full_name)
                    `)
                    .eq('group_id', studentData.group_id)
                    .order('day_of_week')
                    .order('start_time')

                if (data) {
                    // @ts-ignore
                    setSchedule(data)
                }
            }
            setLoading(false)
        }

        fetchSchedule()
    }, [])

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight shrink-0">Student Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-3 shrink-0">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 overflow-hidden min-h-[500px]">
                <Card className="h-full flex flex-col border-none shadow-none">
                    <CardHeader className="px-0 py-2">
                        <CardTitle>My Class Schedule</CardTitle>
                    </CardHeader>
                    <WeeklySchedule
                        schedule={schedule}
                        role="student"
                        readOnly={true}
                    />
                </Card>
            </div>
        </div>
    )
}
