//livingdossier/services/tools-livings/WeatherTool.ts
// Correction: Ajout de `result_type` discriminant dans `finalStructuredData`.
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

// Define local types since imports are failing
interface CachedWeather {
  location: string;
  description: string;
  temperatureCelsius: number;
  temperatureFahrenheit: number;
  feelsLikeCelsius: number;
  feelsLikeFahrenheit: number;
  humidityPercent: number;
  windSpeedKph: number;
  windDirection: string;
  iconCode?: string;
  timestamp: number;
  countryCode?: string;
}

interface CachedSingleWeather {
  result_type: "weather";
  source_api: string;
  query: any;
  weather: CachedWeather | null;
  error?: string;
}

interface WeatherInput extends ToolInput {
  location: string; // City name, zip code, etc.
  units?: "metric" | "imperial"; // Optional units preference from user/LLM
}

// Structure matching OpenWeatherMap current weather response (internal)
interface OWMWeather {
  id: number;
  main: string;
  description: string;
  icon: string;
}
interface OWMMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
}
interface OWMWind {
  speed: number;
  deg: number;
  gust?: number;
}
interface OWMSys {
  type?: number;
  id?: number;
  country?: string;
  sunrise?: number;
  sunset?: number;
}
interface OWMCoord {
  lon: number;
  lat: number;
}
interface OWMResponse {
  coord: OWMCoord;
  weather: OWMWeather[];
  base: string;
  main: OWMMain;
  visibility?: number;
  wind: OWMWind;
  clouds?: { all: number };
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  dt: number;
  sys: OWMSys;
  timezone: number;
  id: number;
  name: string;
  cod: number | string; // Allow string for error codes like "404"
  message?: string;
}

export class WeatherTool extends BaseTool {
  name = "WeatherTool";
  description =
    "Fetches the current weather conditions (temperature, description, humidity, wind) for a specified location (city or zip code).";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description: "The city name (e.g., 'London, UK', 'Paris') or zip code.",
      },
      units: {
        type: "string",
        enum: ["metric", "imperial"],
        description:
          "Optional. Units preference ('metric' for Celsius, 'imperial' for Fahrenheit). Defaults to metric based on user context or system default.",
      },
    },
    required: ["location"],
    additionalProperties: false as const,
  };
  cacheTTLSeconds = 60 * 15; // Cache weather for 15 minutes

  private readonly API_KEY: string;
  private readonly API_BASE = "https://api.openweathermap.org/data/2.5/weather";
  private readonly USER_AGENT = "MinatoAICompanion/1.0"; // Identify your agent

  constructor() {
    super();
    this.API_KEY = appConfig.apiKey.openweathermap || "";
    if (!this.API_KEY) {
      this.log(
        "error",
        "OpenWeatherMap API Key (OPENWEATHERMAP_API_KEY) is missing. Tool will fail."
      );
    }
  }

  // --- Unit Conversion and Formatting Helpers ---
  private celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }
  private mpsToKph(mps: number): number {
    return mps * 3.6;
  }
  private mpsToMph(mps: number): number {
    return mps * 2.23694;
  }
  private getWindDirection(degrees: number): string {
    // Ensure degrees is within 0-360
    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    const dirs = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    // Index calculation: divide by segment size (22.5), round, take modulo 16
    const index = Math.round(normalizedDegrees / 22.5) % 16;
    return dirs[index];
  }

  async execute(
    input: WeatherInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    // Added abortSignal
    // Determine preferred display units: use input, then context, then default metric
    const displayUnits =
      input.units ||
      (input.context?.countryCode === "US" ? "imperial" : "metric") || // Infer from context country if needed
      "metric";
    const { location } = input;
    const logPrefix = `[WeatherTool] Loc:"${location.substring(
      0,
      30
    )}..." Units:${displayUnits}`;

    // Check abort signal early
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return { error: "Weather check cancelled.", result: "Cancelled." };
    }

    if (!this.API_KEY) {
      return {
        error: "Weather Tool is not configured.",
        result: "Sorry, I cannot check the weather right now.",
      };
    }
    if (!location?.trim()) {
      return {
        error: "Missing location.",
        result: "Where should I check the weather for?",
      };
    }

    // Always fetch in metric from API for consistent internal calculations
    const params = new URLSearchParams({
      q: location.trim(),
      appid: this.API_KEY,
      units: "metric", // Fetch in Celsius/mps
      lang: input.lang?.split("-")[0] || "en", // Use language hint for description if available
    });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(
      "info",
      `${logPrefix} Fetching weather (requesting metric)... URL: ${url.replace(
        this.API_KEY,
        "***"
      )}`
    );

    // Initialize structured data
    let structuredDataForUI: CachedWeather | null = null;
    let finalStructuredData: CachedSingleWeather = {
      result_type: "weather", // Add discriminant
      source_api: "openweathermap",
      query: input,
      weather: null,
      error: undefined, // Initialize error
    };

    try {
      // Create a timeout controller for node-fetch compatibility
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 6000);
      
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: (abortSignal || timeoutController.signal) as any, // Use provided signal or default timeout
      });
      
      clearTimeout(timeoutId);

      // Check abort signal *after* the call
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Weather API call.`);
        return { error: "Weather check cancelled.", result: "Cancelled." };
      }

      const data: OWMResponse = (await response.json()) as OWMResponse;

      // Handle API errors (check both status and 'cod' field)
      if (!response.ok || String(data.cod) !== "200") {
        let errorDetail = `OpenWeatherMap API Error (${response.status}, Code: ${data.cod}).`;
        let userMessage = `Sorry, I couldn't find weather data for "${location}".`;
        if (String(data.cod) === "404") {
          errorDetail += ` Location not found: ${data.message || ""}`;
          userMessage = `Sorry, I couldn't find the location "${location}". Please check the name or zip code.`;
        } else if (String(data.cod) === "401") {
          errorDetail += ` Invalid API key: ${data.message || ""}`;
          userMessage = `Sorry, there's an issue with the weather service configuration.`;
        } else {
          errorDetail += ` Message: ${data.message || "Unknown API error"}`;
        }
        this.log("error", `${logPrefix} ${errorDetail}`);
        finalStructuredData.error = errorDetail;
        return {
          error: errorDetail,
          result: userMessage,
          structuredData: finalStructuredData,
        };
      }

      // Validate core data presence after confirming cod: 200
      if (!data.main || !data.weather?.[0]) {
        this.log(
          "warn",
          `${logPrefix} Invalid data structure received from OpenWeatherMap despite Code 200:`,
          data
        );
        throw new Error(
          `Weather API returned success code but missing core data (main/weather).`
        );
      }

      // --- Process Valid Data ---
      const tempC = data.main.temp;
      const feelsLikeC = data.main.feels_like;
      const tempF = this.celsiusToFahrenheit(tempC);
      const feelsLikeF = this.celsiusToFahrenheit(feelsLikeC);
      const description = data.weather[0].description;
      const humidity = data.main.humidity;
      const windSpeedMps = data.wind.speed;
      const windSpeedKph = parseFloat(this.mpsToKph(windSpeedMps).toFixed(1));
      const windSpeedMph = parseFloat(this.mpsToMph(windSpeedMps).toFixed(1));
      const windDir = this.getWindDirection(data.wind.deg);
      const locationName = `${data.name}${
        data.sys?.country ? ", " + data.sys.country : ""
      }`;
      const iconCode = data.weather[0]?.icon; // e.g., "01d", "10n"
      const observationTime = new Date(data.dt * 1000).toISOString(); // Convert Unix timestamp to ISO

      // Format result string for LLM based on determined displayUnits
      let resultString = `Current weather in ${locationName}: ${description}. `;
      if (displayUnits === "imperial") {
        resultString += `Temperature: ${Math.round(
          tempF
        )}°F (feels like ${Math.round(feelsLikeF)}°F). `;
        resultString += `Wind: ${windDir} at ${windSpeedMph} mph. Humidity: ${humidity}%.`;
      } else {
        // Default to metric
        resultString += `Temperature: ${tempC.toFixed(
          1
        )}°C (feels like ${feelsLikeC.toFixed(1)}°C). `;
        resultString += `Wind: ${windDir} at ${windSpeedKph} km/h. Humidity: ${humidity}%.`;
      }
      this.log(
        "info",
        `${logPrefix} Weather fetched: ${description}, ${tempC}°C`
      );

      // Prepare structured data for UI (always include both C and F)
      structuredDataForUI = {
        location: locationName,
        description: description,
        temperatureCelsius: tempC,
        temperatureFahrenheit: tempF,
        feelsLikeCelsius: feelsLikeC,
        feelsLikeFahrenheit: feelsLikeF,
        humidityPercent: humidity,
        windSpeedKph: windSpeedKph, // Store consistent internal unit
        windDirection: windDir,
                  iconCode: iconCode || undefined, // Use undefined instead of null
        timestamp: typeof observationTime === 'string' ? Date.parse(observationTime) / 1000 : observationTime,
      };

      // Update the final ToolOutput structure
      finalStructuredData.weather = structuredDataForUI;
      finalStructuredData.error = undefined; // Clear error

      return {
        result: resultString,
        structuredData: finalStructuredData,
      };
    } catch (error: any) {
      const errorMsg = `Weather fetch failed: ${error.message}`;
      // Handle AbortError specifically
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        finalStructuredData.error = "Request timed out.";
        return {
          error: "Weather request timed out or cancelled.",
          result: "Sorry, checking the weather took too long.",
          structuredData: finalStructuredData, // Return structure with error
        };
      }
      // Handle other errors
      this.log("error", `${logPrefix} Failed:`, error.message);
      finalStructuredData.error = errorMsg; // Include error in structure
      return {
        error: errorMsg,
        result: "Sorry, I encountered an error checking the weather.",
        structuredData: finalStructuredData,
      };
    }
  }
}