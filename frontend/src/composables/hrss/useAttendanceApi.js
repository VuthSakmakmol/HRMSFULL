import axios from '@/utils/axios'

export function useAttendanceApi() {
  const listPaginated = async (params) => {
    const res = await axios.get('/attendance/paginated', { params })
    return res.data
  }

  const updateAttendance = async (id, payload) => {
    await axios.put(`/attendance/${id}`, payload)
  }

  const deleteAttendance = async (id) => {
    await axios.delete(`/attendance/${id}`)
  }

  const importAttendance = async (payload) => {
    const res = await axios.post('/attendance/import', payload)
    return res.data
  }

  const listShiftTemplates = async () => {
    const res = await axios.get('/hrss/shift-templates', { params: { active: true, limit: 200 }})
    return Array.isArray(res.data?.data) ? res.data.data : res.data
  }

  return {
    listPaginated,
    updateAttendance,
    deleteAttendance,
    importAttendance,
    listShiftTemplates
  }
}
