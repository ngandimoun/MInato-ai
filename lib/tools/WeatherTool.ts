// FILE: lib/tools/WeatherTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedSingleWeather, CachedWeather } from "@/lib/types/index";

interface WeatherInput extends ToolInput {
  location: string;
  units?: "metric" | "imperial";
}
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
  cod: number | string;
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
  };
  cacheTTLSeconds = 60 * 15;

  private readonly API_KEY: string;
  private readonly API_BASE = "https://api.openweathermap.org/data/2.5/weather";
  private readonly USER_AGENT = "MinatoAICompanion/1.0";

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.openweathermap || "";
    if (!this.API_KEY) {
      this.log(
        "error",
        "OpenWeatherMap API Key (OPENWEATHERMAP_API_KEY) is missing. Tool will fail."
      );
    }
  }
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
    const index = Math.round(normalizedDegrees / 22.5) % 16;
    return dirs[index];
  }

  async execute(
    input: WeatherInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const displayUnits =
      input.units ||
      (input.context?.countryCode === "US" ? "imperial" : "metric") ||
      "metric";
    const { location } = input;
    const logPrefix = `[WeatherTool] Loc:"${location.substring(
      0,
      30
    )}..." Units:${displayUnits}`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Weather check cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.API_KEY) {
      return {
        error: "Weather Tool is not configured.",
        result: "Sorry, I cannot check the weather right now.",
        structuredData: undefined,
      };
    }
    if (!location?.trim()) {
      return {
        error: "Missing location.",
        result: "Where should I check the weather for?",
        structuredData: undefined,
      };
    }

    const params = new URLSearchParams({
      q: location.trim(),
      appid: this.API_KEY,
      units: "metric",
      lang: input.lang?.split("-")[0] || "en",
    });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(
      "info",
      `${logPrefix} Fetching weather (requesting metric)... URL: ${url.replace(
        this.API_KEY,
        "***"
      )}`
    );
    let finalStructuredData: CachedSingleWeather = {
      result_type: "weather",
      source_api: "openweathermap",
      query: input,
      weather: null,
      error: undefined,
    };

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(6000),
      });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Weather API call.`);
        finalStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Weather check cancelled.",
          result: "Cancelled.",
          structuredData: finalStructuredData,
        };
      }
      const data: OWMResponse = (await response.json()) as OWMResponse;

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
      const iconCode = data.weather[0]?.icon;
      const observationTime = new Date(data.dt * 1000).toISOString();
      let resultString = `Current weather in ${locationName}: ${description}. `;
      if (displayUnits === "imperial") {
        resultString += `Temperature: ${Math.round(
          tempF
        )}°F (feels like ${Math.round(feelsLikeF)}°F). `;
        resultString += `Wind: ${windDir} at ${windSpeedMph} mph. Humidity: ${humidity}%.`;
      } else {
        resultString += `Temperature: ${tempC.toFixed(
          1
        )}°C (feels like ${feelsLikeC.toFixed(1)}°C). `;
        resultString += `Wind: ${windDir} at ${windSpeedKph} km/h. Humidity: ${humidity}%.`;
      }
      this.log(
        "info",
        `${logPrefix} Weather fetched: ${description}, ${tempC}°C`
      );

      const structuredDataForUI: CachedWeather = {
        locationName,
        description,
        temperatureCelsius: tempC,
        temperatureFahrenheit: tempF,
        feelsLikeCelsius: feelsLikeC,
        feelsLikeFahrenheit: feelsLikeF,
        humidityPercent: humidity,
        windSpeedKph,
        windDirection: windDir,
        iconCode: iconCode || null,
        timestamp: observationTime,
      };
      finalStructuredData.weather = structuredDataForUI;
      finalStructuredData.error = undefined;
      return { result: resultString, structuredData: finalStructuredData };
    } catch (error: any) {
      const errorMsg = `Weather fetch failed: ${error.message}`;
      finalStructuredData.error = errorMsg;
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        finalStructuredData.error = "Request timed out.";
        return {
          error: "Weather request timed out or cancelled.",
          result: "Sorry, checking the weather took too long.",
          structuredData: finalStructuredData,
        };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return {
        error: errorMsg,
        result: "Sorry, I encountered an error checking the weather.",
        structuredData: finalStructuredData,
      };
    }
  }
}
