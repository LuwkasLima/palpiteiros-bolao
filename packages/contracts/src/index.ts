// Public surface of the API contract. `schema.d.ts` is generated from the FastAPI
// OpenAPI schema (run `pnpm contracts:gen` with the API running). The handwritten
// aliases below give the web app friendly names for the response/request shapes.
export type { paths, components } from "./schema";
import type { components } from "./schema";

type Schemas = components["schemas"];

export type UserOut = Schemas["UserOut"];
export type TeamOut = Schemas["TeamOut"];
export type MatchOut = Schemas["MatchOut"];
export type PoolSummaryOut = Schemas["PoolSummaryOut"];
export type PoolOut = Schemas["PoolOut"];
export type MemberOut = Schemas["MemberOut"];
export type PredictionOut = Schemas["PredictionOut"];
export type PredictionIn = Schemas["PredictionIn"];
export type LeaderboardOut = Schemas["LeaderboardOut"];
export type LeaderboardRowOut = Schemas["LeaderboardRowOut"];
export type ResultIn = Schemas["ResultIn"];
export type Stage = Schemas["Stage"];
export type MatchStatus = Schemas["MatchStatus"];
export type PredictionEntryOut = Schemas["PredictionEntryOut"];
export type MatchRevealedOut = Schemas["MatchRevealedOut"];
export type RevealedPredictionsOut = Schemas["RevealedPredictionsOut"];
export type AdminStatsOut = Schemas["AdminStatsOut"];
export type MatchStatusCountsOut = Schemas["MatchStatusCountsOut"];
export type NextMatchTodayOut = Schemas["NextMatchTodayOut"];
export type WeeklyHeroOut = Schemas["WeeklyHeroOut"];
