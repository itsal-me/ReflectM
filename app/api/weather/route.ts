import { NextRequest, NextResponse } from 'next/server'
import { getWeatherData } from '@/lib/context/weather'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lon = parseFloat(searchParams.get('lon') || '0')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const weather = await getWeatherData(lat, lon)

  if (!weather) {
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 }
    )
  }

  return NextResponse.json({ weather })
}
