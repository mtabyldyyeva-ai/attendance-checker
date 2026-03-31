'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklySchedule, ScheduleItem } from '@/components/WeeklySchedule'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

export default function StudentDashboard() {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 })
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // Fetch attendance stats
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('status')
                .eq('student_id', user.id)

            if (attendanceData) {
                const counts = { present: 0, absent: 0, late: 0 }
                for (const record of attendanceData) {
                    if (record.status === 'present') counts.present++
                    else if (record.status === 'absent') counts.absent++
                    else if (record.status === 'late') counts.late++
                }
                setStats(counts)
            }

            // Fetch schedule IDs where this student is assigned
            const { data: assignedSchedules } = await supabase
                .from('schedule_students')
                .select('schedule_id')
                .eq('student_id', user.id)

            if (assignedSchedules && assignedSchedules.length > 0) {
                const scheduleIds = assignedSchedules.map(s => s.schedule_id)

                const { data } = await supabase
                    .from('schedule')
                    .select(`
                        id, day_of_week, start_time, end_time, start_date, end_date,
                        groups (name),
                        subjects (name),
                        users!schedule_teacher_id_fkey (full_name)
                    `)
                    .in('id', scheduleIds)
                    .order('day_of_week')
                    .order('start_time')

                if (data) {
                    // @ts-expect-error Supabase join types are not fully inferred
                    setSchedule(data)
                }
            } else {
                // Fallback: show group-based schedule if not individually assigned
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
                            users!schedule_teacher_id_fkey (full_name)
                        `)
                        .eq('group_id', studentData.group_id)
                        .order('day_of_week')
                        .order('start_time')

                    if (data) {
                        // @ts-expect-error Supabase join types are not fully inferred
                        setSchedule(data)
                    }
                }
            }
        }

        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        <div className="text-2xl font-bold">{stats.present}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.absent}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.late}</div>
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
