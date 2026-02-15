'use client'

import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Group {
    id: string
    name: string
    created_at: string
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [newGroupName, setNewGroupName] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchGroups()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchGroups = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .order('name')

        if (error) {
            console.error('Error fetching groups:', error)
        } else {
            setGroups(data || [])
        }
        setLoading(false)
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return

        const { error } = await supabase
            .from('groups')
            .insert({ name: newGroupName })

        if (error) {
            alert('Failed to create group: ' + error.message)
        } else {
            setNewGroupName('')
            setIsDialogOpen(false)
            fetchGroups()
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return

        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Failed to delete group: ' + error.message)
        } else {
            fetchGroups()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. CS-2101"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateGroup} className="w-full">Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Student Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                                </TableRow>
                            ) : groups.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">No groups found.</TableCell>
                                </TableRow>
                            ) : (
                                groups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">{group.name}</TableCell>
                                        <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
