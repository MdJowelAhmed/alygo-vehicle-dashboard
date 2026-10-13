import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { RESET_PASSWORD_TOKEN_KEY } from '@/constants/auth-storage'
import type { RootState } from '@/redux/store'
import { logout } from '@/redux/slice/authSlice'
import { message } from 'antd'

const rawQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api/v1',
  prepareHeaders: (headers, { getState, endpoint }) => {
    const authToken = (getState() as RootState).auth?.token
    const resetToken =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(RESET_PASSWORD_TOKEN_KEY)
        : null
    if (endpoint === 'resetPassword' && resetToken) {
      headers.set('resettoken', resetToken)
    } else if (authToken) {
      headers.set('authorization', `Bearer ${authToken}`)
    }
    return headers
  },
})

/**
 * @deprecated Prefer importing `baseApi` from `@/redux/baseApi`
 * Wraps rawQuery with the same global 401/403 → logout + redirect logic.
 */
/** Auth endpoints that legitimately return 401 (wrong credentials, expired OTP, etc.) */
const AUTH_ENDPOINTS = new Set(['login', 'forgotPassword', 'verifyOtp', 'resetPassword', 'resendOtp'])

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawQuery(args, api, extraOptions)

  if (result.error) {
    const status = result.error.status
    const endpoint = (api as { endpoint?: string }).endpoint ?? ''
    const isAuthEndpoint = AUTH_ENDPOINTS.has(endpoint)

    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      api.dispatch(logout())
      message.error(
        status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Access denied. You do not have permission to perform this action.',
        4,
      )
      setTimeout(() => {
        window.location.href = '/login'
      }, 300)
    } else if (typeof status === 'number' && status >= 500) {
      message.error('A server error occurred. Please try again later.', 4)
    } else if (status === 'FETCH_ERROR') {
      message.error('Network error. Please check your internet connection.', 4)
    } else if (status === 'TIMEOUT_ERROR') {
      message.error('The request timed out. Please try again.', 4)
    }
  }

  return result
}

