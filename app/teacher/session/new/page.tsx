import { AttendanceSession } from '@/components/teacher/AttendanceSession'

export default function NewSessionPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Active Class Session</h1>
            </div>

            <AttendanceSession />
        </div>
    )
}
