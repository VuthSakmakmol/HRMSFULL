// src/composables/hrss/useImportAttendance.js
import * as XLSX from 'xlsx'
import dayjs from '@/plugins/dayjs'
import Swal from 'sweetalert2'
import { ref, computed } from 'vue'
import { useAttendanceApi } from './useAttendanceApi'

export function useImportAttendance({ onAfterCommit } = {}) {
  const { importAttendance } = useAttendanceApi()
  const CHUNK_SIZE = 1200
  const importProg = ref({ active:false, sent:0, total:0 })
  const importPct = computed(() =>
    importProg.value.total
      ? Math.round((importProg.value.sent / importProg.value.total) * 100)
      : 0
  )

  const toHHmm = (v) => {
    if (v == null || v === '') return ''
    if (typeof v === 'number') {
      const total = Math.round(v * 24 * 60)
      const hh = String(Math.floor(total / 60)).padStart(2,'0')
      const mm = String(total % 60).padStart(2,'0')
      return `${hh}:${mm}`
    }
    const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/)
    return m ? `${m[1].padStart(2,'0')}:${m[2]}` : ''
  }

  const toYMD = (v) => {
    if (v == null || v === '') return ''
    if (typeof v === 'number' && isFinite(v)) {
      const jsDate = new Date(Math.round((v - 25569) * 86400 * 1000))
      return dayjs(jsDate).format('YYYY-MM-DD')
    }
    const s = String(v).trim(); if (!s) return ''
    const t = s.replace(/[./\\\s]+/g, '-')
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) return dayjs(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`).format('YYYY-MM-DD')
    m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (m) return dayjs(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`).format('YYYY-MM-DD')
    const d = dayjs(s)
    return d.isValid() ? d.format('YYYY-MM-DD') : ''
  }

  const chunkify = (arr, size) => {
    const out = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  /**
   * Reads the file, validates, commits in chunks, and RETURNS the date
   * of the imported rows so the page can snap its filter.
   */
  const importExcel = async (file, { selectedDate } = {}) => {
    if (!file) return { ok: false }

    importProg.value = { active:true, sent:0, total:0 }

    const buf = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buf), { type:'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval:'', blankrows:false, raw:false })

    if (!rawRows.length) {
      importProg.value.active = false
      await Swal.fire('Empty file', 'No rows to import.', 'warning')
      return { ok: false }
    }

    const preparedRows = rawRows.map(r => ({
      employeeId: String(r.employeeId || r.EmployeeID || r['Employee ID'] || '').trim(),
      fullName:   String(r.fullName   || r.FullName   || r['Full Name']   || r.name || '').trim(),
      date:       toYMD(r.date || r.Date || r.DATE || selectedDate),
      startTime:  toHHmm(r.startTime || r.StartTime || r['Time In']  || r.TimeIn),
      endTime:    toHHmm(r.endTime   || r.EndTime   || r['Time Out'] || r.TimeOut),
      leaveType:  String(r.leaveType  || r.LeaveType || r['Leave Type'] || '').trim(),
    })).filter(r => r.date)

    importProg.value.total = preparedRows.length

    // Detect the set of dates present in the file (usually 1 day)
    const uniqueDates = [...new Set(preparedRows.map(r => r.date))]
    const clientDetectedDate = uniqueDates.length === 1 ? uniqueDates[0] : null

    // 1) validate (server may also tell us it's a non-working day)
    let vres
    try {
      vres = await importAttendance({ mode:'validate', rows: preparedRows })
    } catch (e) {
      importProg.value.active = false
      const msg = e?.response?.data?.message || 'Validation failed'
      await Swal.fire('Import failed', msg, 'error')
      return { ok: false }
    }

    const nonWorkingDay = vres.nonWorkingDay || null

    // 2) commit in chunks; remember the first server-side importDate if present
    let totalImported = 0
    let serverImportDate = null

    for (const part of chunkify(preparedRows, CHUNK_SIZE)) {
      try {
        const res = await importAttendance({
          mode:'commit',
          allowNonWorking: !!nonWorkingDay,
          rows: part
        })
        totalImported += (res.summary || []).length
        if (!serverImportDate && res?.importDate) serverImportDate = res.importDate
      } catch (e) {
        const msg = e?.response?.data?.message || e.message
        await Swal.fire('Import warning', msg, 'warning')
      } finally {
        importProg.value.sent = Math.min(importProg.value.total, importProg.value.sent + part.length)
      }
    }

    await Swal.fire('Imported', `Imported ${totalImported} rows.`, 'success')
    if (typeof onAfterCommit === 'function') await onAfterCommit()
    importProg.value.active = false

    // Prefer server date; fall back to client-detected date
    return { ok: true, importDate: serverImportDate || clientDetectedDate || selectedDate || null }
  }

  return { importProg, importPct, importExcel }
}
