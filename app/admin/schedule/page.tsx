'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { WeeklySchedule, ScheduleItem } from "@/components/WeeklySchedule"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types
interface Item {
    id: string
    name?: string
    full_name?: string
}

const DAYS = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    const [groups, setGroups] = useState<Item[]>([])
    const [subjects, setSubjects] = useState<Item[]>([])
    const [teachers, setTeachers] = useState<Item[]>([])
    const [students, setStudents] = useState<Item[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [selectedGroup, setSelectedGroup] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedTeacher, setSelectedTeacher] = useState('')
    const [selectedStudents, setSelectedStudents] = useState<string[]>([])
    const [selectedDay, setSelectedDay] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchData = async () => {
        // Fetch Schedule
        const { data: scheduleData } = await supabase
            .from('schedule')
            .select(`
                id, day_of_week, start_time, end_time,
                groups (name),
                subjects (name),
                users!schedule_teacher_id_fkey (full_name)
            `)
            .order('day_of_week')
            .order('start_time')

        if (scheduleData) {
            // @ts-expect-error Supabase join types are not fully inferred
            setSchedule(scheduleData)
        }

        // Fetch Dropdown Data
        const { data: groupsData } = await supabase.from('groups').select('id, name')
        const { data: subjectsData } = await supabase.from('subjects').select('id, name')
        const { data: teachersData } = await supabase.from('users').select('id, full_name').eq('role', 'teacher')
        const { data: studentsData } = await supabase.from('users').select('id, full_name').eq('role', 'student').order('full_name')

        if (groupsData) setGroups(groupsData)
        if (subjectsData) setSubjects(subjectsData)
        if (teachersData) setTeachers(teachersData)
        if (studentsData) setStudents(studentsData)
    }

    const toggleStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        )
    }

    const selectStudentsByGroup = async (groupId: string) => {
        if (!groupId) return
        const { data } = await supabase.from('users').select('id').eq('role', 'student').eq('group_id', groupId)
        if (data) {
            setSelectedStudents(data.map(u => u.id))
        }
    }

    const handleCreateSchedule = async () => {
        if (!selectedGroup || !selectedSubject || !selectedTeacher || !selectedDay || !startTime || !endTime) {
            alert("Please fill all fields")
            return
        }

        if (selectedStudents.length === 0) {
            if (!confirm("You haven't selected any specific students for this class. Proceed anyway?")) return
        }

        // 1. Insert schedule
        const { data: newSchedule, error } = await supabase
            .from('schedule')
            .insert({
                group_id: selectedGroup,
                subject_id: selectedSubject,
                teacher_id: selectedTeacher,
                day_of_week: parseInt(selectedDay),
                start_time: startTime,
                end_time: endTime
            })
            .select()
            .single()

        if (error || !newSchedule) {
            alert('Failed to create schedule: ' + (error?.message || 'Unknown error'))
            return
        }

        // 2. Insert schedule_students relationships
        if (selectedStudents.length > 0) {
            const studentRelations = selectedStudents.map(studentId => ({
                schedule_id: newSchedule.id,
                student_id: studentId
            }))

            const { error: relationError } = await supabase
                .from('schedule_students')
                .insert(studentRelations)

            if (relationError) {
                console.error("Failed to attach students to schedule:", relationError)
                alert('Schedule created, but failed to attach students.')
            }
        }

        setIsDialogOpen(false)
        fetchData()
        // Reset form
        setStartTime('')
        setEndTime('')
        setSelectedStudents([])
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this schedule item?')) return
        const { error } = await supabase.from('schedule').delete().eq('id', id)
        if (!error) fetchData()
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Class Schedule</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Class
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Class to Schedule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">

                            <div className="space-y-2">
                                <Label>Group (Helps filter students and label schedule block)</Label>
                                <Select onValueChange={(val) => {
                                    setSelectedGroup(val)
                                    selectStudentsByGroup(val)
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                                    <SelectContent>
                                        {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Subject</Label>
                                <Select onValueChange={setSelectedSubject}>
                                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Teacher</Label>
                                <Select onValueChange={setSelectedTeacher}>
                                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Specific Students</Label>
                                <div className="text-xs text-muted-foreground mb-2">
                                    Selecting a group above automatically selects its students here. You can modify the list manually.
                                </div>
                                <div className="border rounded-md p-2">
                                    <ScrollArea className="h-[150px] w-full pr-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            {students.map(student => (
                                                <div key={student.id} className="flex flex-row items-center space-x-2">
                                                    <Checkbox
                                                        id={`student-${student.id}`}
                                                        checked={selectedStudents.includes(student.id)}
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                    />
                                                    <Label
                                                        htmlFor={`student-${student.id}`}
                                                        className="text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                                                    >
                                                        {student.full_name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Day of Week</Label>
                                <Select onValueChange={setSelectedDay}>
                                    <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>

                            <Button onClick={handleCreateSchedule} className="w-full">Create Class</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <WeeklySchedule
                schedule={schedule}
                onDelete={handleDelete}
                role="admin"
            />
        </div>
    )
}
