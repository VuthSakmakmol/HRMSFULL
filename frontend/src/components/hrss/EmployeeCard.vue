<template>
  <!-- 1011 x 638 ≈ CR80 at ~300DPI for sharp export -->
  <div class="card-wrap" ref="cardEl">
    <!-- Header -->
    <div class="header">
      <img v-if="logoSrc" class="logo" :src="logoSrc" alt="logo" />
      <div class="title">
        <div class="brand">{{ companyName }}</div>
        <div class="sub">TRAX APPAREL (CAMBODIA) CO., LTD</div>
      </div>
      <div class="qr" v-if="qrSrc">
        <img :src="qrSrc" alt="qr" />
      </div>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="profile">
        <img :src="photoSrc" class="pf" alt="profile" />
      </div>

      <div class="info">
        <div class="row">
          <span class="label">ID</span>
          <span class="val mono">{{ employee.employeeId || '-' }}</span>
        </div>

        <div class="row">
          <span class="label kh">ឈ្មោះខ្មែរ</span>
          <span class="val kh">
            {{ (employee.khmerFirstName || '') + ' ' + (employee.khmerLastName || '') }}
          </span>
        </div>

        <div class="row">
          <span class="label">Name</span>
          <span class="val">
            {{ (employee.englishFirstName || '') + ' ' + (employee.englishLastName || '') }}
          </span>
        </div>

        <div class="row">
          <span class="label">Position</span>
          <span class="val">{{ employee.position || '-' }}</span>
        </div>

        <div class="row">
          <span class="label">Dept.</span>
          <span class="val">{{ employee.department || '-' }}</span>
        </div>

        <div class="row">
          <span class="label">Start Date</span>
          <span class="val mono">{{ joinDate }}</span>
        </div>
      </div>
    </div>

    <!-- Footer (optional hotline) -->
    <div class="footer" v-if="footerText">
      {{ footerText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  employee: { type: Object, required: true },

  // Header branding
  companyName: { type: String, default: 'Trax Apparel Cambodia' },
  logoSrc: { type: String, default: '/logos/trax_logo.png' }, // update to your asset path
  qrSrc: { type: String, default: '' },                       // optional QR image

  // Footer
  footerText: { type: String, default: '' },

  // Image path helpers
  backendBase: { type: String, default: '' },                 // prefix for /upload paths
  defaultImage: { type: String, default: '/default_images/girl_default_pf.jpg' }
})

const cardEl = ref(null)

const joinDate = computed(() =>
  props.employee?.joinDate ? dayjs(props.employee.joinDate).format('DD/MM/YYYY') : '-'
)

const photoSrc = computed(() => {
  const url = props.employee?.profileImage || ''
  if (!url) return props.defaultImage
  if (url.startsWith('/upload')) return `${props.backendBase}${url}`
  if (url.startsWith('http')) return url
  return props.defaultImage
})

// expose the DOM element so parent can capture with html2canvas
defineExpose({ cardEl })
</script>

<style scoped>
/* Core card canvas */
.card-wrap {
  width: 1011px;   /* ≈85.6mm at 300dpi */
  height: 638px;   /* ≈54.0mm at 300dpi */
  border: 10px solid #0c2a66;
  border-radius: 28px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, "Khmer OS Battambang", "Noto Sans Khmer",
               sans-serif;
}

/* Header */
.header {
  display: grid;
  grid-template-columns: 220px 1fr 160px;
  align-items: center;
  gap: 24px;
  background: #0c2a66;
  color: #fff;
  padding: 18px 24px;
}
.logo { height: 72px; object-fit: contain; }
.title .brand { font-size: 40px; font-weight: 800; letter-spacing: .5px; }
.title .sub { font-size: 20px; opacity: .9; margin-top: 2px; }
.qr img {
  width: 140px; height: 140px; object-fit: contain;
  background: #fff; border-radius: 10px;
}

/* Body */
.body {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 28px;
  padding: 26px 28px;
  flex: 1;
}
.profile { display: flex; align-items: flex-start; justify-content: center; }
.pf {
  width: 300px; height: 360px; object-fit: cover;
  border: 6px solid #0c2a66; border-radius: 12px; background: #eee;
}

.info { padding-right: 8px; display: grid; gap: 14px; }
.row { display: grid; grid-template-columns: 180px 1fr; align-items: center; }
.label { font-weight: 700; color: #0c2a66; font-size: 28px; }
.val { font-size: 30px; font-weight: 600; }
.kh { font-family: "Khmer OS Battambang", "Noto Sans Khmer", sans-serif; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

/* Footer */
.footer {
  background: #0c2a66; color: #fff; text-align: center;
  padding: 10px 16px; font-size: 20px;
}

/* Printing (if you print directly from the page) */
@media print {
  .card-wrap { transform: scale(.32); transform-origin: top left; }
}
</style>
