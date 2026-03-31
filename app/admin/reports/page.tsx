'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown, Loader2, Search } from "lucide-react"
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface FilterOption {
    id: string
    name: string
}

interface AttendanceRow {
    student_name: string
    student_email: string
    subject: string
    teacher: string
    date: string
    time: string
    status: string
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [subjects, setSubjects] = useState<FilterOption[]>([])
    const [teachers, setTeachers] = useState<FilterOption[]>([])

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [selectedSubject, setSelectedSubject] = useState<string>('all')
    const [selectedTeacher, setSelectedTeacher] = useState<string>('all')

    // Results
    const [results, setResults] = useState<AttendanceRow[]>([])
    const [searched, setSearched] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        const fetchFilters = async () => {
            const [{ data: subjectsData }, { data: teachersData }] = await Promise.all([
                supabase.from('subjects').select('id, name').order('name'),
                supabase.from('users').select('id, full_name').eq('role', 'teacher').order('full_name'),
            ])
            if (subjectsData) setSubjects(subjectsData.map(s => ({ id: s.id, name: s.name })))
            if (teachersData) setTeachers(teachersData.map(t => ({ id: t.id, name: t.full_name || t.id })))
        }
        fetchFilters()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const buildQuery = () => {
        let query = supabase
            .from('attendance')
            .select(`
                status,
                timestamp,
                student_id,
                users!attendance_student_id_fkey (full_name, email),
                lessons!inner (
                    date,
                    teacher_id,
                    subject_id,
                    subjects (name),
                    users!lessons_teacher_id_fkey (full_name)
                )
            `)
            .order('timestamp', { ascending: false })

        if (dateFrom) {
            query = query.gte('lessons.date', dateFrom)
        }
        if (dateTo) {
            query = query.lte('lessons.date', dateTo)
        }
        if (selectedSubject !== 'all') {
            query = query.eq('lessons.subject_id', selectedSubject)
        }
        if (selectedTeacher !== 'all') {
            query = query.eq('lessons.teacher_id', selectedTeacher)
        }

        return query
    }

    const parseRow = (row: Record<string, unknown>): AttendanceRow => {
        const student = row.users as { full_name?: string; email?: string } | null
        const lesson = row.lessons as {
            date?: string
            subjects?: { name?: string } | null
            users?: { full_name?: string } | null
        } | null

        return {
            student_name: student?.full_name || 'Unknown',
            student_email: student?.email || '',
            subject: lesson?.subjects?.name || '—',
            teacher: lesson?.users?.full_name || '—',
            date: lesson?.date ? new Date(lesson.date).toLocaleDateString() : '—',
            time: row.timestamp ? new Date(row.timestamp as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
            status: (row.status as string) || '—',
        }
    }

    const handleSearch = async () => {
        setLoading(true)
        setSearched(true)
        try {
            const { data, error } = await buildQuery()
            if (error) throw error
            setResults((data || []).map((r: unknown) => parseRow(r as Record<string, unknown>)))
        } catch (err) {
            console.error(err)
            alert('Failed to fetch data: ' + (err instanceof Error ? err.message : String(err)))
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const { data, error } = await buildQuery().limit(10000)
            if (error) throw error
            if (!data || data.length === 0) {
                alert('No data to export.')
                return
            }

            const rows = (data as unknown[]).map(r => parseRow(r as Record<string, unknown>))

            const csvRows = []
            csvRows.push(['Student Name', 'Email', 'Subject', 'Teacher', 'Date', 'Time', 'Status'].join(','))

            for (const row of rows) {
                const values = [
                    row.student_name,
                    row.student_email,
                    row.subject,
                    row.teacher,
                    row.date,
                    row.time,
                    row.status,
                ]
                csvRows.push(values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            }

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.setAttribute('hidden', '')
            a.setAttribute('href', url)
            const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
            a.setAttribute('download', filename)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (err) {
            console.error(err)
            alert('Export failed: ' + (err instanceof Error ? err.message : String(err)))
        } finally {
            setExporting(false)
        }
    }

    const resetFilters = () => {
        setDateFrom('')
        setDateTo('')
        setSelectedSubject('all')
        setSelectedTeacher('all')
        setResults([])
        setSearched(false)
    }

    const statusColor = (s: string) => {
        if (s === 'present') return 'bg-green-100 text-green-800'
        if (s === 'absent') return 'bg-red-100 text-red-800'
        if (s === 'late') return 'bg-yellow-100 text-yellow-800'
        return 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Date From */}
                        <div className="space-y-2">
                            <Label>From</Label>
                            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>

                        {/* Date To */}
                        <div className="space-y-2">
                            <Label>To</Label>
                            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All subjects</SelectItem>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Teacher */}
                        <div className="space-y-2">
                            <Label>Teacher</Label>
                            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                <SelectTrigger><SelectValue placeholder="All teachers" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All teachers</SelectItem>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                        <Button onClick={handleSearch} disabled={loading} className="min-w-0">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            <span className="truncate">Search</span>
                        </Button>
                        <Button variant="outline" onClick={resetFilters} className="min-w-0">
                            <span className="truncate">Reset</span>
                        </Button>
                        <Button variant="secondary" onClick={handleExport} disabled={exporting} className="min-w-0">
                            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            <span className="truncate">Export CSV</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            {searched && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Results {results.length > 0 && <span className="text-muted-foreground font-normal">({results.length} records)</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : results.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No records found for the selected filters.</p>
                        ) : (
                            <div className="rounded-md border overflow-auto max-h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Teacher</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div className="font-medium">{row.student_name}</div>
                                                    <div className="text-xs text-muted-foreground">{row.student_email}</div>
                                                </TableCell>
                                                <TableCell>{row.subject}</TableCell>
                                                <TableCell>{row.teacher}</TableCell>
                                                <TableCell>{row.date}</TableCell>
                                                <TableCell className="font-mono text-sm">{row.time}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={cn("capitalize", statusColor(row.status))}>
                                                        {row.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
