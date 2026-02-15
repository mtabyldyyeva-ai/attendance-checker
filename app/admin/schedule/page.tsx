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
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [selectedGroup, setSelectedGroup] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedTeacher, setSelectedTeacher] = useState('')
    const [selectedDay, setSelectedDay] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        // Fetch Schedule
        const { data: scheduleData } = await supabase
            .from('schedule')
            .select(`
                id, day_of_week, start_time, end_time,
                groups (name),
                subjects (name),
                users (full_name)
            `)
            .order('day_of_week')
            .order('start_time')

        if (scheduleData) {
            // @ts-ignore
            setSchedule(scheduleData)
        }

        // Fetch Dropdown Data
        const { data: groupsData } = await supabase.from('groups').select('id, name')
        const { data: subjectsData } = await supabase.from('subjects').select('id, name')
        const { data: teachersData } = await supabase.from('users').select('id, full_name').eq('role', 'teacher')

        if (groupsData) setGroups(groupsData)
        if (subjectsData) setSubjects(subjectsData)
        if (teachersData) setTeachers(teachersData)

        setLoading(false)
    }

    const handleCreateSchedule = async () => {
        if (!selectedGroup || !selectedSubject || !selectedTeacher || !selectedDay || !startTime || !endTime) {
            alert("Please fill all fields")
            return
        }

        const { error } = await supabase
            .from('schedule')
            .insert({
                group_id: selectedGroup,
                subject_id: selectedSubject,
                teacher_id: selectedTeacher,
                day_of_week: parseInt(selectedDay),
                start_time: startTime,
                end_time: endTime
            })

        if (error) {
            alert('Failed to create schedule: ' + error.message)
        } else {
            setIsDialogOpen(false)
            fetchData()
            // Reset form
            setStartTime('')
            setEndTime('')
        }
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
                                <Label>Select Group</Label>
                                <Select onValueChange={setSelectedGroup}>
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
