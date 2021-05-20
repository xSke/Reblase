import { useLocation, useParams } from "react-router";
import React, { useEffect, useMemo, useState } from "react";

import { DayTable } from "../components/gamelist/DayTable";
import { Loading } from "../components/elements/Loading";
import { Container } from "../components/layout/Container";
import Error from "../components/elements/Error";
import { cache } from "swr";
import { useFights, useGameList, usePlayerTeamsList, useSimulation } from "../blaseball/hooks";
import { ChronGame } from "blaseball-lib/chronicler";
import TeamPicker from "../components/elements/TeamPicker";
import OutcomePicker from "../components/elements/OutcomePicker";
import { getOutcomes } from "../blaseball/outcome";
import WeatherPicker from "../components/elements/WeatherPicker";
import Checkbox from "../components/elements/Checkbox";
import { Link } from "react-router-dom";
import { BlaseballPlayer, BlaseballTeam } from "blaseball-lib/models";
import { PlayerID } from "blaseball-lib/common";
import { FightRow } from "components/gamelist/GameRow";
import Twemoji from "components/elements/Twemoji";
import { displaySeason } from "blaseball-lib/games";
import StadiumPicker from "components/elements/StadiumPicker";

type GameDay = { games: ChronGame[]; season: number; day: number };
function groupByDay(games: ChronGame[]): GameDay[] {
    const days: Record<string, GameDay> = {};
    for (const game of games) {
        const day = game.data.day;
        if (!days[day]) days[day] = { games: [], season: game.data.season, day: game.data.day };
        days[day].games.push(game);
    }

    const daysList = [];

    // Can't find a better way to do this because JS sorting is hard
    // 120 should be an upper bound (inb4 falsehoods....)
    for (let i = 0; i < 120; i++) {
        if (days[i]) daysList.push(days[i]);
    }

    return daysList;
}

const GamesList = React.memo(
    (props: {
        days: GameDay[];
        players: BlaseballPlayer[];
        teams: BlaseballTeam[];
        showFutureWeather: boolean;
        currentDay: number;
    }) => {
        const teamsMap: Record<PlayerID, BlaseballTeam> = {};
        for (const team of props.teams) teamsMap[team.id!] = team;
        const playersMap: Record<PlayerID, BlaseballPlayer> = {};
        for (const player of props.players) playersMap[player.id!] = player;

        return (
            <div>
                {props.days.map(({ games, season, day }) => {
                    return (
                        <DayTable
                            key={day}
                            season={season}
                            day={day}
                            currentDay={props.currentDay}
                            games={games}
                            teams={teamsMap}
                            players={playersMap}
                            showFutureWeather={props.showFutureWeather}
                        />
                    );
                })}
            </div>
        );
    }
);

function GamesListFetching(props: {
    season: number;
    teams: string[] | null;
    stadiums: string[] | null;
    outcomes: string[] | null;
    weather: number[] | null;
    showFutureGames: boolean;
    showFutureWeather: boolean;

    allPlayers: BlaseballPlayer[];
    allTeams: BlaseballTeam[];
}) {
    const { games, error, isLoading } = useGameList({
        season: props.season,
        started: !props.showFutureGames ? true : undefined,
        team: props.teams ? props.teams.join(",") : undefined,
        weather: props.weather ? props.weather.join(",") : undefined,
        outcomes: props.outcomes ? true : undefined,
    });

    const { data: simData, error: simError, isLoading: simIsLoading } = useSimulation();

    const days = useMemo(() => {
        let gamesFiltered = games;
        if (props.outcomes) {
            gamesFiltered = gamesFiltered.filter((game) => {
                const gameOutcomes = getOutcomes(game.data.outcomes, game.data.shame, game.data.awayTeamNickname, game.startTime, game.endTime);
                for (const gameOutcome of gameOutcomes)
                    if (props.outcomes?.indexOf(gameOutcome.name) !== -1) return true;
                return false;
            });
        }

        if (props.stadiums) {
            gamesFiltered = gamesFiltered.filter((game) => {
                if (!game.data.stadiumId) return false;
                return props.stadiums?.indexOf(game.data.stadiumId) !== -1 ?? false;
            });
        }

        console.log(gamesFiltered.length);
        return groupByDay(gamesFiltered).reverse();
    }, [games, props.outcomes, props.stadiums]);

    if (error || simError) return <Error>{error}</Error>;
    if (isLoading || simIsLoading) return <Loading />;

    const currentDay = simData?.day ?? 0;

    return (
        <GamesList
            days={days}
            players={props.allPlayers}
            teams={props.allTeams}
            showFutureWeather={props.showFutureWeather}
            currentDay={currentDay}
        />
    );
}

interface SeasonPageParams {
    season: string;
}

// const { data: teams, error: teamsError } = useSWR<BlaseballTeam[]>(blaseballApi.allTeams());
// const { data: players, error: playersError } = useSWR<BlaseballPlayer[]>(() => {
//     const pitchers = [];
//     for (const team of teams ?? []) {
//         pitchers.push(...team.rotation);
//     }
//     return pitchers.length ? blaseballApi.players(pitchers) : null;
// });
// if (error) return <Error>{error.toString()}</Error>;

export function SeasonPage() {
    const location = useLocation();

    const { season: seasonStr } = useParams<SeasonPageParams>();
    const season = parseInt(seasonStr) - 1;

    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [selectedStadiums, setSelectedStadiums] = useState<string[]>([]);
    const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
    const [selectedWeather, setSelectedWeather] = useState<number[]>([]);
    const [showFutureGames, setShowFutureGames] = useState<boolean>(false);
    const [showFutureWeather, setShowFutureWeather] = useState<boolean>(false);

    const { players, teams, error, isLoading: isLoadingPlayerTeams } = usePlayerTeamsList();
    let { fights } = useFights();
    fights = fights.filter((f) => f.data.season === season);

    // Never reuse caches across multiple seasons, then it feels slower because instant rerender...
    useEffect(() => cache.clear(), [season]);

    if (error) return <Error>{error.toString()}</Error>;
    if (isLoadingPlayerTeams) return <Loading />;

    return (
        <Container className={"mt-4"}>
            <p className="mb-2">
                <Link to="/seasons">&larr; Back to Seasons</Link>
            </p>
            <h2 className="text-2xl font-semibold mb-4">
                <Link to={location.pathname}>Games in Season {displaySeason(season)}</Link>
            </h2>

            <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <div className="font-semibold mb-1">Filter by team</div>
                    <TeamPicker
                        placeholder="Select team(s)..."
                        type={season >= 0 ? "league" : "coffee"}
                        teams={teams}
                        selectedTeams={selectedTeams}
                        setSelectedTeams={setSelectedTeams}
                    />
                </div>

                <div>
                    <div className="font-semibold mb-1">Filter by events</div>
                    <OutcomePicker
                        placeholder="Select event(s)..."
                        selectedOutcomes={selectedOutcomes}
                        setSelectedOutcomes={setSelectedOutcomes}
                    />
                </div>

                <div>
                    <div className="font-semibold mb-1">Filter by weather</div>
                    <WeatherPicker
                        placeholder="Select weather..."
                        selectedWeather={selectedWeather}
                        setSelectedWeather={setSelectedWeather}
                    />
                </div>

                <div>
                    <div className="font-semibold mb-1">Filter by stadium</div>
                    <StadiumPicker
                        placeholder="Select stadium(s)..."
                        teams={teams}
                        selectedStadiums={selectedStadiums}
                        setSelectedStadiums={setSelectedStadiums}
                    />
                </div>

                <div>
                    <div className="font-semibold mb-1">Options</div>
                    <Checkbox value={showFutureGames} setValue={setShowFutureGames}>
                        Show future games
                    </Checkbox>
                    <Checkbox value={showFutureWeather} setValue={setShowFutureWeather}>
                        Show future weather
                    </Checkbox>
                </div>
            </div>

            {fights.length > 0 ? (
                <div className="border-4 border-red-700 -mx-6 my-2 px-5 py-4">
                    <div className="font-semibold">
                        <Twemoji emoji={"\u{1F6A8}"} className="mr-1" />
                        BOSS BATTLE
                        <Twemoji emoji={"\u{1F6A8}"} className="ml-1" />
                    </div>

                    <div className="flex flex-col">
                        {fights.map((f) => {
                            return <FightRow fight={f} />;
                        })}
                    </div>
                </div>
            ) : null}

            <GamesListFetching
                season={season}
                teams={selectedTeams.length ? selectedTeams : null}
                outcomes={selectedOutcomes.length ? selectedOutcomes : null}
                weather={selectedWeather.length ? selectedWeather : null}
                stadiums={selectedStadiums.length ? selectedStadiums : null}
                showFutureGames={showFutureGames}
                showFutureWeather={showFutureWeather}
                allPlayers={players.map((p) => p.data)}
                allTeams={teams.map((p) => p.data)}
            />
        </Container>
    );
}
