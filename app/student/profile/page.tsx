import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

export default async function ProfilePage() {
    const supabase = createClient()
    const { data: { user } } = await (await supabase).auth.getUser()

    if (!user) return <div>Please log in</div>

    const { data: profile } = await (await supabase)
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    const { count: faceCount } = await (await supabase)
        .from('face_descriptors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 p-4 rounded-full">
                                <User className="h-8 w-8 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Full Name</p>
                                <p className="text-lg font-bold">{profile?.full_name || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-lg">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Role</p>
                            <Badge variant="secondary" className="capitalize">{profile?.role || 'student'}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Face Recognition Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-6 space-y-4">
                            <div className={`text-4xl font-bold ${faceCount ? 'text-green-600' : 'text-red-500'}`}>
                                {faceCount ? 'Active' : 'Missing'}
                            </div>
                            <p className="text-center text-gray-500">
                                {faceCount
                                    ? "Your face data is registered and ready for attendance."
                                    : "Please contact an administrator to register your face data."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
