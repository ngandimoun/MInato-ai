import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { SportsStructuredOutput, SportsTeamData, SportsEventData } from "@/lib/types/index";

interface SportsInput extends ToolInput {
  teamName: string;
  queryType: "next_game" | "last_game" | "team_info";
}
// Internal API types (as previously defined)
interface SportsDbTeam { idTeam: string; strTeam: string; strTeamShort?: string | null; strAlternate?: string | null; intFormedYear?: string | null; strSport: string; strLeague: string; idLeague?: string; strStadium?: string | null; strStadiumThumb?: string | null; strStadiumLocation?: string | null; intStadiumCapacity?: string | null; strWebsite?: string | null; strFacebook?: string | null; strTwitter?: string | null; strInstagram?: string | null; strDescriptionEN?: string | null; strGender?: string; strCountry?: string; strTeamBadge?: string; strTeamJersey?: string | null; strTeamLogo?: string | null; strTeamFanart1?: string | null; strTeamFanart2?: string | null; strTeamFanart3?: string | null; strTeamFanart4?: string | null; strTeamBanner?: string | null; }
interface SportsDbEvent { idEvent: string; strEvent: string; strEventAlternate?: string; strFilename?: string; strSport: string; idLeague: string; strLeague: string; strSeason: string; strDescriptionEN?: string | null; strHomeTeam: string; strAwayTeam: string; idHomeTeam: string; idAwayTeam: string; intHomeScore: string | null; intAwayScore: string | null; intRound?: string; intSpectators?: string | null; strHomeGoalDetails?: string | null; strAwayGoalDetails?: string | null; strHomeLineupGoalkeeper?: string | null; strAwayLineupGoalkeeper?: string | null; intHomeShots?: string | null; intAwayShots?: string | null; dateEvent: string; dateEventLocal?: string | null; strTime: string; strTimeLocal?: string | null; strTVStation?: string | null; idVenue?: string; strVenue?: string; strCountry?: string; strCity?: string | null; strPoster?: string | null; strSquare?: string | null; strFanart?: string | null; strThumb?: string | null; strBanner?: string | null; strMap?: string | null; strTweet1?: string | null; strTweet2?: string | null; strTweet3?: string | null; strVideo?: string | null; strStatus?: string; strPostponed?: "yes" | "no"; strLocked?: "unlocked" | "locked"; strTimestamp?: string; }
interface TheSportsDbResponse<T> { teams?: T[] | null; events?: T[] | null; results?: T[] | null; }


export class SportsInfoTool extends BaseTool {
  name = "SportsInfoTool";
  description =
    "Provides information about sports teams using TheSportsDB API. Can fetch basic team info, the next scheduled game, or the result of the last completed game.";
  argsSchema = {
    type: "object" as const,
    properties: {
      teamName: { type: "string" as const, description: "The name of the sports team (e.g., 'Manchester United', 'Los Angeles Lakers')." },
      queryType: { type: "string" as const, enum: ["next_game", "last_game", "team_info"], description: "The type of information to retrieve: 'next_game', 'last_game', or 'team_info'." },
    },
    required: ["teamName", "queryType"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 1;

  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.thesportsdb.com/api/v1/json/";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.theSportsDb || "1"; // Default to test key "1" if not set
    if (!appConfig.toolApiKeys.theSportsDb || this.API_KEY === "1") {
      this.log("warn", "TheSportsDB API key missing or using test key '1'. Functionality may be limited.");
    }
     if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update SportsInfoTool USER_AGENT contact info with actual details.");
    }
  }

  private mapDbTeamToAppTeam(dbTeam: SportsDbTeam): SportsTeamData {
    return {
      id: dbTeam.idTeam, name: dbTeam.strTeam, shortName: dbTeam.strTeamShort || null, sport: dbTeam.strSport,
      league: dbTeam.strLeague, leagueId: dbTeam.idLeague || null, formedYear: dbTeam.intFormedYear || null,
      gender: dbTeam.strGender || null, country: dbTeam.strCountry || null, stadium: dbTeam.strStadium || null,
      stadiumLocation: dbTeam.strStadiumLocation || null, website: dbTeam.strWebsite || null,
      description: dbTeam.strDescriptionEN || null, badgeUrl: dbTeam.strTeamBadge || null,
      logoUrl: dbTeam.strTeamLogo || null, bannerUrl: dbTeam.strTeamBanner || null,
    };
  }
  private mapDbEventToAppEvent(dbEvent: SportsDbEvent): SportsEventData {
    const homeScoreStr = dbEvent.intHomeScore; const awayScoreStr = dbEvent.intAwayScore;
    const homeScore = homeScoreStr ? parseInt(homeScoreStr, 10) : null;
    const awayScore = awayScoreStr ? parseInt(awayScoreStr, 10) : null;
    let dateTimeUtc: string | null = null;
    if (dbEvent.strTimestamp) { try { dateTimeUtc = new Date(parseInt(dbEvent.strTimestamp) * 1000).toISOString(); } catch {} }
    else if (dbEvent.dateEvent && dbEvent.strTime) { try { dateTimeUtc = new Date(`${dbEvent.dateEvent}T${dbEvent.strTime}Z`).toISOString(); } catch (e) { this.log("warn", `Could not parse date/time for event ${dbEvent.idEvent}: ${dbEvent.dateEvent} ${dbEvent.strTime}`); }}
    else if (dbEvent.dateEvent) { try { dateTimeUtc = new Date(`${dbEvent.dateEvent}T00:00:00Z`).toISOString(); } catch (e) { this.log("warn", `Could not parse date-only event ${dbEvent.idEvent}: ${dbEvent.dateEvent}`); }}
    return {
      id: dbEvent.idEvent, name: dbEvent.strEvent, sport: dbEvent.strSport, league: dbEvent.strLeague, season: dbEvent.strSeason,
      round: dbEvent.intRound || null, homeTeamId: dbEvent.idHomeTeam, homeTeamName: dbEvent.strHomeTeam,
      awayTeamId: dbEvent.idAwayTeam, awayTeamName: dbEvent.strAwayTeam,
      homeScore: homeScore === null || isNaN(homeScore) ? null : homeScore,
      awayScore: awayScore === null || isNaN(awayScore) ? null : awayScore,
      date: dbEvent.dateEvent, time: dbEvent.strTime ? dbEvent.strTime.substring(0,8) : null, dateTimeUtc: dateTimeUtc,
      venue: dbEvent.strVenue || null, city: dbEvent.strCity || null, country: dbEvent.strCountry || null,
      status: dbEvent.strStatus || null, postponed: dbEvent.strPostponed === "yes",
      thumbnailUrl: dbEvent.strThumb || dbEvent.strSquare || null, videoUrl: dbEvent.strVideo || null,
    };
  }

  private async findTeam(teamName: string, abortSignal?: AbortSignal): Promise<SportsDbTeam | null> {
    const url = `${this.API_BASE}${this.API_KEY}/searchteams.php?t=${encodeURIComponent(teamName)}`;
    this.log("debug", `Searching TheSportsDB team: "${teamName}" URL: ${url.replace(this.API_KEY, "***")}`);
    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(5000) });
      if (abortSignal?.aborted) { this.log("warn", `Team search aborted for "${teamName}"`); return null; }
      if (!response.ok) throw new Error(`Team search API failed: ${response.status} ${response.statusText}`);
      const data = await response.json() as TheSportsDbResponse<SportsDbTeam>;
      if (!data?.teams || data.teams.length === 0) { this.log("warn", `No teams found matching "${teamName}"`); return null; }
      const team = data.teams[0];
      this.log("info", `Found Team: ${team.strTeam} (ID: ${team.idTeam})`);
      return team;
    } catch (error: any) {
      if (error.name === 'AbortError') this.log("error", `Team search timed out or aborted for "${teamName}"`);
      else this.log("error", `Error finding team "${teamName}":`, error.message);
      return null;
    }
  }

  async execute(input: SportsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { teamName, queryType } = input;
    const logPrefix = `[SportsTool Team:${teamName.substring(0,15)}..., Type:${queryType}]`;
    const queryInputForStructuredData = { ...input };

    if (abortSignal?.aborted) { return { error: "Sports info request cancelled.", result: "Cancelled." }; }
    let outputStructuredData: SportsStructuredOutput = {
      result_type: "sports_info", source_api: "thesportsdb", query: queryInputForStructuredData, error: null,
    };
    if (!teamName?.trim()) { outputStructuredData.error = "Team name required."; return { error: outputStructuredData.error, result: "Which team should Minato look up?", structuredData: outputStructuredData }; }
    if (!queryType || !["next_game", "last_game", "team_info"].includes(queryType)) {
      outputStructuredData.error = `Invalid queryType: ${queryType}. Use 'next_game', 'last_game', or 'team_info'.`;
      return { error: outputStructuredData.error, result: "What info should Minato get (next game, last game, or team info)?", structuredData: outputStructuredData };
    }
    this.log("info", `${logPrefix} Executing...`);

    const team = await this.findTeam(teamName.trim(), abortSignal);
    if (abortSignal?.aborted) return { error: "Sports info request cancelled.", result: "Cancelled." };
    if (!team) {
      outputStructuredData.error = `Could not find team "${teamName}".`;
      return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't find a team named "${teamName}". Please check the spelling.`, structuredData: outputStructuredData };
    }
    const teamId = team.idTeam;
    const teamDisplayName = team.strTeam;
    const appTeamInfo = this.mapDbTeamToAppTeam(team);
    outputStructuredData.teamInfo = appTeamInfo; outputStructuredData.error = null;

    try {
      let resultString = "";
      if (queryType === "team_info") {
        const desc = appTeamInfo.description ? ` Description: ${appTeamInfo.description.substring(0,100)}...` : "";
        resultString = `${appTeamInfo.name} plays ${appTeamInfo.sport}${appTeamInfo.league ? ` in the ${appTeamInfo.league}` : ""}. Formed: ${appTeamInfo.formedYear || "N/A"}.${desc}`;
        outputStructuredData.event = null; outputStructuredData.eventsList = null;
      } else {
        const endpoint = queryType === "next_game" ? "eventsnext.php" : "eventslast.php";
        const url = `${this.API_BASE}${this.API_KEY}/${endpoint}?id=${teamId}`;
        this.log("debug", `${logPrefix} Fetching events from ${endpoint} URL: ${url.replace(this.API_KEY, "***")}`);
        const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
        if (abortSignal?.aborted) { return { error: "Sports info request cancelled.", result: "Cancelled." }; }
        if (!response.ok) throw new Error(`Event fetch (${endpoint}) failed: ${response.status} ${response.statusText}`);
        const data = await response.json() as TheSportsDbResponse<SportsDbEvent>;
        const dbEvents = data.events || data.results || null;

        if (!dbEvents || dbEvents.length === 0) {
          resultString = `No ${queryType === "next_game" ? "upcoming scheduled games" : "recent completed game results"} found for ${teamDisplayName} for ${input.context?.userName || "User"} at the moment.`;
          outputStructuredData.event = null; outputStructuredData.eventsList = null;
        } else {
          const appEvents = dbEvents.map(this.mapDbEventToAppEvent);
          const event = appEvents[0];
          outputStructuredData.event = event; outputStructuredData.eventsList = appEvents;
          const opponent = event.homeTeamName === teamDisplayName ? event.awayTeamName : event.homeTeamName;
          const homeAway = event.homeTeamName === teamDisplayName ? "(Home)" : "(Away)";
          const venue = event.venue ? ` at ${event.venue}` : "";
          let dateTimeString = "Date TBD";
          if (event.dateTimeUtc) {
            try { dateTimeString = new Date(event.dateTimeUtc).toLocaleString(input.lang || undefined, { dateStyle: "medium", timeStyle: "short" }); }
            catch { dateTimeString = event.date; }
          } else if (event.date) { dateTimeString = event.date; }

          if (queryType === "next_game") {
            resultString = `${teamDisplayName}'s next game for ${input.context?.userName || "User"} is against ${opponent} ${homeAway} on ${dateTimeString}${venue}. Status: ${event.status || "Scheduled"}.`;
          } else { // last_game
            const scoreAvailable = event.homeScore !== null && event.awayScore !== null;
            const score = scoreAvailable ? `${event.homeScore}-${event.awayScore}` : "Score N/A";
            let outcome = "finished";
            if(scoreAvailable) {
                const homeWon = event.homeScore! > event.awayScore!; const awayWon = event.awayScore! > event.homeScore!;
                const isHomeTeam = event.homeTeamName === teamDisplayName;
                if (isHomeTeam && homeWon) outcome = "won"; else if (!isHomeTeam && awayWon) outcome = "won";
                else if (isHomeTeam && awayWon) outcome = "lost"; else if (!isHomeTeam && homeWon) outcome = "lost";
                else outcome = "drew";
            }
            resultString = `${teamDisplayName}'s last game for ${input.context?.userName || "User"} against ${opponent} ${homeAway} on ${event.date || "recent date"} ${outcome} ${score}. Status: ${event.status || "Finished"}.`;
          }
        }
      }
      this.log("info", `${logPrefix} Successfully retrieved ${queryType}.`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed sports info fetch: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError') { /* ... */ outputStructuredData.error = "Request timed out."; return { error: "Sports info request timed out.", result: `Sorry, ${input.context?.userName || "User"}, the sports lookup took too long.`, structuredData: outputStructuredData }; }
      this.log("error", `${logPrefix} Error:`, error.message);
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, an error occurred while getting sports info for "${teamName}".`, structuredData: outputStructuredData };
    }
  }
}