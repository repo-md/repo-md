export interface ApiResult {
  success: boolean
  data?: any
  error?: string
  operation: string
  executionTime?: number // Time in milliseconds
}