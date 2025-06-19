//livingdossier/services/tools-livings/SportsInfoTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { SportsStructuredOutput, SportsTeamData, SportsEventData } from "../../../lib/types/index";
import { format, parseISO } from 'date-fns'; // For better date formatting
import { generateStructuredJson } from "../providers/llm_clients";

interface SportsInput extends ToolInput {
  teamName: string; // Required
  queryType: "next_game" | "last_game" | "team_info"; // Required
  _rawUserInput?: string; // Raw user input passed by orchestrator
}
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
      teamName: { type: "string" as const, description: "The name of the sports team (e.g., 'Manchester United', 'Los Angeles Lakers'). This is required." } as OpenAIToolParameterProperties,
      queryType: { type: "string" as const, enum: ["next_game", "last_game", "team_info"], description: "The type of information to retrieve: 'next_game', 'last_game', or 'team_info'. This is required." } as OpenAIToolParameterProperties,
    },
    required: ["teamName", "queryType"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 1; // Cache sports info for 1 hour
  categories = ["sports", "info", "team"];
  version = "1.0.0";
  metadata = { provider: "TheSportsDB", supports: ["next_game", "last_game", "team_info"] };

  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.thesportsdb.com/api/v1/json/";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app?.url || 'https://minato.ai'}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys?.theSportsDb || "1"; // Default to test key "1"
    if (!appConfig.toolApiKeys?.theSportsDb || this.API_KEY === "1") {
      this.log("warn", "TheSportsDB API key missing or using test key '1'. Functionality may be limited.");
    }
     if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update SportsInfoTool USER_AGENT contact info with actual details.");
    }
  }

  private async extractSportsParameters(userInput: string): Promise<Partial<SportsInput>> {
    // Enhanced extraction prompt for SportsInfoTool
    const extractionPrompt = `
You are an expert parameter extractor for Minato's SportsInfoTool which provides information about sports teams.

Given this user query about sports: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. TEAM NAME IDENTIFICATION - CRITICAL RULES:
   - Extract ONLY ONE team name, even if multiple teams are mentioned
   - If the query contains "vs", "versus", "against", or similar match indicators, extract ONLY THE FIRST TEAM mentioned
   - Handle team nicknames and common abbreviations (e.g., "Man U", "Lakers", "Yankees")
   - Consider context clues to disambiguate teams with similar names
   - IMPORTANT: Translate non-English team names to their English equivalents (e.g., "Espagne" → "Spain", "Deutschland" → "Germany")
   
   IMPORTANT EXAMPLES:
   - "Spain vs France last game" → teamName: "Spain" (NOT "Spain vs France")
   - "Barcelona versus Real Madrid match" → teamName: "Barcelona" (NOT "Barcelona versus Real Madrid")
   - "Lakers against Celtics next game" → teamName: "Lakers" (NOT "Lakers against Celtics")
   - "Manchester United vs Liverpool result" → teamName: "Manchester United"
   - "tell me about Barcelona" → teamName: "Barcelona"
   - "when does Brazil play next" → teamName: "Brazil"
   - "Espagne vs France score" → teamName: "Spain" (translate from French)
   - "España contra Francia resultado" → teamName: "Spain" (translate from Spanish)

2. QUERY TYPE DETERMINATION:
   - Analyze what specific information the user wants about the team:
     a) "team_info" - General information about the team (default if unclear)
     b) "next_game" - Information about upcoming scheduled games
     c) "last_game" - Results from most recently completed games
   - Look for clear indicators:
     - "last game", "last match", "result", "score" → "last_game"
     - "next game", "next match", "when play", "upcoming" → "next_game"
     - "about", "info", "tell me about", general questions → "team_info"
   - Default to "last_game" if the user mentions "score" or appears to be asking about a match result

3. MULTILINGUAL UNDERSTANDING:
   - Recognize team names and sports terminology in multiple languages
   - Identify query intent across different language patterns
   - Always translate non-English team names to their English equivalents

OUTPUT FORMAT (JSON):
{
  "teamName": "Extracted single team name (FIRST team if multiple mentioned, translated to English if needed)",
  "queryType": "team_info" | "next_game" | "last_game"
}

CRITICAL: Never extract multiple teams separated by "vs" or similar as the teamName. Always extract just the first team.
CRITICAL: Always translate non-English team names to their English equivalents.

If teamName cannot be confidently identified, set it to null.
If queryType is ambiguous, default to "team_info".
`;

    const sportsParamSchema = {
      type: "object",
      properties: {
        teamName: { type: ["string", "null"] },
        queryType: { type: ["string", "null"], enum: ["next_game", "last_game", "team_info", null] }
      },
      required: ["teamName", "queryType"],
      additionalProperties: false
    };

    try {
      const result = await generateStructuredJson<{ teamName: string | null; queryType: "next_game" | "last_game" | "team_info" | null; }>(
        extractionPrompt,
        userInput,
        sportsParamSchema
      );

      // Apply defaults and validation
      if ('error' in result) {
        this.log("error", "Failed to extract sports parameters:", result.error);
        return {}; // Return empty object on error
      }

      let teamName = result.teamName || undefined;
      
      // Post-process to ensure we only get the first team if multiple teams are mentioned
      if (teamName && typeof teamName === 'string') {
        // Check for common match indicators
        const matchIndicators = [' vs ', ' versus ', ' contre ', ' against ', ' v ', ' VS ', ' VERSUS ', ' CONTRE ', ' AGAINST ', ' V '];
        
        for (const indicator of matchIndicators) {
          if (teamName.includes(indicator)) {
            // Extract only the first team
            const teams = teamName.split(indicator);
            teamName = teams[0].trim();
            this.log("info", `[SportsInfoTool] Post-processed team name from "${result.teamName}" to "${teamName}"`);
            break;
          }
        }
      }
      
      const extractedParams: Partial<SportsInput> = {
        teamName: teamName,
        queryType: result.queryType || "team_info"
      };

      return extractedParams;
    } catch (error) {
      this.log("error", "Failed to extract sports parameters:", error);
      // Return minimal defaults if extraction fails
      return {};
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
  private mapDbEventToAppEvent(dbEvent: SportsDbEvent, lang?: string): SportsEventData {
    const homeScoreStr = dbEvent.intHomeScore; const awayScoreStr = dbEvent.intAwayScore;
    const homeScore = homeScoreStr ? parseInt(homeScoreStr, 10) : null;
    const awayScore = awayScoreStr ? parseInt(awayScoreStr, 10) : null;
    let dateTimeUtc: string | null = null;

    if (dbEvent.strTimestamp) { 
      try { dateTimeUtc = new Date(parseInt(dbEvent.strTimestamp) * 1000).toISOString(); } catch {} 
    } else if (dbEvent.dateEvent && dbEvent.strTime) { 
      try { dateTimeUtc = new Date(`${dbEvent.dateEvent}T${dbEvent.strTime}Z`).toISOString(); }
      catch (e) { this.log("warn", `Could not parse date/time for event ${dbEvent.idEvent}: ${dbEvent.dateEvent} ${dbEvent.strTime}`); }
    } else if (dbEvent.dateEvent) { 
      try { dateTimeUtc = new Date(`${dbEvent.dateEvent}T00:00:00Z`).toISOString(); } // Assume start of day if only date
      catch (e) { this.log("warn", `Could not parse date-only event ${dbEvent.idEvent}: ${dbEvent.dateEvent}`); }
    }

    return {
      id: dbEvent.idEvent, name: dbEvent.strEvent, sport: dbEvent.strSport, league: dbEvent.strLeague, season: dbEvent.strSeason,
      round: dbEvent.intRound || null, homeTeamId: dbEvent.idHomeTeam, homeTeamName: dbEvent.strHomeTeam,
      awayTeamId: dbEvent.idAwayTeam, awayTeamName: dbEvent.strAwayTeam,
      homeScore: homeScore === null || isNaN(homeScore) ? null : homeScore,
      awayScore: awayScore === null || isNaN(awayScore) ? null : awayScore,
      date: dbEvent.dateEvent, time: dbEvent.strTime ? dbEvent.strTime.substring(0,8) : null, 
      dateTimeUtc: dateTimeUtc,
      venue: dbEvent.strVenue || null, city: dbEvent.strCity || null, country: dbEvent.strCountry || null,
      status: dbEvent.strStatus || null, postponed: dbEvent.strPostponed === "yes",
      thumbnailUrl: dbEvent.strThumb || dbEvent.strSquare || null, videoUrl: dbEvent.strVideo || null,
    };
  }

  private async findTeam(teamName: string, abortSignal?: AbortSignal): Promise<SportsDbTeam | null> {
    // Common non-English to English team name translations
    const commonTeamTranslations: Record<string, string> = {
      'espagne': 'spain',
      'españa': 'spain',
      'spanien': 'spain',
      'spagna': 'spain',
      
      'france': 'france', // Same in English
      'francia': 'france',
      'frankreich': 'france',
      
      'allemagne': 'germany',
      'alemania': 'germany',
      'deutschland': 'germany',
      
      'angleterre': 'england',
      'inglaterra': 'england',
      
      'italie': 'italy',
      'italia': 'italy',
      'italien': 'italy',
      
      'brésil': 'brazil',
      'brasil': 'brazil',
      'brasilien': 'brazil',
      
      'états-unis': 'united states',
      'estados unidos': 'united states',
      'usa': 'united states',
      
      'japon': 'japan',
      'japón': 'japan',
      
      'portugal': 'portugal', // Same in English
      
      'pays-bas': 'netherlands',
      'países bajos': 'netherlands',
      'holanda': 'netherlands'
    };
    
    // Normalize and check for translations
    const normalizedInput = teamName.toLowerCase().trim();
    const translatedTeamName = commonTeamTranslations[normalizedInput] || teamName;
    
    if (translatedTeamName !== teamName) {
      this.log("info", `Translated team name from "${teamName}" to "${translatedTeamName}"`);
    }
    
    const url = `${this.API_BASE}${this.API_KEY}/searchteams.php?t=${encodeURIComponent(translatedTeamName)}`;
    this.log("debug", `Searching TheSportsDB team: "${translatedTeamName}" URL: ${url.replace(this.API_KEY, "***")}`);
    try {
      // Create a timeout controller for node-fetch compatibility
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 8000);
      
      const response = await fetch(url, { 
        headers: { "User-Agent": this.USER_AGENT }, 
        signal: (abortSignal || timeoutController.signal) as any
      });
      
      clearTimeout(timeoutId);
      
      if (abortSignal?.aborted) { this.log("warn", `Team search aborted for "${translatedTeamName}"`); return null; }
      if (!response.ok) throw new Error(`Team search API failed: ${response.status} ${response.statusText}`);
      const data = await response.json() as TheSportsDbResponse<SportsDbTeam>;
      if (!data?.teams || data.teams.length === 0) { 
        // If no results with translated name, try original
        if (translatedTeamName !== teamName) {
          this.log("info", `No results for translated name "${translatedTeamName}", trying original "${teamName}"`);
          return this.findTeam(teamName, abortSignal);
        }
        this.log("warn", `No teams found matching "${translatedTeamName}"`); 
        return null; 
      }
      
      // Prioritize exact match if multiple teams are returned (e.g., "Barcelona" might return FC Barcelona and Barcelona SC)
      const exactMatch = data.teams.find(t => 
        t.strTeam.toLowerCase() === translatedTeamName.toLowerCase() || 
        t.strTeam.toLowerCase() === teamName.toLowerCase()
      );
      
      // Try fuzzy matches if no exact match
      let fuzzyMatch = null;
      if (!exactMatch) {
        const lowerTeamName = translatedTeamName.toLowerCase();
        const lowerOriginalName = teamName.toLowerCase();
        
        // Check for team name contained within full name
        fuzzyMatch = data.teams.find(t => 
          t.strTeam.toLowerCase().includes(lowerTeamName) || 
          (t.strAlternate && t.strAlternate.toLowerCase().includes(lowerTeamName)) ||
          t.strTeam.toLowerCase().includes(lowerOriginalName) || 
          (t.strAlternate && t.strAlternate.toLowerCase().includes(lowerOriginalName))
        );
      }
      
      // For national teams, prioritize the proper national team (filter by sport if needed)
      const isNationalTeam = data.teams.some(t => t.strTeam.includes('National') || t.strTeam.includes('National Team'));
      let nationalTeam = null;
      
      if (isNationalTeam) {
        nationalTeam = data.teams.find(t => 
          (t.strTeam.includes('National') || t.strTeam.includes('National Team')) && 
          (t.strSport === 'Soccer' || t.strSport === 'Football')
        );
      }
      
      const teamToReturn = nationalTeam || exactMatch || fuzzyMatch || data.teams[0];
      this.log("info", `Found Team: ${teamToReturn.strTeam} (ID: ${teamToReturn.idTeam})`);
      return teamToReturn;
    } catch (error: any) {
      if (error.name === 'AbortError') this.log("error", `Team search timed out or aborted for "${translatedTeamName}"`);
      else this.log("error", `Error finding team "${translatedTeamName}":`, error.message);
      return null;
    }
  }

  async execute(input: SportsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // Log what we received
    this.log("info", `[SportsInfoTool] Execute called with teamName: "${input.teamName}", queryType: "${input.queryType}", _rawUserInput: "${input._rawUserInput || 'none'}"`);
    
    // If teamName contains multiple teams (vs indicator), always extract parameters
    const hasVsPattern = input.teamName && /vs|versus|against|contre|v\.?\s|contre/i.test(input.teamName);
    const needsExtraction = input._rawUserInput || hasVsPattern;
    
    if (needsExtraction) {
      const rawInput = input._rawUserInput || input.teamName || '';
      this.log("info", `[SportsInfoTool] Extracting parameters from: "${rawInput}"`);
      const extractedParams = await this.extractSportsParameters(rawInput);
      
      // Always use extracted parameters when extraction is done
      if (extractedParams.teamName) {
        this.log("info", `[SportsInfoTool] Using extracted teamName: "${extractedParams.teamName}" (original: "${input.teamName}")`);
        input.teamName = extractedParams.teamName;
      }
      if (extractedParams.queryType) {
        input.queryType = extractedParams.queryType;
      }
      
      // For queries with vs pattern but no specific query type, default to last_game
      if (hasVsPattern && !extractedParams.queryType) {
        this.log("info", `[SportsInfoTool] Setting default queryType to last_game for vs pattern query`);
        input.queryType = "last_game";
      }
    }
    
    // Apply user preferences if available
    if (input.context?.userState?.workflow_preferences) {
      const prefs = input.context.userState.workflow_preferences;
      
      // If user hasn't specified a team but has preferred leagues,
      // we can suggest a team from their preferred league
      if (!input.teamName && prefs.sportsPreferredLeagues && prefs.sportsPreferredLeagues.length > 0) {
        // This is just a suggestion - in a full implementation, we'd need to map leagues to teams
        logger.debug(`[SportsInfoTool] User has preferred leagues: ${prefs.sportsPreferredLeagues.join(', ')}`);
      }
    }
    
    const userNameForResponse = input.context?.userName || "friend";
    const teamNameInput = input.teamName || "";
    const queryType = input.queryType || "team_info";
    
    if (!teamNameInput.trim()) {
      const errorMsg = "Missing team name.";
      logger.error(`[SportsInfoTool] ${errorMsg}`);
      return {
        error: errorMsg,
        result: `Minato needs a team name to find sports information for ${userNameForResponse}.`,
        structuredData: {
          result_type: "sports_info",
          source_api: "sports-api",
          query: input,
          data: null,
          error: errorMsg
        }
      };
    }
    
    const logPrefix = `[SportsTool Team:${teamNameInput.substring(0,15) || "unknown"}..., Type:${queryType || "unknown"}]`;
    
    const queryInputForStructuredData = { ...input };

    if (abortSignal?.aborted) { return { error: "Sports info request cancelled.", result: "Cancelled." }; }
    let outputStructuredData: SportsStructuredOutput = {
      result_type: "sports_info", source_api: "thesportsdb", query: queryInputForStructuredData, error: null,
    };
    
    this.log("info", `${logPrefix} Executing...`);

    const team = await this.findTeam(teamNameInput.trim(), abortSignal);
    if (abortSignal?.aborted) return { error: "Sports info request cancelled.", result: "Cancelled." };
    if (!team) {
      outputStructuredData.error = `Could not find team "${teamNameInput}".`;
      return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, I couldn't find a team named "${teamNameInput}". Please check the spelling or try a different team name.`, structuredData: outputStructuredData };
    }
    const teamId = team.idTeam;
    const teamDisplayName = team.strTeam;
    const appTeamInfo = this.mapDbTeamToAppTeam(team);
    outputStructuredData.teamInfo = appTeamInfo; outputStructuredData.error = null;

    try {
      let resultString = "";
      if (queryType === "team_info") {
        const desc = appTeamInfo.description ? ` A bit about them: ${appTeamInfo.description.substring(0,150)}...` : "";
        resultString = `${appTeamInfo.name} plays ${appTeamInfo.sport}${appTeamInfo.league ? ` in the ${appTeamInfo.league}` : ""}. They were formed around ${appTeamInfo.formedYear || "an unspecified year"}.${desc}`;
        outputStructuredData.event = null; outputStructuredData.eventsList = null;
      } else { 
        const endpoint = queryType === "next_game" ? "eventsnext.php" : "eventslast.php";
        const url = `${this.API_BASE}${this.API_KEY}/${endpoint}?id=${teamId}`;
        this.log("debug", `${logPrefix} Fetching events from ${endpoint} URL: ${url.replace(this.API_KEY, "***")}`);
        
        // Create a timeout controller for node-fetch compatibility
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 10000);
        
        const response = await fetch(url, { 
          headers: { "User-Agent": this.USER_AGENT }, 
          signal: (abortSignal || timeoutController.signal) as any
        });
        
        clearTimeout(timeoutId);
        
        if (abortSignal?.aborted) { 
          return { error: "Sports info request cancelled.", result: "Cancelled." }; 
        }
        
        if (!response.ok) {
          throw new Error(`Event fetch (${endpoint}) failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json() as TheSportsDbResponse<SportsDbEvent>;
        const dbEvents = data.events || data.results || null; 

        if (!dbEvents || dbEvents.length === 0) {
          resultString = `No ${queryType === "next_game" ? "upcoming scheduled games" : "recent completed game results"} found for ${teamDisplayName} at the moment.`;
          outputStructuredData.event = null; outputStructuredData.eventsList = null;
        } else {
          const userLang = input.context?.locale?.split("-")[0] || input.lang?.split("-")[0] || "en";
          const appEvents = dbEvents.map(dbEv => this.mapDbEventToAppEvent(dbEv, userLang));
          const event = appEvents[0]; 
          outputStructuredData.event = event; outputStructuredData.eventsList = appEvents; 
          const opponent = event.homeTeamName === teamDisplayName ? event.awayTeamName : event.homeTeamName;
          const homeAway = event.homeTeamName === teamDisplayName ? "at home" : "away";
          const venue = event.venue ? ` at ${event.venue}` : "";
          
          // Format date in a more user-friendly way
          let dateTimeString = "Date TBD";
          if (event.dateTimeUtc) {
            try {
              const dateObj = new Date(event.dateTimeUtc);
              dateTimeString = dateObj.toLocaleDateString(userLang, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (e) {
              dateTimeString = event.date || "Date TBD";
            }
          } else if (event.date) {
            dateTimeString = event.date;
          }

          if (queryType === "next_game") {
            resultString = `${teamDisplayName}'s next game is against ${opponent} (${homeAway}) on ${dateTimeString}${venue}. The status is currently: ${event.status || "Scheduled"}.`;
          } else { 
            const scoreAvailable = event.homeScore !== null && event.awayScore !== null;
            const score = scoreAvailable ? `the score was ${event.homeScore} - ${event.awayScore}` : "the score isn't available";
            let outcome = "finished";
            if(scoreAvailable) { 
              const homeWon = event.homeScore! > event.awayScore!; 
              const awayWon = event.awayScore! > event.homeScore!; 
              const isHomeTeam = event.homeTeamName === teamDisplayName; 
              
              if (isHomeTeam && homeWon) outcome = "they won"; 
              else if (!isHomeTeam && awayWon) outcome = "they won"; 
              else if (isHomeTeam && awayWon) outcome = "they lost"; 
              else if (!isHomeTeam && homeWon) outcome = "they lost"; 
              else outcome = "it was a draw"; 
            }
            
            // Special formatting for "vs pattern" queries to emphasize the score
            if (hasVsPattern && scoreAvailable) {
              // Format match result in a more structured way for vs queries
              const vsTeamResult = `${event.homeTeamName} ${event.homeScore} - ${event.awayScore} ${event.awayTeamName}`;
              
              // Extract potential team names from the original query for better matching
              const originalQuery = input._rawUserInput || input.teamName || '';
              const potentialTeams = originalQuery.split(/vs|versus|against|contre|v\.?\s/i).map(t => t.trim().toLowerCase());
              
              // Check if the query was about both teams in the event
              const queryIncludesBothTeams = 
                potentialTeams.some(t => event.homeTeamName.toLowerCase().includes(t) || 
                                        (event.homeTeamName.toLowerCase() === t)) &&
                potentialTeams.some(t => event.awayTeamName.toLowerCase().includes(t) || 
                                        (event.awayTeamName.toLowerCase() === t));
              
              if (queryIncludesBothTeams) {
                // More detailed format for when the query specifically asked about these two teams
                resultString = `Match result: ${vsTeamResult}\nPlayed on ${dateTimeString}${venue ? ` at ${venue}` : ""}\nStatus: ${event.status || "Completed"}`;
              } else {
                // More generic format
                resultString = `The last match result for ${teamDisplayName}: ${vsTeamResult} (played on ${dateTimeString})`;
              }
            } else {
              resultString = `${teamDisplayName}'s last game: they played ${opponent} (${homeAway}) on ${dateTimeString}. It looks like ${outcome}, and ${score}. The status was: ${event.status || "Finished"}.`;
            }
          }
        }
      }
      this.log("info", `${logPrefix} Successfully retrieved ${queryType}.`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed sports info fetch: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError') { 
        outputStructuredData.error = "Request timed out."; 
        return { 
          error: "Sports info request timed out.", 
          result: `Sorry, the sports lookup took too long. Please try again in a moment.`, 
          structuredData: outputStructuredData 
        }; 
      }
      this.log("error", `${logPrefix} Error:`, error.message);
      return { 
        error: errorMsg, 
        result: `Sorry, an error occurred while getting sports info for "${teamNameInput}". ${error.message}`, 
        structuredData: outputStructuredData 
      };
    }
  }
}