// ...existing imports/exports stay the same
import axios from '@/utils/axios'

export function useShiftApi() {
  /* ---------- TEMPLATES ---------- */
  const listTemplates = async (params = {}) => {
    const res = await axios.get('/hrss/shift-templates', { params })
    return Array.isArray(res.data?.data) ? res.data.data : res.data
  }

  const createTemplate = async (payload) => {
    const res = await axios.post('/hrss/shift-templates', payload)
    return res.data
  }

  const updateTemplate = async (id, payload) => {
    const res = await axios.put(`/hrss/shift-templates/${id}`, payload)
    return res.data
  }

  const deleteTemplate = async (id) => {
    const res = await axios.delete(`/hrss/shift-templates/${id}`)
    return res.data
  }

  /* ---------- ASSIGNMENTS (you already had these) ---------- */
  const createAssignment = async (payload) => {
    const res = await axios.post('/hrss/shift-assignments', payload)
    return res.data
  }
  const listAssignments = async (params = {}) => {
    const res = await axios.get('/hrss/shift-assignments', { params })
    return res.data
  }
  const deleteAssignment = async (id) => {
    const res = await axios.delete(`/hrss/shift-assignments/${id}`)
    return res.data
  }
  const resolveEffective = async ({ employeeId, date }) => {
    const res = await axios.get('/hrss/shift-assignments/resolve', { params: { employeeId, date } })
    return res.data
  }

  return {
    // templates
    listTemplates, createTemplate, updateTemplate, deleteTemplate,
    // assignments
    createAssignment, listAssignments, deleteAssignment, resolveEffective,
  }
}
