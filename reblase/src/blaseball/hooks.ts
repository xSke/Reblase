import useSWR, { useSWRInfinite } from "swr";
import { useEffect, useMemo, useState } from "react";
import {
    ChronGame,
    ChronGameUpdate,
    ChronPlayer,
    ChronResponse,
    ChronTeam,
    ChronTemporalUpdate,
    GameListQuery,
    GameListResponse,
    GameUpdatesQuery,
    GameUpdatesResponse,
    chroniclerApi,
    ChronPlayerUpdate,
    PlayerUpdatesQuery,
    FightUpdatesQuery,
    FightUpdatesResponse,
    ChronFightUpdate,
    FightsResponse,
    ChronFight,
    SimResponse,
    TemporalResponse,
    TemporalUpdatesQuery,
    ChronStadium,
} from "blaseball-lib/chronicler";
import { BlaseballSimData, BlaseballStadium } from "blaseball-lib/models";

interface GameListHookReturn {
    games: ChronGame[];
    error: any;
    isLoading: boolean;
}

export function useGameList(query: GameListQuery): GameListHookReturn {
    const { data, error } = useSWR<GameListResponse>(chroniclerApi.gameList(query));

    return {
        games: data?.data ?? [],
        error,
        isLoading: !data,
    };
}

interface GameUpdatesHookReturn {
    updates: ChronGameUpdate[];
    error: any;
    isLoading: boolean;
}

export function useGameUpdates(query: GameUpdatesQuery, autoRefresh: boolean): GameUpdatesHookReturn {
    // First load of original data
    query.count = 1000; // should be enough, right? :)
    const { data: initialData, error } = useSWR<GameUpdatesResponse>(chroniclerApi.gameUpdates(query));

    // Updates added via autoupdating
    const [extraUpdates, setExtraUpdates] = useState<ChronGameUpdate[]>([]);

    // Combined the above!
    const allUpdates = [...(initialData?.data ?? []), ...extraUpdates];

    // Background timer for autoupdating
    useEffect(() => {
        const timer = setInterval(async () => {
            // Stop if autorefresh is off
            // (effect closure will get remade on change so this "updates" properly)
            if (!autoRefresh || allUpdates.length === 0) return;

            // Handle autorefresh logic
            const lastUpdate = allUpdates[allUpdates.length - 1];
            const lastTimestamp = lastUpdate.timestamp;

            query.after = lastTimestamp;
            const response = await fetch(chroniclerApi.gameUpdates(query));
            const json = (await response.json()) as ChronResponse<ChronGameUpdate>;

            // Add the data we got to the extra state :)
            setExtraUpdates([...extraUpdates, ...json.data]);
        }, 2000);
        return () => clearInterval(timer);
    }, [query, autoRefresh, allUpdates, extraUpdates]);

    return {
        updates: allUpdates,
        isLoading: !initialData,
        error,
    };
}

interface FightUpdatesHookReturn {
    updates: ChronFightUpdate[];
    error: any;
    isLoading: boolean;
}

export function useFightUpdates(query: FightUpdatesQuery): FightUpdatesHookReturn {
    const { data, error } = useSWR<FightUpdatesResponse>(chroniclerApi.fightUpdates(query));

    return {
        updates: data?.data ?? [],
        isLoading: !data,
        error,
    };
}

interface PlayerTeamsHookReturn {
    players: ChronPlayer[];
    teams: ChronTeam[];
    teamsObj: Partial<Record<string, ChronTeam>>;
    error?: any;
    isLoading: boolean;
}

export function usePlayerTeamsList(): PlayerTeamsHookReturn {
    const { data: players, error: playersError } = useSWR<ChronResponse<ChronPlayer>>(chroniclerApi.players());
    const { data: teams, error: teamsError } = useSWR<ChronResponse<ChronTeam>>(chroniclerApi.teams());

    const teamsObj = useMemo(() => {
        const teamsObj: Record<string, ChronTeam> = {};
        if (teams) {
            for (const team of teams.data) teamsObj[team.id] = team;
        }

        return teamsObj;
    }, [teams]);

    return {
        players: players?.data ?? [],
        teams: teams?.data ?? [],
        teamsObj,
        error: playersError || teamsError,
        isLoading: (!players || !teams) && !(playersError || teamsError),
    };
}

interface TemporalHookReturn {
    updates: ChronTemporalUpdate[];
    error: any;
    isLoading: boolean;
}

export function useTemporal(): TemporalHookReturn {
    const { data, error } = useSWRInfinite<TemporalResponse>(
        (_, previous) => {
            const query: TemporalUpdatesQuery = { count: 250, order: "desc" };

            // First page
            if (!previous) return chroniclerApi.temporalUpdates(query);

            // Reached end
            if (!previous.nextPage) return null;

            // Next page
            return chroniclerApi.temporalUpdates({ ...query, page: previous.nextPage });
        },
        // todo: better way to do this?
        { initialSize: 999 }
    );

    const allUpdates = [];
    if (data) {
        for (const page of data) {
            allUpdates.push(...page.data);
        }
    }

    return {
        updates: allUpdates,
        error,
        isLoading: !data && !error,
    };
}

interface SimDataHookReturn {
    data: BlaseballSimData | null;
    error: any;
    isLoading: boolean;
}

export function useSimulation(): SimDataHookReturn {
    const { data, error } = useSWR<SimResponse>(chroniclerApi.simUpdates({ order: "desc", count: 1 }));

    return {
        data: data?.data[0]?.data ?? null,
        error,
        isLoading: !data && !error,
    };
}

export interface PlayerUpdatesHookReturn {
    updates: ChronPlayerUpdate[] | undefined;
    error: any;
}

export function usePlayerUpdates(query: PlayerUpdatesQuery): PlayerUpdatesHookReturn {
    const { data, error } = useSWR<ChronResponse<ChronPlayerUpdate>>(chroniclerApi.playerUpdates(query));
    return { updates: data?.data, error };
}

interface FightsHookReturn {
    fights: ChronFight[];
    error: any;
    isLoading: boolean;
}

export function useFights(): FightsHookReturn {
    const { data, error } = useSWR<FightsResponse>(chroniclerApi.fights());

    return {
        fights: data?.data ?? [],
        isLoading: !data,
        error,
    };
}

interface StadiumHookReturn {
    stadiums: BlaseballStadium[];
    error: any;
    isLoading: boolean;
}

export function useStadiums(): StadiumHookReturn {
    const { data, error } = useSWR<ChronResponse<ChronStadium>>(chroniclerApi.stadiums());

    return {
        stadiums: (data?.data ?? []).map((s) => s.data),
        error,
        isLoading: !data,
    };
}
