import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Eye } from 'lucide-react'

export default async function TeacherHistoryPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please log in</div>
    }

    // Fetch lessons with attendance count — filtered by current teacher
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
        id,
        date,
        status,
        attendance (count)
    `)
        .eq('teacher_id', user.id)
        .order('date', { ascending: false })

    if (error) {
        console.error(error)
        return <div>Error loading history</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Class History</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Past Classes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Attendance Count</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons && lessons.length > 0 ? (
                                lessons.map((lesson) => (
                                    <TableRow key={lesson.id}>
                                        <TableCell>{new Date(lesson.date).toLocaleDateString()} {new Date(lesson.date).toLocaleTimeString()}</TableCell>
                                        <TableCell className="capitalize">{lesson.status}</TableCell>
                                        <TableCell>{lesson.attendance?.[0]?.count || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/teacher/history/${lesson.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500">
                                        No classes recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
