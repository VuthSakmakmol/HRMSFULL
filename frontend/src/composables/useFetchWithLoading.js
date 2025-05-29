import { ref } from 'vue'
import Swal from 'sweetalert2'

export function useFetchWithLoading() {
  const isLoading = ref(false)
  const error = ref(null)

  const fetchData = async (callbackFn, successMessage = '', errorMessage = 'Fetch failed') => {
    isLoading.value = true
    error.value = null

    try {
      await callbackFn()
      if (successMessage) {
        Swal.fire({
          icon: 'success',
          title: successMessage,
          timer: 1200,
          showConfirmButton: false,
        })
      }
    } catch (err) {
      error.value = err
      Swal.fire({
        icon: 'error',
        title: errorMessage,
        text: err?.response?.data?.message || err.message || 'Something went wrong',
      })
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    fetchData,
  }
}
