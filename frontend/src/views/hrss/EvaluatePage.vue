<template>
  <v-container fluid class="pa-4">

    <!-- Section 1: Evaluation Overview -->
    <v-card class="mb-6">
      <v-card-title class="font-weight-bold">
        <v-icon color="deep-purple" class="mr-2">mdi-star-circle</v-icon>
        Evaluation Overview
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4" v-for="ev in evaluations" :key="ev._id">
            <strong>{{ ev.step }} Date:</strong> {{ formatDate(ev.date) }}<br>
            <strong>{{ ev.step }} Reason:</strong> {{ ev.reason || '-' }}
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Section 2: Evaluation Form + Employee Details -->
    <v-row dense>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="font-weight-bold">
            <v-icon color="red" class="mr-2">mdi-clipboard-text</v-icon>
            Evaluation Form
          </v-card-title>
          <v-card-text>
            <v-select
              v-model="evaluationStep"
              :items="['Evaluate1', 'Evaluate2', 'Evaluate3']"
              label="Evaluation Step"
            />
            <v-textarea
              v-model="evaluationReason"
              label="Evaluation Reason"
              rows="4"
              class="mt-4"
            />
            <div class="d-flex justify-end mt-4 gap-4">
              <v-btn variant="outlined" color="grey" @click="router.push('/hrss/attendance')">
                Cancel
              </v-btn>
              <v-btn color="primary" @click="submitEvaluation">
                Submit
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="font-weight-bold">
            <v-icon color="purple" class="mr-2">mdi-account-box</v-icon>
            Employee Details
          </v-card-title>
          <v-card-text>
            <v-row dense v-if="employee && employee._id">
              <v-col
                cols="12"
                sm="6"
                md="4"
                v-for="field in employeeFields(employee)"
                :key="field.label"
              >
                <strong>{{ field.label }}:</strong> {{ field.value || '-' }}
              </v-col>
            </v-row>
            <div v-else class="text-grey">Employee details not available.</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Section 3: Attendance History -->
    <v-row dense>
      <v-col cols="12">
        <v-card>
          <v-card-title class="font-weight-bold">
            <v-icon color="green" class="mr-2">mdi-history</v-icon>
            Attendance History
          </v-card-title>
          <v-card-text>
            <div style="max-height: 300px; overflow-y: auto;">
              <v-list v-if="attendanceHistory.length">
                <v-list-item
                  v-for="record in attendanceHistory"
                  :key="record._id"
                >
                  <v-list-item-content>
                    <v-list-item-title>
                      <strong>{{ formatDate(record.date) }}</strong> —
                      Status: {{ record.status }},
                      Evaluate: {{ record.evaluate || 'None' }},
                      Risk: {{ record.riskStatus || '-' }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
              <div v-else class="text-grey">No attendance history found.</div>
            </div>

            <v-pagination
              v-if="totalPages > 1"
              v-model="currentPage"
              :length="totalPages"
              @input="fetchAttendanceHistory"
              class="mt-3"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/utils/axios';
import dayjs from 'dayjs';

// ─────────────────────────────────────────────────────────────
// ⛳ Router and reactive state setup
// ─────────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();

const attendance = ref({});
const employee = ref({});
const attendanceHistory = ref([]);
const evaluations = ref([]);

const evaluationStep = ref('');
const evaluationReason = ref('');

const totalPages = ref(1);        // ✅ For pagination
const currentPage = ref(1);       // ✅ Tracks current page

// ─────────────────────────────────────────────────────────────
// 📌 Utility: Format date
// ─────────────────────────────────────────────────────────────
function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-';
}

// ─────────────────────────────────────────────────────────────
// 🧾 Employee field display logic
// ─────────────────────────────────────────────────────────────
const employeeFields = emp => [
  { label: 'Employee ID', value: emp.employeeId },
  { label: 'Khmer Name', value: `${emp.khmerFirstName} ${emp.khmerLastName}` },
  { label: 'English Name', value: `${emp.englishFirstName} ${emp.englishLastName}` },
  { label: 'Gender', value: emp.gender },
  { label: 'Date of Birth', value: formatDate(emp.dob) },
  { label: 'Age', value: emp.age },
  { label: 'Phone Number', value: emp.phoneNumber },
  { label: 'Email', value: emp.email },
  { label: 'Department', value: emp.department },
  { label: 'Position', value: emp.position },
  { label: 'Line', value: emp.line },
  { label: 'Shift', value: emp.shift },
  { label: 'Join Date', value: formatDate(emp.joinDate) },
  { label: 'Nationality', value: emp.nationality },
  { label: 'Married Status', value: emp.marriedStatus },
  { label: 'Agent Person', value: emp.agentPerson },
  { label: 'Spouse Name', value: emp.spouseName },
  { label: 'Religion', value: emp.religion },
  { label: 'Remark', value: emp.remark },
];

// ─────────────────────────────────────────────────────────────
// 🔄 Load all data: attendance, employee, evaluation, history
// ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    // 1. Get attendance by ID
    const attendanceRes = await api.get(`/attendance/attendances/${route.params.id}`);
    attendance.value = attendanceRes.data;

    const empId = attendance.value.employeeId;
    if (!empId || empId === 'undefined') {
      throw new Error('Employee ID missing in attendance record!');
    }

    // 2. Get employee info
    const empRes = await api.get(`/employees/by-employee-id/${empId}`);
    employee.value = empRes.data;

    // 3. Get evaluations
    const evalRes = await api.get(`/evaluations/${empId}`);
    evaluations.value = evalRes.data;

    // 4. Get paginated attendance history
    await fetchAttendanceHistory();

  } catch (error) {
    console.error('❌ Fetch error:', error);
    alert('Error fetching data.');
  }
}

// ─────────────────────────────────────────────────────────────
// 📥 Submit evaluation form
// ─────────────────────────────────────────────────────────────
async function submitEvaluation() {
  if (!evaluationStep.value || !evaluationReason.value) {
    alert('Please fill in both evaluation step and reason.');
    return;
  }

  try {
    const empId = attendance.value.employeeId;
    const payload = {
      employeeId: empId,
      step: evaluationStep.value,
      reason: evaluationReason.value,
      date: new Date(),
      evaluator: 'System Admin', // Replace with logged-in user if available
    };
    await api.post(`/evaluations`, payload);
    alert('Evaluation submitted successfully!');
    await loadData(); // refresh everything after submit
  } catch (error) {
    console.error('❌ Submit error:', error);
    alert('Failed to submit evaluation.');
  }
}

// ─────────────────────────────────────────────────────────────
// 📜 Fetch paginated attendance history for this employee
// ─────────────────────────────────────────────────────────────
const fetchAttendanceHistory = async () => {
  const empId = attendance.value.employeeId;
  if (!empId) return;

  try {
    const res = await api.get(`/attendance/history/${empId}`, {
      params: { page: currentPage.value, limit: 20 }
    });
    attendanceHistory.value = res.data.records;
    totalPages.value = res.data.totalPages; // ✅ FIXED typo from `totalPage`
  } catch (err) {
    console.error('❌ History fetch error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 🚀 Load everything on mount
// ─────────────────────────────────────────────────────────────
onMounted(loadData); // ✅ Only one mount call needed

</script>

