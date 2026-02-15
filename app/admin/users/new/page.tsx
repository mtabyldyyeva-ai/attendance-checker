'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
// import { useRouter } from 'next/navigation' // Unused
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from 'lucide-react'

interface Group {
    id: string
    name: string
}

export default function AddUserPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState('student')
    const [groupId, setGroupId] = useState('')
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    // const router = useRouter() // Unused
    const supabase = createClient()

    useEffect(() => {
        const fetchGroups = async () => {
            const { data } = await supabase.from('groups').select('id, name').order('name')
            if (data) setGroups(data)
        }
        fetchGroups()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            // Ideally, this should be done via a Server Action with Service Role Key
            // to avoid logging out the current admin.
            // For MVP client-side: 
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        group_id: role === 'student' ? groupId : null
                    }
                }
            })

            if (error) throw error

            if (data.user) {
                setMessage('User created successfully! (You may have been logged out as this was a client-side signup)')
                // Optional: clear form
                setEmail('')
                setPassword('')
                setFullName('')
            }
        } catch (err: unknown) {
            console.error(err)
            const errorMessage = err instanceof Error ? err.message : String(err)
            setMessage('Error: ' + errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Add New User</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullname">Full Name</Label>
                                <Input
                                    id="fullname"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {role === 'student' && (
                            <div className="space-y-2">
                                <Label htmlFor="group">Group</Label>
                                <Select value={groupId} onValueChange={setGroupId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {message && (
                            <div className={`text-sm p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create User
                        </Button>

                        <p className="text-xs text-muted-foreground text-center mt-2">
                            Note: Creating a user client-side may sign you out. Use Seed script for bulk creation.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
