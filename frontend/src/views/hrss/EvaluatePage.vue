<template>
  <v-container fluid class="pa-4 evaluate-page">

    <!-- Header / Breadcrumb-ish bar -->
    <v-sheet class="mb-6 header-sheet rounded-2xl elevation-0 px-4 py-3 d-flex align-center justify-space-between">
      <div class="d-flex align-center" style="gap:10px;">
        <v-avatar size="36" color="primary" class="elev">
          <v-icon>mdi-clipboard-text</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold">Employee Evaluation</div>
          <div class="text-caption text-medium-emphasis">Review & record evaluations with full context</div>
        </div>
      </div>
      <v-btn color="primary" variant="tonal" class="rounded-xl" @click="router.push('/hrss/attendance')">
        <v-icon start>mdi-arrow-left</v-icon> Back to Attendance
      </v-btn>
    </v-sheet>

    <!-- Section 1: Overview / Timeline -->
    <v-card class="mb-6 rounded-2xl elevation-1">
      <v-card-title class="py-3 d-flex align-center">
        <v-icon color="deep-purple-accent-4" class="mr-2">mdi-star-circle</v-icon>
        <span class="font-weight-bold">Evaluation Overview</span>
        <v-spacer />
        <v-chip v-if="employee.employeeId" size="small" color="primary" variant="flat">
          {{ employee.employeeId }}
        </v-chip>
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-5">
        <v-row>
          <v-col cols="12" md="7">
            <div class="timeline-box">
              <v-timeline
                v-if="evaluations?.length"
                density="compact"
                side="end"
                truncate-line="both"
                line-inset="8"
              >
                <v-timeline-item
                  v-for="ev in timelineItems"
                  :key="ev.key"
                  :dot-color="ev.color"
                  :icon="ev.icon"
                  size="small"
                >
                  <div class="d-flex align-center justify-space-between">
                    <div class="font-weight-medium">{{ ev.title }}</div>
                    <v-chip :color="ev.color" density="comfortable" size="x-small" variant="flat">
                      {{ ev.step }}
                    </v-chip>
                  </div>
                  <div class="text-caption mt-1">
                    <strong>Date:</strong> {{ ev.date }}<br>
                    <strong>Reason:</strong> {{ ev.reason }}
                  </div>
                </v-timeline-item>
              </v-timeline>

              <!-- Proper empty state OUTSIDE the timeline -->
              <div v-else class="empty-state">
                <v-icon class="mr-2">mdi-timetable</v-icon>
                No evaluations recorded yet.
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="5">
            <v-sheet class="rounded-xl pa-4 info-pill-grid">
              <div class="pill">
                <v-icon size="18" class="mr-1">mdi-history</v-icon>
                <span class="text-caption">Records</span>
                <div class="text-h6 font-weight-bold">{{ totalHistory || 0 }}</div>
              </div>
              <div class="pill">
                <v-icon size="18" class="mr-1">mdi-alert</v-icon>
                <span class="text-caption">Latest Risk</span>
                <div class="text-subtitle-2 font-weight-medium">
                  {{ lastRisk || '-' }}
                </div>
              </div>
              <div class="pill">
                <v-icon size="18" class="mr-1">mdi-check-decagram</v-icon>
                <span class="text-caption">Latest Eval</span>
                <div class="text-subtitle-2 font-weight-medium">
                  {{ lastEval || '-' }}
                </div>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Section 2: Form + Employee -->
    <v-row dense>
      <v-col cols="12" md="6">
        <v-card class="rounded-2xl elevation-1">
          <v-card-title class="py-3">
            <v-icon color="red-accent-4" class="mr-2">mdi-clipboard-text</v-icon>
            <span class="font-weight-bold">Evaluation Form</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pt-5">
            <v-form ref="formRef" v-model="formValid">
              <v-select
                v-model="evaluationStep"
                :items="['Evaluate1', 'Evaluate2', 'Evaluate3']"
                label="Evaluation Step"
                :rules="[v => !!v || 'Select a step']"
                variant="outlined"
                class="mb-4"
              />
              <v-textarea
                v-model="evaluationReason"
                label="Evaluation Reason"
                rows="5"
                auto-grow
                variant="outlined"
                :rules="[v => !!v || 'Reason is required']"
              />

              <div class="d-flex justify-space-between align-center mt-6">
                <div class="text-caption text-medium-emphasis">
                  Evaluator: <strong>{{ evaluatorName }}</strong>
                </div>
                <div class="d-flex ga-3">
                  <v-btn variant="outlined" color="grey" class="rounded-xl" @click="router.push('/hrss/attendance')">
                    Cancel
                  </v-btn>
                  <v-btn color="primary" class="rounded-xl" :loading="submitLoading" @click="onSubmit">
                    <v-icon start>mdi-send</v-icon> Submit
                  </v-btn>
                </div>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="rounded-2xl elevation-1">
          <v-card-title class="py-3 d-flex align-center">
            <v-icon color="purple" class="mr-2">mdi-account-box</v-icon>
            <span class="font-weight-bold">Employee Details</span>
            <v-spacer />
            <v-chip v-if="employee.shift" size="small" color="indigo" variant="tonal">
              {{ employee.shift }}
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <template v-if="loadingEmployee">
              <v-skeleton-loader type="list-item-two-line" class="mb-2" />
              <v-skeleton-loader type="list-item-two-line" class="mb-2" />
              <v-skeleton-loader type="list-item-two-line" />
            </template>

            <template v-else>
              <div class="d-flex align-start mb-4" style="gap:14px;">
                <v-avatar size="64" color="primary" class="elev">
                  <span class="text-h6 font-weight-bold">{{ initials }}</span>
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ fullName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ employee.position || '-' }} • {{ employee.department || '-' }}</div>
                  <div class="text-caption text-medium-emphasis">Line: {{ employee.line || '-' }}</div>
                </div>
              </div>

              <v-row dense>
                <v-col
                  cols="12" sm="6" md="4"
                  v-for="field in employeeFields(employee)"
                  :key="field.label"
                >
                  <div class="field-label">{{ field.label }}</div>
                  <div class="field-value">{{ field.value || '-' }}</div>
                </v-col>
              </v-row>

              <div v-if="!employee || !employee._id" class="text-grey">Employee details not available.</div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Section 3: Attendance History -->
    <v-card class="mt-6 rounded-2xl elevation-1">
      <v-card-title class="py-3 d-flex align-center">
        <v-icon color="green" class="mr-2">mdi-history</v-icon>
        <span class="font-weight-bold">Attendance History</span>
        <v-spacer />
        <v-select
          v-model="pageSize"
          :items="[10, 20, 50]"
          label="Rows"
          hide-details
          density="compact"
          style="max-width:100px"
          variant="outlined"
          @update:model-value="onPageSizeChange"
        />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-data-table
          :headers="historyHeaders"
          :items="attendanceHistory"
          :items-length="totalHistory"
          :loading="loadingHistory"
          item-key="_id"
          density="comfortable"
          class="rounded-xl"
          hide-default-footer
        >
          <template #loading>
            <div class="py-10 text-center text-medium-emphasis">Loading history…</div>
          </template>

          <template #item.date="{ item }">
            {{ formatDate(item.date) }}
          </template>

          <template #item.status="{ item }">
            <v-chip :color="statusColor(item.status)" size="small" variant="flat">
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.evaluate="{ item }">
            <v-chip :color="evaluateColor(item.evaluate)" size="small" variant="tonal">
              {{ item.evaluate || 'None' }}
            </v-chip>
          </template>

          <template #item.riskStatus="{ item }">
            <v-chip :color="riskColor(item.riskStatus)" size="small" variant="tonal">
              {{ item.riskStatus || '-' }}
            </v-chip>
          </template>
        </v-data-table>

        <div v-if="!attendanceHistory.length && !loadingHistory" class="text-medium-emphasis text-center py-6">
          No attendance history found.
        </div>

        <div class="d-flex justify-end mt-4">
          <v-pagination
            v-if="totalPages > 1"
            v-model="currentPage"
            :length="totalPages"
            density="comfortable"
            total-visible="7"
            @update:model-value="fetchAttendanceHistory"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Snackbars -->
    <v-snackbar v-model="snack.show" :color="snack.color" timeout="2500" location="bottom right">
      {{ snack.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/utils/axios';
import dayjs from 'dayjs';

// Router + state
const route = useRoute();
const router = useRouter();

const attendance = ref({});
const employee = ref({});
const attendanceHistory = ref([]);
const evaluations = ref([]);

const evaluationStep = ref('');
const evaluationReason = ref('');
const formRef = ref(null);
const formValid = ref(false);
const submitLoading = ref(false);

const pageSize = ref(20);
const totalPages = ref(1);
const totalHistory = ref(0);
const currentPage = ref(1);

// Loading flags
const loadingEmployee = ref(true);
const loadingHistory = ref(true);

// Snackbars
const snack = ref({ show: false, color: 'success', message: '' });
const showSnack = (message, color = 'success') => {
  snack.value = { show: true, color, message };
};

// Utils
function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-';
}

const fullName = computed(() =>
  `${employee.value.englishFirstName || ''} ${employee.value.englishLastName || ''}`.trim()
);

const initials = computed(() => {
  const n = fullName.value || '';
  const parts = n.split(' ').filter(Boolean);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';
});

const evaluatorName = 'System Admin'; // TODO: replace with logged-in user if available

// Employee field display logic (kept)
const employeeFields = emp => [
  { label: 'Employee ID', value: emp.employeeId },
  { label: 'Khmer Name', value: `${emp.khmerFirstName || ''} ${emp.khmerLastName || ''}`.trim() },
  { label: 'English Name', value: `${emp.englishFirstName || ''} ${emp.englishLastName || ''}`.trim() },
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

// History headers
const historyHeaders = [
  { title: 'Date', value: 'date', sortable: false },
  { title: 'Status', value: 'status', sortable: false },
  { title: 'Evaluate', value: 'evaluate', sortable: false },
  { title: 'Risk', value: 'riskStatus', sortable: false },
];

// Colors
const statusColor = (s) => ({
  OnTime: 'green',
  Late: 'orange',
  Overtime: 'purple',
  Absent: 'red',
  Leave: 'blue'
}[s] || 'grey');

const evaluateColor = (e) => ({
  Evaluate1: 'green-darken-1',
  Evaluate2: 'blue-darken-2',
  Evaluate3: 'purple-darken-3'
}[e] || 'grey');

const riskColor = (r) => ({
  NearlyAbandon: 'yellow-darken-2',
  Abandon: 'deep-orange-accent-4',
  Risk: 'pink-accent-4',
  Evaluated1: 'green-darken-1',
  Evaluated2: 'blue-darken-2'
}[r] || 'grey');

// Timeline mapping from evaluations
const timelineItems = computed(() => {
  if (!evaluations.value?.length) return [];
  const colorMap = { Evaluate1: 'green', Evaluate2: 'blue', Evaluate3: 'purple' };
  const iconMap = { Evaluate1: 'mdi-check-circle', Evaluate2: 'mdi-seal-variant', Evaluate3: 'mdi-trophy' };
  return evaluations.value.map((ev, idx) => ({
    key: ev._id || idx,
    color: colorMap[ev.step] || 'grey',
    icon: iconMap[ev.step] || 'mdi-star',
    title: `${ev.step} • ${employee.value.employeeId || ''}`,
    step: ev.step,
    reason: ev.reason || '-',
    date: formatDate(ev.date),
  }));
});

const lastEval = computed(() => evaluations.value?.[evaluations.value.length - 1]?.step || null);
const lastRisk = computed(() => attendanceHistory.value?.[0]?.riskStatus || null);

// Load all data
async function loadData() {
  try {
    // 1) Attendance by ID
    const attendanceRes = await api.get(`/attendance/attendances/${route.params.id}`);
    attendance.value = attendanceRes.data;

    const empId = attendance.value.employeeId;
    if (!empId || empId === 'undefined') {
      throw new Error('Employee ID missing in attendance record!');
    }

    // 2) Employee
    loadingEmployee.value = true;
    const empRes = await api.get(`/employees/by-employee-id/${empId}`);
    employee.value = empRes.data;
    loadingEmployee.value = false;

    // 3) Evaluations
    const evalRes = await api.get(`/evaluations/${empId}`);
    evaluations.value = evalRes.data || [];

    // 4) History
    await fetchAttendanceHistory();
  } catch (error) {
    console.error('❌ Fetch error:', error);
    showSnack('Error fetching data', 'error');
  }
}

// Submit eval
async function onSubmit() {
  // v-form guard
  const ok = await formRef.value?.validate();
  if (!ok) return;

  await submitEvaluation();
}

async function submitEvaluation() {
  if (!evaluationStep.value || !evaluationReason.value) {
    showSnack('Please fill evaluation step and reason', 'warning');
    return;
  }

  try {
    submitLoading.value = true;
    const empId = attendance.value.employeeId;
    const payload = {
      employeeId: empId,
      step: evaluationStep.value,
      reason: evaluationReason.value,
      date: new Date(),
      evaluator: evaluatorName,
    };
    await api.post(`/evaluations`, payload);
    showSnack('Evaluation submitted successfully!', 'success');

    // Reset + refresh
    evaluationStep.value = '';
    evaluationReason.value = '';
    await loadData();
  } catch (error) {
    console.error('❌ Submit error:', error);
    showSnack('Failed to submit evaluation', 'error');
  } finally {
    submitLoading.value = false;
  }
}

// History pagination
const fetchAttendanceHistory = async () => {
  const empId = attendance.value.employeeId;
  if (!empId) return;

  try {
    loadingHistory.value = true;
    const res = await api.get(`/attendance/history/${empId}`, {
      params: { page: currentPage.value, limit: pageSize.value }
    });
    attendanceHistory.value = res.data.records || [];
    totalPages.value = res.data.totalPages || 1;
    totalHistory.value = res.data.total || 0;
  } catch (err) {
    console.error('❌ History fetch error:', err.message);
  } finally {
    loadingHistory.value = false;
  }
};

const onPageSizeChange = () => {
  currentPage.value = 1;
  fetchAttendanceHistory();
};

// Mount
onMounted(loadData);
</script>

<style scoped>
.evaluate-page :deep(.v-card-title) {
  font-weight: 700;
}
.header-sheet {
  background: linear-gradient(90deg, rgba(241,245,249,0.9), rgba(248,250,252,0.9));
  border: 1px solid #e8eef5;
}
.elev {
  box-shadow: 0 3px 10px rgba(0,0,0,.08);
}
.bg-timeline {
  background: #fafbff;
  border: 1px dashed #e6e8f0;
}
.info-pill-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.info-pill-grid .pill {
  border: 1px solid #edf1f7;
  background: white;
  border-radius: 16px;
  padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}
.field-label {
  font-size: 11px;
  color: rgba(0,0,0,.55);
  text-transform: uppercase;
  letter-spacing: .4px;
}
.field-value {
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .info-pill-grid { grid-template-columns: 1fr; }
}
</style>
