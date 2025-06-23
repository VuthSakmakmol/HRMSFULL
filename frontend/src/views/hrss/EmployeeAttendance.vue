<template>
  <v-container fluid>
    <v-card class="pa-4">
      <h2 class="text-h6 font-weight-bold mb-4">📥 Import Attendance</h2>

      <v-file-input
        label="Upload Excel File (.xlsx)"
        accept=".xlsx"
        prepend-icon="mdi-upload"
        variant="outlined"
        @update:modelValue="handleImport"
      />


      <v-divider class="my-4" />

      <v-data-table
        :headers="headers"
        :items="attendanceData"
        item-value="employeeId"
        class="elevation-1"
        v-if="attendanceData.length"
      >
        <template #top>
          <v-toolbar flat>
            <v-toolbar-title>Imported Attendance Preview</v-toolbar-title>
            <v-spacer />
            <v-btn color="primary" @click="submitData" :disabled="loading">
              <v-icon start>mdi-check</v-icon>
              Submit to Server
            </v-btn>
          </v-toolbar>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import * as XLSX from 'xlsx'
import { ref } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'

const attendanceData = ref([])
const loading = ref(false)

const headers = [
  { title: 'Date', key: 'date' },
  { title: 'Employee ID', key: 'employeeId' },
  { title: 'Full Name', key: 'fullName' },
  { title: 'Time In', key: 'timeIn' },
  { title: 'Status', key: 'status' },
  { title: 'Alert', key: 'alert' }
]

const handleImport = async (file) => {
  if (!file || !(file instanceof Blob)) {
    Swal.fire('❌ Invalid File', 'Please upload a valid Excel (.xlsx) file.', 'error')
    return
  }

  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const processed = await Promise.all(rows.map(async (row) => {
        const time = row['Time1']?.toString().padStart(4, '0')
        const hour = parseInt(time.slice(0, 2))
        const minute = parseInt(time.slice(2, 4))
        const late = hour > 7 || (hour === 7 && minute > 15)
        const status = time ? (late ? 'Late' : 'On Time') : 'Absent'

        let fullName = ''
        try {
          await axios.post('/attendance/import-attendance', attendanceData.value)
          fullName = `${res.data.khmerLastName || ''} ${res.data.khmerFirstName || ''}`.trim()
        } catch (err) {
          fullName = '[Unknown]'
        }

        return {
          date: row['Record Date'],
          employeeId: row['Employee No'],
          fullName,
          timeIn: time || '',
          status,
          alert: '' // let backend decide alert logic (abandon, warning)
        }
      }))

      attendanceData.value = processed
    } catch (err) {
      console.error('❌ Excel processing error:', err)
      Swal.fire('❌ Error', 'Failed to parse Excel file.', 'error')
    }
  }

  reader.readAsArrayBuffer(file)
}


const submitData = async () => {
  try {
    loading.value = true
    const res = await axios.post('/employees/import-attendance', attendanceData.value)
    Swal.fire('✅ Success', res.data.message, 'success')
    attendanceData.value = []
  } catch (err) {
    Swal.fire('❌ Error', err.response?.data?.message || 'Failed to import', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-data-table {
  max-height: 600px;
  overflow-y: auto;
}
</style>
