import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCheck, UserX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ClassDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch lesson details
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single()

    if (lessonError || !lesson) {
        return <div>Error loading class details or class not found.</div>
    }

    // 2. Fetch all attendance records for this lesson
    const { data: attendanceRecords, error: attError } = await supabase
        .from('attendance')
        .select('student_id, timestamp, status')
        .eq('lesson_id', id)

    if (attError) {
        return <div>Error loading attendance data.</div>
    }

    // 3. Fetch all students (MVP: We check all students. Later, filter by group)
    const { data: allStudents, error: studentError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'student')

    if (studentError) {
        return <div>Error loading student data.</div>
    }

    // 4. Organize data: Present vs Absent
    const presentStudentIds = new Set(attendanceRecords?.map(record => record.student_id))

    // Create an array mapping present students to their records
    const presentStudents = (allStudents || []).filter(s => presentStudentIds.has(s.id)).map(student => {
        const record = attendanceRecords.find(r => r.student_id === student.id)
        return {
            ...student,
            timestamp: record?.timestamp
        }
    })

    const absentStudents = (allStudents || []).filter(s => !presentStudentIds.has(s.id))


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/teacher/history">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Class Details</h1>
                    <p className="text-muted-foreground">
                        {new Date(lesson.date).toLocaleDateString()} {new Date(lesson.date).toLocaleTimeString()}
                        {' • '}
                        <span className="capitalize">{lesson.status}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Present Students Card */}
                <Card>
                    <CardHeader className="bg-green-50/50 dark:bg-green-950/20 border-b">
                        <CardTitle className="flex items-center text-green-700 dark:text-green-500">
                            <UserCheck className="mr-2 h-5 w-5" />
                            Present ({presentStudents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {presentStudents.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No students marked present.</div>
                        ) : (
                            <ul className="divide-y">
                                {presentStudents.map(student => (
                                    <li key={student.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{student.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{student.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-green-600 bg-green-50 hover:bg-green-50">
                                                Present
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {student.timestamp ? new Date(student.timestamp).toLocaleTimeString() : 'Unknown'}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Absent Students Card */}
                <Card>
                    <CardHeader className="bg-red-50/50 dark:bg-red-950/20 border-b">
                        <CardTitle className="flex items-center text-red-700 dark:text-red-500">
                            <UserX className="mr-2 h-5 w-5" />
                            Absent ({absentStudents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {absentStudents.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No students were absent.</div>
                        ) : (
                            <ul className="divide-y">
                                {absentStudents.map(student => (
                                    <li key={student.id} className="p-4 flex items-center justify-between opacity-80">
                                        <div>
                                            <p className="font-medium">{student.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{student.email}</p>
                                        </div>
                                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-none shadow-none">
                                            Absent
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
