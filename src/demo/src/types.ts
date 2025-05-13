export interface ApiResult {
  success: boolean
  data?: any
  error?: string
  operation: string
  executionTime?: number // Time in milliseconds
  params?: Record<string, string> // The parameters used in the operation
}