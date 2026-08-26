import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Retorna una respuesta exitosa estandarizada
 */
export function successResponse<T>(data: T, message?: string, status: number = 200) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {})
  }
  return NextResponse.json(body, { status })
}

/**
 * Retorna una respuesta de error sanitizada, evitando fugas de stack trace
 */
export function errorResponse(
  message: string,
  statusCode: number = 400,
  code: string = 'BAD_REQUEST',
  details?: any
) {
  // Registrar log estructurado en el servidor
  console.error(`[API_ERROR] [${code}] Status ${statusCode}: ${message}`, details || '')

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      // Solo exponer detalles seguros si no contienen información interna
      details: process.env.NODE_ENV === 'development' ? details : undefined
    }
  }

  return NextResponse.json(body, { status: statusCode })
}
