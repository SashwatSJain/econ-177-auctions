import type { Metadata } from 'next'
import AttendanceFlow from '@/components/AttendanceFlow'

export const metadata: Metadata = {
  title: 'Attendance — UCSB Econ 177',
  description: "Submit your attendance for today's class.",
}

export default function AttendancePage() {
  return <AttendanceFlow />
}
