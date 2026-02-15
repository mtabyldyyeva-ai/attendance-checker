import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function TeacherHistoryPage() {
    const supabase = createClient()

    // Fetch lessons with attendance count
    const { data: lessons, error } = await (await supabase)
        .from('lessons')
        .select(`
        id,
        date,
        status,
        attendance (count)
    `)
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons && lessons.length > 0 ? (
                                lessons.map((lesson) => (
                                    <TableRow key={lesson.id}>
                                        <TableCell>{new Date(lesson.date).toLocaleDateString()} {new Date(lesson.date).toLocaleTimeString()}</TableCell>
                                        <TableCell className="capitalize">{lesson.status}</TableCell>
                                        <TableCell>{lesson.attendance?.[0]?.count || 0}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
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
