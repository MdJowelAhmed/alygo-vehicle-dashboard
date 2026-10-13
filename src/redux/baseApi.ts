import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { RESET_PASSWORD_TOKEN_KEY } from '@/constants/auth-storage'
import { logout } from '@/redux/slice/authSlice'
import { message } from 'antd'

type AuthStateSlice = { auth: { token: string | null } }

/** Raw fetchBaseQuery — no auth error handling yet */
const rawBaseQuery = fetchBaseQuery({
  // VITE_API_BASE_URL already includes /api/v1 (e.g. http://host:5005/api/v1)
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api/v1',
  prepareHeaders: (headers, { getState, endpoint }) => {
    const authToken = (getState() as AuthStateSlice).auth.token
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
 * Wrapper around rawBaseQuery that:
 *  - On 401 (Unauthorized / Token expired) → logs out user and redirects to /login
 *  - On 403 (Forbidden)                    → logs out user and redirects to /login
 *  - On 5xx server errors                  → shows a global error notification
 *  - On network failure                    → shows a global error notification
 */
/** Auth endpoints that legitimately return 401 (wrong credentials, expired OTP, etc.) */
const AUTH_ENDPOINTS = new Set(['login', 'forgotPassword', 'verifyOtp', 'resetPassword', 'resendOtp'])

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    const status = result.error.status
    // Don't redirect on auth endpoints — they legitimately return 401 on bad credentials
    const endpoint = (api as { endpoint?: string }).endpoint ?? ''
    const isAuthEndpoint = AUTH_ENDPOINTS.has(endpoint)

    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      // Token expired or forbidden → force logout
      api.dispatch(logout())

      message.error(
        status === 401
          ? 'Your session has expired. Please log in again.'
          : 'Access denied. You do not have permission to perform this action.',
        4,
      )

      // Small delay so the message is visible before navigating
      setTimeout(() => {
        window.location.href = '/login'
      }, 300)
    } else if (typeof status === 'number' && status >= 500) {
      // Server errors — show a global notification
      message.error('A server error occurred. Please try again later.', 4)
    } else if (status === 'FETCH_ERROR') {
      // Network failure
      message.error('Network error. Please check your internet connection.', 4)
    } else if (status === 'TIMEOUT_ERROR') {
      message.error('The request timed out. Please try again.', 4)
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'Profile',
    'User',
    'Overview',
    'Analytics',
    'LiveTrip',
    'CancellationReason',
    'CancellationPolicy',
    'CancellationAnalytics',
    'LostAndFoundOverview',
    'LostAndFoundReports',
    'LostAndFoundReturns',
    'LostAndFoundDeliveryFees',
    'LostAndFoundDriverCompensation',
    'LostAndFoundAnalytics',
    'LostAndFoundCategories',
    'TripCompletionComplaintStats',
    'TripCompletionComplaints',
    'ServiceAreas',
    'Drivers',
    'Passengers',
    'Tiers',
    'Trips',
    'Compliance',
    'Finance',
    'DriverRewards',
    'Reservations',
    'Locations',
    'Pricing',
    'DrivingHours',
    'RideCategories',
    'Banners',
    'Events',
    'Holidays',
    'PeakHours',
    'HelpAndSupports',
    'Broadcasts',
    'Notifications',
    'Communication',
    'Settings',
    'Permissions',
    'Roles',
    'Controllers',
    'Cms',
    'SystemConfiguration',
    'FareConfigurations',
    'PlatformSettings',
  ],
  endpoints: () => ({}),
})
