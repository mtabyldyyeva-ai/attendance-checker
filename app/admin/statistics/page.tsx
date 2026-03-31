'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Users, BookOpen, GraduationCap, FolderOpen } from "lucide-react"
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TeacherStat {
    id: string
    name: string
    expectedLessons: number
    conductedLessons: number
    missedLessons: number
    conductRate: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    attendanceRate: number
}

interface SubjectStat {
    id: string
    name: string
    totalLessons: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    attendanceRate: number
}

interface StudentStat {
    id: string
    name: string
    email: string
    group: string
    present: number
    absent: number
    late: number
    total: number
    attendanceRate: number
}

interface GroupStat {
    id: string
    name: string
    studentCount: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    attendanceRate: number
}

type Tab = 'teachers' | 'subjects' | 'students' | 'groups'

export default function StatisticsPage() {
    const [tab, setTab] = useState<Tab>('teachers')
    const [loading, setLoading] = useState(true)
    const [teacherStats, setTeacherStats] = useState<TeacherStat[]>([])
    const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([])
    const [studentStats, setStudentStats] = useState<StudentStat[]>([])
    const [groupStats, setGroupStats] = useState<GroupStat[]>([])
    const supabase = createClient()

    useEffect(() => {
        fetchAllStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchAllStats = async () => {
        setLoading(true)
        await Promise.all([
            fetchTeacherStats(),
            fetchSubjectStats(),
            fetchStudentStats(),
            fetchGroupStats(),
        ])
        setLoading(false)
    }

    const fetchTeacherStats = async () => {
        const { data: teachers } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('role', 'teacher')
            .order('full_name')

        if (!teachers) return

        const { data: schedules } = await supabase
            .from('schedule')
            .select('id, teacher_id, day_of_week, start_date, end_date')

        const { data: lessons } = await supabase
            .from('lessons')
            .select('id, teacher_id, schedule_id, date')

        const { data: attendance } = await supabase
            .from('attendance')
            .select('lesson_id, status')

        if (!schedules || !lessons || !attendance) return

        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        // Build a set of existing (schedule_id, date) pairs
        const existingLessonKeys = new Set(
            lessons.map(l => `${l.schedule_id}_${l.date}`)
        )

        // For each schedule, generate all past dates within its active period
        // A date is "due" if it's older than 7 days (grace period passed)
        const generatePastDates = (dayOfWeek: number, startDate?: string | null, endDate?: string | null): Date[] => {
            const dates: Date[] = []
            const earliest = startDate ? new Date(startDate) : new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000)
            const latest = endDate ? new Date(endDate) : new Date(now)
            // Cap latest to today
            const cap = latest > now ? now : latest

            // Find the most recent occurrence of this day_of_week before cap
            const d = new Date(cap)
            while (d.getDay() !== dayOfWeek) {
                d.setDate(d.getDate() - 1)
            }

            // Walk backwards week by week
            while (d >= earliest) {
                if (d < now) { // only past dates
                    dates.push(new Date(d))
                }
                d.setDate(d.getDate() - 7)
            }
            return dates
        }

        const stats: TeacherStat[] = teachers.map(t => {
            const teacherSchedules = schedules.filter(s => s.teacher_id === t.id)

            let expectedCount = 0  // past grace period
            let conductedCount = 0
            let missedCount = 0

            for (const sch of teacherSchedules) {
                const pastDates = generatePastDates(sch.day_of_week, sch.start_date, sch.end_date)
                for (const date of pastDates) {
                    const dateStr = date.toISOString().split('T')[0]
                    const key = `${sch.id}_${dateStr}`
                    const hasLesson = existingLessonKeys.has(key)

                    if (date <= oneWeekAgo) {
                        // Grace period expired — counts as due
                        expectedCount++
                        if (hasLesson) conductedCount++
                        else missedCount++
                    } else {
                        // Within grace period — only count if already submitted
                        if (hasLesson) {
                            expectedCount++
                            conductedCount++
                        }
                    }
                }
            }

            const conductRate = expectedCount > 0 ? Math.round((conductedCount / expectedCount) * 100) : 0

            // Attendance stats
            const teacherLessonIds = lessons.filter(l => l.teacher_id === t.id).map(l => l.id)
            const teacherAttendance = attendance.filter(a => teacherLessonIds.includes(a.lesson_id))

            const present = teacherAttendance.filter(a => a.status === 'present').length
            const absent = teacherAttendance.filter(a => a.status === 'absent').length
            const late = teacherAttendance.filter(a => a.status === 'late').length
            const total = present + absent + late

            return {
                id: t.id,
                name: t.full_name || 'Unknown',
                expectedLessons: expectedCount,
                conductedLessons: conductedCount,
                missedLessons: missedCount,
                conductRate,
                totalPresent: present,
                totalAbsent: absent,
                totalLate: late,
                attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
            }
        })

        setTeacherStats(stats)
    }

    const fetchSubjectStats = async () => {
        const { data: subjects } = await supabase
            .from('subjects')
            .select('id, name')
            .order('name')

        if (!subjects) return

        const { data: lessons } = await supabase
            .from('lessons')
            .select('id, subject_id')
            .eq('status', 'completed')

        const { data: attendance } = await supabase
            .from('attendance')
            .select('lesson_id, status')

        if (!lessons || !attendance) return

        const stats: SubjectStat[] = subjects.map(s => {
            const subjectLessonIds = lessons.filter(l => l.subject_id === s.id).map(l => l.id)
            const subjectAttendance = attendance.filter(a => subjectLessonIds.includes(a.lesson_id))

            const present = subjectAttendance.filter(a => a.status === 'present').length
            const absent = subjectAttendance.filter(a => a.status === 'absent').length
            const late = subjectAttendance.filter(a => a.status === 'late').length
            const total = present + absent + late

            return {
                id: s.id,
                name: s.name,
                totalLessons: subjectLessonIds.length,
                totalPresent: present,
                totalAbsent: absent,
                totalLate: late,
                attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
            }
        })

        setSubjectStats(stats)
    }

    const fetchStudentStats = async () => {
        const { data: students } = await supabase
            .from('users')
            .select('id, full_name, email, group_id, groups (name)')
            .eq('role', 'student')
            .order('full_name')

        if (!students) return

        const { data: attendance } = await supabase
            .from('attendance')
            .select('student_id, status')

        if (!attendance) return

        const stats: StudentStat[] = students.map(s => {
            const studentAttendance = attendance.filter(a => a.student_id === s.id)

            const present = studentAttendance.filter(a => a.status === 'present').length
            const absent = studentAttendance.filter(a => a.status === 'absent').length
            const late = studentAttendance.filter(a => a.status === 'late').length
            const total = present + absent + late

            // @ts-expect-error Supabase join types
            const groupName = s.groups?.name || '—'

            return {
                id: s.id,
                name: s.full_name || 'Unknown',
                email: s.email || '',
                group: groupName,
                present,
                absent,
                late,
                total,
                attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
            }
        })

        setStudentStats(stats.sort((a, b) => b.attendanceRate - a.attendanceRate))
    }

    const fetchGroupStats = async () => {
        const { data: groups } = await supabase
            .from('groups')
            .select('id, name')
            .order('name')

        if (!groups) return

        // Get all students with their group
        const { data: students } = await supabase
            .from('users')
            .select('id, group_id')
            .eq('role', 'student')

        const { data: attendance } = await supabase
            .from('attendance')
            .select('student_id, status')

        if (!students || !attendance) return

        const stats: GroupStat[] = groups.map(g => {
            const groupStudentIds = students.filter(s => s.group_id === g.id).map(s => s.id)
            const groupAttendance = attendance.filter(a => groupStudentIds.includes(a.student_id))

            const present = groupAttendance.filter(a => a.status === 'present').length
            const absent = groupAttendance.filter(a => a.status === 'absent').length
            const late = groupAttendance.filter(a => a.status === 'late').length
            const total = present + absent + late

            return {
                id: g.id,
                name: g.name,
                studentCount: groupStudentIds.length,
                totalPresent: present,
                totalAbsent: absent,
                totalLate: late,
                attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
            }
        })

        setGroupStats(stats)
    }

    const rateBarColor = (rate: number) => {
        if (rate >= 80) return 'bg-green-500'
        if (rate >= 60) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    const rateTextColor = (rate: number) => {
        if (rate >= 80) return 'text-green-700'
        if (rate >= 60) return 'text-yellow-700'
        return 'text-red-700'
    }

    const RateBar = ({ rate }: { rate: number }) => (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all", rateBarColor(rate))}
                    style={{ width: `${rate}%` }}
                />
            </div>
            <span className={cn("text-xs font-semibold tabular-nums w-9 text-right", rateTextColor(rate))}>
                {rate}%
            </span>
        </div>
    )

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'teachers', label: 'By Teacher', icon: <Users className="h-4 w-4" /> },
        { key: 'subjects', label: 'By Subject', icon: <BookOpen className="h-4 w-4" /> },
        { key: 'groups', label: 'By Group', icon: <FolderOpen className="h-4 w-4" /> },
        { key: 'students', label: 'By Student', icon: <GraduationCap className="h-4 w-4" /> },
    ]

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>

            {/* Summary Cards */}
            {!loading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{teacherStats.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Avg attendance: {teacherStats.length > 0 ? Math.round(teacherStats.reduce((sum, t) => sum + t.attendanceRate, 0) / teacherStats.length) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{subjectStats.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Avg attendance: {subjectStats.length > 0 ? Math.round(subjectStats.reduce((sum, s) => sum + s.attendanceRate, 0) / subjectStats.length) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Groups</CardTitle>
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{groupStats.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Avg attendance: {groupStats.length > 0 ? Math.round(groupStats.reduce((sum, g) => sum + g.attendanceRate, 0) / groupStats.length) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Students</CardTitle>
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{studentStats.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Avg attendance: {studentStats.length > 0 ? Math.round(studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex gap-1 border-b min-w-0 w-max md:w-full">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap shrink-0",
                                tab === t.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            {t.icon}
                            <span className="hidden sm:inline">{t.label}</span>
                            <span className="sm:hidden">{t.label.replace('By ', '')}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* By Teacher */}
                    {tab === 'teachers' && (
                        <Card>
                            <CardContent className="pt-6">
                                {teacherStats.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No teacher data available.</p>
                                ) : (
                                    <div className="rounded-md border overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Teacher</TableHead>
                                                    <TableHead className="text-center">Conducted</TableHead>
                                                    <TableHead className="text-center">Missed</TableHead>
                                                    <TableHead className="min-w-[150px]">Conduct Rate</TableHead>
                                                    <TableHead className="text-center">Present</TableHead>
                                                    <TableHead className="text-center">Absent</TableHead>
                                                    <TableHead className="text-center">Late</TableHead>
                                                    <TableHead className="min-w-[150px]">Attendance</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {teacherStats.map(t => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="font-medium">
                                                            <div>{t.name}</div>
                                                            <div className="text-xs text-muted-foreground">{t.expectedLessons} expected</div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-green-600">{t.conductedLessons}</TableCell>
                                                        <TableCell className="text-center font-medium text-red-600">{t.missedLessons}</TableCell>
                                                        <TableCell>
                                                            <RateBar rate={t.conductRate} />
                                                        </TableCell>
                                                        <TableCell className="text-center text-green-600">{t.totalPresent}</TableCell>
                                                        <TableCell className="text-center text-red-600">{t.totalAbsent}</TableCell>
                                                        <TableCell className="text-center text-yellow-600">{t.totalLate}</TableCell>
                                                        <TableCell>
                                                            <RateBar rate={t.attendanceRate} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* By Subject */}
                    {tab === 'subjects' && (
                        <Card>
                            <CardContent className="pt-6">
                                {subjectStats.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No subject data available.</p>
                                ) : (
                                    <div className="rounded-md border overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead className="text-center">Lessons</TableHead>
                                                    <TableHead className="text-center">Present</TableHead>
                                                    <TableHead className="text-center">Absent</TableHead>
                                                    <TableHead className="text-center">Late</TableHead>
                                                    <TableHead className="min-w-[150px]">Rate</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subjectStats.map(s => (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="font-medium">{s.name}</TableCell>
                                                        <TableCell className="text-center">{s.totalLessons}</TableCell>
                                                        <TableCell className="text-center text-green-600">{s.totalPresent}</TableCell>
                                                        <TableCell className="text-center text-red-600">{s.totalAbsent}</TableCell>
                                                        <TableCell className="text-center text-yellow-600">{s.totalLate}</TableCell>
                                                        <TableCell>
                                                            <RateBar rate={s.attendanceRate} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* By Group */}
                    {tab === 'groups' && (
                        <Card>
                            <CardContent className="pt-6">
                                {groupStats.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No group data available.</p>
                                ) : (
                                    <div className="rounded-md border overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead className="text-center">Students</TableHead>
                                                    <TableHead className="text-center">Present</TableHead>
                                                    <TableHead className="text-center">Absent</TableHead>
                                                    <TableHead className="text-center">Late</TableHead>
                                                    <TableHead className="min-w-[150px]">Rate</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupStats.map(g => (
                                                    <TableRow key={g.id}>
                                                        <TableCell className="font-medium">{g.name}</TableCell>
                                                        <TableCell className="text-center">{g.studentCount}</TableCell>
                                                        <TableCell className="text-center text-green-600">{g.totalPresent}</TableCell>
                                                        <TableCell className="text-center text-red-600">{g.totalAbsent}</TableCell>
                                                        <TableCell className="text-center text-yellow-600">{g.totalLate}</TableCell>
                                                        <TableCell>
                                                            <RateBar rate={g.attendanceRate} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* By Student */}
                    {tab === 'students' && (
                        <Card>
                            <CardContent className="pt-6">
                                {studentStats.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No student data available.</p>
                                ) : (
                                    <div className="rounded-md border overflow-auto max-h-[600px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead className="text-center">Present</TableHead>
                                                    <TableHead className="text-center">Absent</TableHead>
                                                    <TableHead className="text-center">Late</TableHead>
                                                    <TableHead className="text-center">Total</TableHead>
                                                    <TableHead className="min-w-[150px]">Rate</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentStats.map(s => (
                                                    <TableRow key={s.id}>
                                                        <TableCell>
                                                            <div className="font-medium">{s.name}</div>
                                                            <div className="text-xs text-muted-foreground">{s.email}</div>
                                                        </TableCell>
                                                        <TableCell>{s.group}</TableCell>
                                                        <TableCell className="text-center text-green-600">{s.present}</TableCell>
                                                        <TableCell className="text-center text-red-600">{s.absent}</TableCell>
                                                        <TableCell className="text-center text-yellow-600">{s.late}</TableCell>
                                                        <TableCell className="text-center">{s.total}</TableCell>
                                                        <TableCell>
                                                            <RateBar rate={s.attendanceRate} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}
