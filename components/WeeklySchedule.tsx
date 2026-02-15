'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Trash2, Video } from "lucide-react"

// Types
export interface ScheduleItem {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    groups: { name: string } | null
    subjects: { name: string } | null
    users: { full_name: string } | null // Teacher
}

interface WeeklyScheduleProps {
    schedule: ScheduleItem[]
    onDelete?: (id: string) => void
    onEventClick?: (item: ScheduleItem) => void
    readOnly?: boolean
    role?: 'admin' | 'teacher' | 'student'
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

const START_HOUR = 8 // 8 AM
const END_HOUR = 20  // 8 PM
const CELL_HEIGHT = 60 // 60px per hour

export function WeeklySchedule({ schedule, onDelete, onEventClick, readOnly = false, role = 'student' }: WeeklyScheduleProps) {

    // Helper to calculate position
    const getPositionStyle = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number)
        const [endH, endM] = end.split(':').map(Number)

        const startDecimal = startH + startM / 60
        const endDecimal = endH + endM / 60

        const top = (startDecimal - START_HOUR) * CELL_HEIGHT
        const height = (endDecimal - startDecimal) * CELL_HEIGHT

        return { top: `${top}px`, height: `${height}px` }
    }

    return (
        <div className="flex-1 border rounded-lg shadow-sm bg-white dark:bg-zinc-950 overflow-hidden flex flex-col h-full bg-background">
            <div className="overflow-y-auto flex-1 relative custom-scrollbar">

                {/* 1. Header (Sticky) */}
                {/* 1. Header (Sticky) */}
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b flex shadow-sm ring-1 ring-border/5 min-w-[600px]">
                    {/* Top Left Corner */}
                    <div className="absolute top-0 left-0 bottom-0 w-[60px] border-r flex items-center justify-center text-xs font-medium text-muted-foreground bg-background z-10">
                        Time
                    </div>
                    {/* Days Header */}
                    <div className="flex flex-1 ml-[60px]">
                        {DAYS.map((day) => (
                            <div key={day.value} className="flex-1 py-3 text-center text-sm font-semibold text-foreground/80 border-r last:border-r-0">
                                {day.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Scrollable Grid Body */}
                <div className="relative min-w-[600px]" style={{ height: (END_HOUR - START_HOUR) * CELL_HEIGHT }}>

                    {/* Horizontal Grid Lines */}
                    <div className="absolute inset-0 w-full z-0 ml-[60px] pointer-events-none">
                        {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                            <div
                                key={i}
                                className="border-b border-gray-100 dark:border-gray-800 w-full"
                                style={{ height: CELL_HEIGHT, top: i * CELL_HEIGHT }}
                            />
                        ))}
                    </div>

                    {/* Time Column (Left Side) */}
                    <div className="absolute top-0 left-0 bottom-0 w-[60px] border-r bg-background z-10 flex flex-col">
                        {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                            <div
                                key={i}
                                className="relative w-full border-b border-transparent"
                                style={{ height: CELL_HEIGHT }}
                            >
                                {/* Center the time label on the grid line */}
                                <span
                                    className="absolute -top-2 right-2 text-xs text-muted-foreground text-right w-full pr-1 bg-background"
                                >
                                    {START_HOUR + i}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Events Grid */}
                    <div className="absolute inset-0 flex ml-[60px] z-20">
                        {DAYS.map((day) => {
                            const dayClasses = schedule.filter(s => s.day_of_week === day.value)
                            return (
                                <div key={day.value} className="flex-1 relative border-r last:border-r-0 border-transparent">
                                    {dayClasses.map(item => {
                                        const style = getPositionStyle(item.start_time, item.end_time)
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "absolute left-0.5 right-0.5 rounded px-2 py-1 border-l-4 transition-all overflow-hidden text-xs shadow-sm z-30 select-none",
                                                    onEventClick ? "cursor-pointer hover:brightness-95 hover:shadow-md" : "",
                                                    // Role-based styling
                                                    role === 'teacher' ? "bg-purple-50 dark:bg-purple-900/20 border-purple-500" :
                                                        role === 'admin' ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500" :
                                                            "bg-green-50 dark:bg-green-900/20 border-green-500"
                                                )}
                                                style={style}
                                                onClick={() => onEventClick && onEventClick(item)}
                                                title={`${item.groups?.name} - ${item.subjects?.name} (${item.users?.full_name})`}
                                            >
                                                <div className={cn(
                                                    "font-bold truncate text-[11px] leading-tight flex items-center gap-1 mb-0.5",
                                                    role === 'teacher' ? "text-purple-700 dark:text-purple-300" :
                                                        role === 'admin' ? "text-blue-700 dark:text-blue-300" :
                                                            "text-green-700 dark:text-green-300"
                                                )}>
                                                    {item.subjects?.name}
                                                    {role === 'teacher' && <Video className="h-3 w-3 inline ml-1" />}
                                                </div>
                                                <div className={cn(
                                                    "truncate text-[10px] leading-tight flex items-center gap-1",
                                                    role === 'teacher' ? "text-purple-600/80 dark:text-purple-300/70" :
                                                        role === 'admin' ? "text-blue-600/80 dark:text-blue-300/70" :
                                                            "text-green-600/80 dark:text-green-300/70"
                                                )}>
                                                    <span>{item.groups?.name}</span>
                                                </div>
                                                {role !== 'teacher' && (
                                                    <div className={cn(
                                                        "truncate text-[9px] mt-0.5 opacity-80",
                                                        role === 'admin' ? "text-blue-600 dark:text-blue-400" :
                                                            "text-green-600 dark:text-green-400"
                                                    )}>
                                                        {item.users?.full_name}
                                                    </div>
                                                )}

                                                {!readOnly && onDelete && (
                                                    <div
                                                        className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity cursor-pointer p-1 rounded-full hover:bg-white/50"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDelete(item.id)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>

                </div>
            </div>
        </div>
    )
}

