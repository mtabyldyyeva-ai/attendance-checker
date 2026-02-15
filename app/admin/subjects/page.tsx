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

interface Subject {
    id: string
    name: string
    created_at: string
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [newSubjectName, setNewSubjectName] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchSubjects()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchSubjects = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name')

        if (error) {
            console.error('Error fetching subjects:', error)
        } else {
            setSubjects(data || [])
        }
        setLoading(false)
    }

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim()) return

        const { error } = await supabase
            .from('subjects')
            .insert({ name: newSubjectName })

        if (error) {
            alert('Failed to create subject: ' + error.message)
        } else {
            setNewSubjectName('')
            setIsDialogOpen(false)
            fetchSubjects()
        }
    }

    const handleDeleteSubject = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return

        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Failed to delete subject: ' + error.message)
        } else {
            fetchSubjects()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Subject
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Subject</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Subject Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Mathematics"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateSubject} className="w-full">Create</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Subjects</CardTitle>
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
                            ) : subjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">No subjects found.</TableCell>
                                </TableRow>
                            ) : (
                                subjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell className="font-medium">{subject.name}</TableCell>
                                        <TableCell>{new Date(subject.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteSubject(subject.id)}
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
