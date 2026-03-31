import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FaceUpload } from '@/components/admin/FaceUpload'
import { notFound } from 'next/navigation'

export default async function UserDetailsPage(props: { params: Promise<{ id: string }> }) {
    // Await params before using its properties
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient()
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !user) {
        notFound()
    }

    const { data: faceData } = await supabase
        .from('face_descriptors')
        .select('id, created_at')
        .eq('user_id', id)

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">User Details</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <span className="font-semibold">Full Name:</span> {user.full_name}
                        </div>
                        <div>
                            <span className="font-semibold">Email:</span> {user.email}
                        </div>
                        <div>
                            <span className="font-semibold">Role:</span> <span className="capitalize">{user.role}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Group ID:</span> {user.group_id || 'N/A'}
                        </div>
                        <div>
                            <span className="font-semibold">Joined:</span> {new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Face Recognition Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <span className="font-semibold">Status: </span>
                            {faceData && faceData.length > 0 ? (
                                <span className="text-green-600 font-medium">Registered ({faceData.length} descriptors)</span>
                            ) : (
                                <span className="text-red-500 font-medium">Not Registered</span>
                            )}
                        </div>

                        <FaceUpload userId={user.id} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
