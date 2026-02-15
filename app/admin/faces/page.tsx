import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X } from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function FacesPage() {
    const supabase = createClient()

    // Fetch users joined with their face descriptors
    // We use a left join to see who DOESN'T have face data too
    const { data: users, error } = await (await supabase)
        .from('users')
        .select(`
        id,
        full_name,
        email,
        role,
        face_descriptors (id)
    `)
        .eq('role', 'student') // Only students need faces usually
        .order('full_name')

    if (error) {
        console.error(error)
        return <div>Error loading users</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Face Data Registry</h1>
            <p className="text-gray-500">Manage face recognition data for students.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Students Face Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users && users.length > 0 ? (
                                users.map((user) => {
                                    const hasFace = user.face_descriptors && user.face_descriptors.length > 0
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                {hasFace ? (
                                                    <div className="flex items-center text-green-600">
                                                        <Check className="mr-2 h-4 w-4" /> Registered
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-500">
                                                        <X className="mr-2 h-4 w-4" /> Missing
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/admin/users/${user.id}`}>
                                                        {hasFace ? 'Update Photo' : 'Upload Photo'}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No students found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
