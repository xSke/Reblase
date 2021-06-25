import {
    AttributeID,
    BlaseballAttributes,
    BlaseballAttributesDeprecated,
    BlaseballEntity,
    GameID,
    LeagueID,
    PlayerID,
    PlayerStats,
    PlayoffsID,
    SeasonID,
    StadiumID,
    TeamID,
    TeamRoster,
} from "./common";

export interface BlaseballGame extends BlaseballEntity<GameID> {
    outcomes: string[];
    lastUpdate: string;
    scoreLedger: string | null;
    scoreUpdate: string | null;

    season: number;
    day: number;
    isPostseason: boolean;
    weather: number;

    inning: number;
    topOfInning: boolean;
    playCount?: number;
    shame: boolean;

    awayOdds: number;
    homeOdds: number;

    awayScore: number;
    awayTeamBatterCount: number;
    homeScore: number;
    homeTeamBatterCount: number;

    halfInningOuts: number;
    halfInningScore: number;
    atBatBalls: number;
    atBatStrikes: number;

    awayPitcher: PlayerID | null;
    awayPitcherName: string | null;
    awayBatter: PlayerID | null;
    awayBatterName: string | null;
    homePitcher: PlayerID | null;
    homePitcherName: string | null;
    homeBatter: PlayerID | null;
    homeBatterName: string | null;
    awayBases?: number;
    awayBalls?: number;
    awayStrikes: number;
    awayOuts?: number;

    awayTeam: TeamID;
    awayTeamName: string;
    awayTeamNickname: string;
    awayTeamColor: string;
    awayTeamEmoji: string;
    awayTeamSecondaryColor?: string;
    homeTeam: TeamID;
    homeTeamName: string;
    homeTeamNickname: string;
    homeTeamColor: string;
    homeTeamEmoji: string;
    homeTeamSecondaryColor?: string;
    homeBases?: number;
    homeBalls?: number;
    homeStrikes: number;
    homeOuts?: number;

    baserunnerCount: number;
    basesOccupied: number[];
    baseRunners: PlayerID[];
    baseRunnerNames?: string[];

    phase: number;
    gameStart: boolean;
    gameComplete: boolean;
    finalized: boolean;

    seriesIndex: number;
    seriesLength: number;
    repeatCount?: number;

    stadiumId?: string | null;
}

export interface DamageResult {
    dmgType: number;
    teamTarget: string;
    playerSource: string;
    dmg: number;
}

export interface BlaseballFight extends BlaseballGame {
    awayHp: string;
    homeHp: string;
    awayMaxHp: string;
    homeMaxHp: string;
    damageResults: string;
}

export interface BlaseballPlayer extends BlaseballEntity<PlayerID>, BlaseballAttributes, PlayerStats {
    name: string;

    deceased: boolean;
    soul: number;
    peanutAllergy?: boolean;
    fate?: number;
    ritual?: string | null;
    bat?: string | null;
    armor?: string | null;
    blood?: number;
    coffee?: number;

    totalFingers: number;
    cinnamon?: number;
    pressurization: number;

    hitStreak?: number;
    consecutiveHits?: number;
}

export interface BlaseballTeam
    extends BlaseballEntity<TeamID>,
        BlaseballAttributes,
        BlaseballAttributesDeprecated,
        TeamRoster {
    fullName: string;
    nickname: string;
    location: string;
    shorthand: string;
    slogan: string;
    emoji: string;

    mainColor: string;
    secondaryColor: string;

    shameRuns: number;
    totalShames: number;
    seasonShames: number;
    totalShamings: number;
    seasonShamings: number;

    championships: number;
    rotationSlot?: number;
}

export interface BlaseballTemporal {
    doc?: BlaseballTemporalDoc;
}

export interface BlaseballTemporalDoc extends BlaseballEntity<"whatistime"> {
    alpha: number;
    beta: number;
    zeta: string;
    delta: boolean;
    gamma: number;
    epsilon: boolean;
}

export interface BlaseballSimData extends BlaseballEntity<"thisidisstaticyo"> {
    season: number;
    day: number;

    phase: number;
    playOffRound: number;

    league: LeagueID;
    seasonId: SeasonID;
    playoffs: PlayoffsID;

    eraTitle: string;
    eraColor?: string;
    subEraTitle?: string;
    subEraColor?: string | null;

    nextPhaseTime: string;
    nextElectionEnd: string;
    nextSeasonStart: string;

    twgo?: string;

    attr?: string[];

    // Removed fields, still present in other objects, replaced by attr
    labourOne?: number;
    openedBook?: boolean;
    unlockedPeanuts?: boolean;
    doTheThing?: boolean;
    eatTheRich?: boolean;
    unlockedInterviews?: boolean;
}

export interface BlaseballStadium extends BlaseballEntity<StadiumID> {
    name: string;
    nickname: string;
    teamId: string;
    model: number;
    mods: AttributeID[];
}
