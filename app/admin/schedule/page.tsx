'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil } from "lucide-react"
import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { WeeklySchedule, ScheduleItem } from "@/components/WeeklySchedule"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Item {
    id: string
    name?: string
    full_name?: string
}

interface ScheduleRaw {
    id: string
    group_id: string
    subject_id: string
    teacher_id: string
    day_of_week: number
    start_time: string
    end_time: string
    start_date: string | null
    end_date: string | null
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
    const [scheduleRaw, setScheduleRaw] = useState<ScheduleRaw[]>([])
    const [groups, setGroups] = useState<Item[]>([])
    const [subjects, setSubjects] = useState<Item[]>([])
    const [teachers, setTeachers] = useState<Item[]>([])
    const [students, setStudents] = useState<Item[]>([])

    // Dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form State
    const [selectedGroup, setSelectedGroup] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [selectedTeacher, setSelectedTeacher] = useState('')
    const [selectedStudents, setSelectedStudents] = useState<string[]>([])
    const [selectedDay, setSelectedDay] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchData = async () => {
        const { data: scheduleData } = await supabase
            .from('schedule')
            .select(`
                id, group_id, subject_id, teacher_id, day_of_week, start_time, end_time, start_date, end_date,
                groups (name),
                subjects (name),
                users!schedule_teacher_id_fkey (full_name)
            `)
            .order('day_of_week')
            .order('start_time')

        if (scheduleData) {
            // @ts-expect-error Supabase join types
            setSchedule(scheduleData)
            setScheduleRaw(scheduleData.map((s: Record<string, unknown>) => ({
                id: s.id as string,
                group_id: s.group_id as string,
                subject_id: s.subject_id as string,
                teacher_id: s.teacher_id as string,
                day_of_week: s.day_of_week as number,
                start_time: s.start_time as string,
                end_time: s.end_time as string,
                start_date: s.start_date as string | null,
                end_date: s.end_date as string | null,
            })))
        }

        const { data: groupsData } = await supabase.from('groups').select('id, name')
        const { data: subjectsData } = await supabase.from('subjects').select('id, name')
        const { data: teachersData } = await supabase.from('users').select('id, full_name').eq('role', 'teacher')
        const { data: studentsData } = await supabase.from('users').select('id, full_name').eq('role', 'student').order('full_name')

        if (groupsData) setGroups(groupsData)
        if (subjectsData) setSubjects(subjectsData)
        if (teachersData) setTeachers(teachersData)
        if (studentsData) setStudents(studentsData)
    }

    const resetForm = () => {
        setEditingId(null)
        setSelectedGroup('')
        setSelectedSubject('')
        setSelectedTeacher('')
        setSelectedStudents([])
        setSelectedDay('')
        setStartTime('')
        setEndTime('')
        setPeriodStart('')
        setPeriodEnd('')
    }

    const openCreate = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const openEdit = async (item: ScheduleItem) => {
        const raw = scheduleRaw.find(s => s.id === item.id)
        if (!raw) return

        setEditingId(raw.id)
        setSelectedGroup(raw.group_id)
        setSelectedSubject(raw.subject_id)
        setSelectedTeacher(raw.teacher_id)
        setSelectedDay(raw.day_of_week.toString())
        setStartTime(raw.start_time?.slice(0, 5) || '')
        setEndTime(raw.end_time?.slice(0, 5) || '')
        setPeriodStart(raw.start_date || '')
        setPeriodEnd(raw.end_date || '')

        // Load assigned students
        const { data: assigned } = await supabase
            .from('schedule_students')
            .select('student_id')
            .eq('schedule_id', raw.id)

        setSelectedStudents(assigned ? assigned.map(a => a.student_id) : [])
        setIsDialogOpen(true)
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

    const handleSave = async () => {
        if (!selectedGroup || !selectedSubject || !selectedTeacher || !selectedDay || !startTime || !endTime || !periodStart || !periodEnd) {
            alert("Please fill all fields including the active period")
            return
        }

        if (periodEnd <= periodStart) {
            alert("End date must be after start date")
            return
        }

        if (selectedStudents.length === 0) {
            if (!confirm("You haven't selected any specific students for this class. Proceed anyway?")) return
        }

        const payload = {
            group_id: selectedGroup,
            subject_id: selectedSubject,
            teacher_id: selectedTeacher,
            day_of_week: parseInt(selectedDay),
            start_time: startTime,
            end_time: endTime,
            start_date: periodStart,
            end_date: periodEnd,
        }

        let scheduleId: string

        if (editingId) {
            // UPDATE
            const { error } = await supabase
                .from('schedule')
                .update(payload)
                .eq('id', editingId)

            if (error) {
                alert('Failed to update: ' + error.message)
                return
            }
            scheduleId = editingId

            // Replace schedule_students: delete old, insert new
            await supabase
                .from('schedule_students')
                .delete()
                .eq('schedule_id', editingId)
        } else {
            // INSERT
            const { data: newSchedule, error } = await supabase
                .from('schedule')
                .insert(payload)
                .select()
                .single()

            if (error || !newSchedule) {
                alert('Failed to create: ' + (error?.message || 'Unknown error'))
                return
            }
            scheduleId = newSchedule.id
        }

        // Insert schedule_students
        if (selectedStudents.length > 0) {
            const relations = selectedStudents.map(sid => ({
                schedule_id: scheduleId,
                student_id: sid,
            }))

            const { error: relError } = await supabase
                .from('schedule_students')
                .insert(relations)

            if (relError) {
                console.error("Failed to attach students:", relError)
                alert('Schedule saved, but failed to attach students.')
            }
        }

        setIsDialogOpen(false)
        resetForm()
        fetchData()
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
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Class
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Class' : 'Add Class to Schedule'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">

                        <div className="space-y-2">
                            <Label>Group</Label>
                            <Select value={selectedGroup} onValueChange={(val) => {
                                setSelectedGroup(val)
                                if (!editingId) selectStudentsByGroup(val)
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                                <SelectContent>
                                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Teacher</Label>
                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Students</Label>
                            <div className="text-xs text-muted-foreground mb-2">
                                Selecting a group auto-selects its students. You can modify manually.
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
                            <Select value={selectedDay} onValueChange={setSelectedDay}>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Active From</Label>
                                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Active Until</Label>
                                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                            </div>
                        </div>

                        <Button onClick={handleSave} className="w-full">
                            {editingId ? (
                                <><Pencil className="mr-2 h-4 w-4" /> Save Changes</>
                            ) : (
                                <><Plus className="mr-2 h-4 w-4" /> Create Class</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <WeeklySchedule
                schedule={schedule}
                onDelete={handleDelete}
                onEventClick={openEdit}
                role="admin"
            />
        </div>
    )
}
