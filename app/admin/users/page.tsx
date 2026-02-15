import { createClient } from '@/utils/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from 'next/link'

export default async function UsersPage() {
    const supabase = createClient()
    const { data: users } = await (await supabase)
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <Button asChild>
                    <Link href="/admin/users/new">
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Link>
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Joined</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.full_name}</TableCell>
                                <TableCell className="capitalize">{user.role}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.group_id || '-'}</TableCell>
                                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                        {users?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No users found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
