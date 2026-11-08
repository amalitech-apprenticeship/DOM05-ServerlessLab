import { ApiError } from '../api/contract'

export const GENERIC_ERROR = 'Something went wrong. Please try again.'

// The only error text the UI may show. ApiError messages are written for users by the adapters;
// any other error (a library or runtime error) can carry internal details such as AWS resource
// ids, so it is replaced with a generic message.
export const userMessage = (error, fallback = GENERIC_ERROR) =>
  error instanceof ApiError && error.message ? error.message : fallback
