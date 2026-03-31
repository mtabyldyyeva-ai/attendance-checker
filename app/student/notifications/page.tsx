'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from "@/components/ui/card"
import { Bell, AlertTriangle, Clock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEffect, useState } from 'react'

interface UpcomingClass {
    id: string
    subject: string
    group: string
    teacher: string
    start_time: string
    minutesUntil: number
}

interface AbsenceRecord {
    timestamp: string
    subject: string | null
    date: string | null
}

const DAYS_MAP: Record<number, number> = {
    0: 0, // Sunday
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
}

export default function NotificationsPage() {
    const [upcoming, setUpcoming] = useState<UpcomingClass[]>([])
    const [absences, setAbsences] = useState<AbsenceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            // 1. Fetch student's schedule (via schedule_students, fallback to group)
            const { data: assignedSchedules } = await supabase
                .from('schedule_students')
                .select('schedule_id')
                .eq('student_id', user.id)

            let scheduleData: {
                id: string
                day_of_week: number
                start_time: string
                subjects: { name: string } | null
                groups: { name: string } | null
                users: { full_name: string } | null
            }[] | null = null

            if (assignedSchedules && assignedSchedules.length > 0) {
                const ids = assignedSchedules.map(s => s.schedule_id)
                const { data } = await supabase
                    .from('schedule')
                    .select(`
                        id, day_of_week, start_time,
                        subjects (name),
                        groups (name),
                        users!schedule_teacher_id_fkey (full_name)
                    `)
                    .in('id', ids)

                // @ts-expect-error Supabase join types
                scheduleData = data
            } else {
                const { data: studentData } = await supabase
                    .from('users')
                    .select('group_id')
                    .eq('id', user.id)
                    .single()

                if (studentData?.group_id) {
                    const { data } = await supabase
                        .from('schedule')
                        .select(`
                            id, day_of_week, start_time,
                            subjects (name),
                            groups (name),
                            users!schedule_teacher_id_fkey (full_name)
                        `)
                        .eq('group_id', studentData.group_id)

                    // @ts-expect-error Supabase join types
                    scheduleData = data
                }
            }

            // Check for upcoming classes within the next 60 minutes
            if (scheduleData) {
                const now = new Date()
                const todayDow = DAYS_MAP[now.getDay()]
                const nowMinutes = now.getHours() * 60 + now.getMinutes()

                const upcomingClasses: UpcomingClass[] = []

                for (const item of scheduleData) {
                    if (item.day_of_week !== todayDow) continue

                    const [h, m] = item.start_time.split(':').map(Number)
                    const classMinutes = h * 60 + m
                    const diff = classMinutes - nowMinutes

                    if (diff > 0 && diff <= 60) {
                        upcomingClasses.push({
                            id: item.id,
                            subject: item.subjects?.name || 'Unknown',
                            group: item.groups?.name || '',
                            teacher: item.users?.full_name || '',
                            start_time: item.start_time,
                            minutesUntil: diff,
                        })
                    }
                }

                setUpcoming(upcomingClasses)
            }

            // 2. Fetch absence records
            const { data: absenceData } = await supabase
                .from('attendance')
                .select(`
                    timestamp,
                    lessons (date, subjects (name))
                `)
                .eq('student_id', user.id)
                .eq('status', 'absent')
                .order('timestamp', { ascending: false })
                .limit(20)

            if (absenceData) {
                const parsed: AbsenceRecord[] = absenceData.map((r: Record<string, unknown>) => {
                    const lessons = r.lessons as { date?: string; subjects?: { name?: string } | null } | null
                    return {
                        timestamp: r.timestamp as string,
                        subject: lessons?.subjects?.name || null,
                        date: lessons?.date || null,
                    }
                })
                setAbsences(parsed)
            }

            setLoading(false)
        }

        fetchNotifications()

        // Refresh every 5 minutes to catch new upcoming classes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        )
    }

    const hasNotifications = upcoming.length > 0 || absences.length > 0

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>

            {/* Upcoming classes */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Upcoming Classes
                    </h2>
                    {upcoming.map(cls => (
                        <Alert key={cls.id} className="border-blue-200 bg-blue-50">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">
                                {cls.subject} starts in {cls.minutesUntil} min
                            </AlertTitle>
                            <AlertDescription className="text-blue-700">
                                {cls.group} &middot; {cls.teacher} &middot; {cls.start_time.slice(0, 5)}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {/* Absences */}
            {absences.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Absence History
                    </h2>
                    {absences.map((record, index) => (
                        <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Absence Recorded</AlertTitle>
                            <AlertDescription>
                                {record.subject ? `${record.subject} — ` : ''}
                                {record.date
                                    ? new Date(record.date).toLocaleDateString()
                                    : new Date(record.timestamp).toLocaleDateString()}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {!hasNotifications && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-8 text-gray-500">
                        <Bell className="h-12 w-12 mb-4 opacity-50" />
                        <p>No new notifications.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
