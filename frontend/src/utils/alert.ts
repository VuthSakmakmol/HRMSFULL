import Swal from 'sweetalert2'

export const $swal = Swal.mixin({
  target: document.body,
  heightAuto: false,
  returnFocus: false,
  allowEnterKey: true,
  buttonsStyling: false,
  customClass: {
    confirmButton: 'v-btn v-btn--elevated bg-primary text-white',
    cancelButton: 'v-btn',
  },
})
