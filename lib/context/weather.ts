export async function getWeatherData(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Using Open-Meteo API (free, no API key required)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const temp = Math.round(data.current.temperature_2m)
    const weatherCode = data.current.weather_code
    
    // Map WMO weather codes to simple descriptions
    const weatherDescription = getWeatherDescription(weatherCode)

    return `${weatherDescription}, ${temp}°C`
  } catch (error) {
    console.error('Weather API error:', error)
    return null
  }
}

function getWeatherDescription(code: number): string {
  // WMO Weather interpretation codes
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain Showers'
  if (code <= 86) return 'Snow Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Cloudy'
}

export function getTimeOfDay(): string {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'Morning'
  } else if (hour >= 12 && hour < 17) {
    return 'Afternoon'
  } else if (hour >= 17 && hour < 21) {
    return 'Evening'
  } else {
    return 'Night'
  }
}

export function getClientLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null)
    )
  })
}
