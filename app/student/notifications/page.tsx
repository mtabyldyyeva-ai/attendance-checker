import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function NotificationsPage() {
    const supabase = createClient()
    const { data: { user } } = await (await supabase).auth.getUser()

    if (!user) return <div>Please log in</div>

    // Fetch absent records for this student
    const { data: absences } = await (await supabase)
        .from('attendance')
        .select(`
        timestamp,
        lessons (date)
    `)
        .eq('student_id', user.id)
        .eq('status', 'absent')
        .order('timestamp', { ascending: false })

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>

            <div className="space-y-4">
                {absences && absences.length > 0 ? (
                    absences.map((record, index) => (
                        <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Absence Recorded</AlertTitle>
                            <AlertDescription>
                                You were marked absent for the class on {new Date(record.timestamp).toLocaleDateString()} at {new Date(record.timestamp).toLocaleTimeString()}.
                            </AlertDescription>
                        </Alert>
                    ))
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8 text-gray-500">
                            <Bell className="h-12 w-12 mb-4 opacity-50" />
                            <p>No new notifications.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
