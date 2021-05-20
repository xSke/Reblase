import dayjs from "dayjs";
import Tooltip from "rc-tooltip";
import React from "react";
import { Link } from "react-router-dom";
import { ChronFight, ChronGame } from "blaseball-lib/chronicler";
import { getOutcomes, Outcome } from "../../blaseball/outcome";
import { getWeather } from "blaseball-lib/weather";
import Twemoji from "../elements/Twemoji";
import { displaySeason } from "blaseball-lib/games";

const Events = React.memo((props: { outcomes: string[]; shame: boolean; awayTeam: string; startTime: string | null; endTime: string | null; }) => {
    const outcomes = getOutcomes(props.outcomes, props.shame, props.awayTeam, props.startTime, props.endTime);
    if (!outcomes) return <></>;

    const style: Record<string, string> = {
        red: "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200",
        orange: "bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
        blue: "bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
        pink: "bg-pink-200 dark:bg-pin-900 text-pink-800 dark:text-pin-200",
        purple: "bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
        gray: "bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
    };

    const outcomesByType: Record<string, Outcome[]> = {};
    for (const outcome of outcomes) {
        if (!outcomesByType[outcome.name]) outcomesByType[outcome.name] = [];
        outcomesByType[outcome.name].push(outcome);
    }

    return (
        <span>
            {Object.keys(outcomesByType).map((outcomeType, idx) => {
                const outcomes = outcomesByType[outcomeType];
                const combined = outcomes.map((o) => o.text).join("\n");

                return (
                    <Tooltip
                        key={idx}
                        placement="top"
                        overlay={<div className="whitespace-pre-line text-center">{combined}</div>}
                    >
                        <span className={`ml-1 tag-sm ${style[outcomes[0].color]}`}>
                            {outcomeType}
                            {outcomes.length > 1 ? <span className="ml-1"> x{outcomes.length}</span> : ""}
                        </span>
                    </Tooltip>
                );
            })}
        </span>
    );
});

const Duration = React.memo(
    (props: {
        gameId: string;
        startTime: string | null;
        endTime: string | null;
        inning: number;
        topOfInning: boolean;
    }) => {
        if (!props.startTime) return null;

        let duration = "LIVE";
        if (props.startTime && props.endTime) {
            const startMoment = dayjs(props.startTime);
            const endMoment = dayjs(props.endTime);
            const diff = endMoment.diff(startMoment);

            const seconds = Math.floor(diff / 1000) % 60;
            const minutes = Math.floor(diff / 60000);
            duration = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
        }

        const arrow = props.topOfInning ? "\u25B2" : "\u25BC";

        return (
            <Link
                className="text-center text-sm tabular-nums text-gray-700 dark:text-gray-300"
                to={`/game/${props.gameId}`}
            >
                <span className="w-4 inline-block text-right mr-1">{props.inning + 1}</span>
                <span className="text-xs pr-2 border-r border-gray-500 mr-2">{arrow}</span>
                {duration}
            </Link>
        );
    }
);

export const Weather = React.memo((props: { weather: number | null; className?: string }) => {
    const weather = getWeather(props.weather ?? -1) ?? { name: "???", emoji: "\u{2753}" };

    return (
        <Tooltip placement="top" overlay={<span>{weather.name}</span>}>
            <Twemoji emoji={weather.emoji ?? "?"} className={props.className} />
        </Tooltip>
    );
});

interface TeamData {
    name: string;
    emoji: string;
    score: number;
    pitcher: string | null;
    predictedPitcher: string | null;
    win: boolean;
}

const TeamScoreLine = React.memo((props: { team: TeamData }) => {
    return (
        <div className="space-x-2">
            <span className="inline-block w-6 font-lg font-semibold text-right tabular-nums">{props.team.score}</span>
            <span className={props.team.win ? "font-semibold" : "font-normal"}>
                <Twemoji emoji={props.team.emoji} className="mr-1" /> {props.team.name}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 italic">
                {props.team.pitcher ? props.team.pitcher : `${props.team.predictedPitcher} (est.)`}
            </span>
        </div>
    );
});

const TwoLineTeamScore = React.memo((props: { away: TeamData; home: TeamData; className?: string }) => {
    return (
        <div className={`flex flex-col flex-1 ${props.className}`}>
            <TeamScoreLine team={props.away} />
            <TeamScoreLine team={props.home} />
        </div>
    );
});

const OneLineTeamScore = React.memo((props: { away: TeamData; home: TeamData; className?: string }) => {
    return (
        <div className={`flex flex-row space-x-2 items-baseline ${props.className}`}>
            <div className={`w-40 text-right text-sm ${props.away.win ? "font-semibold" : "font-normal"}`}>
                {props.away.name}
                <Twemoji emoji={props.away.emoji} className="text-base ml-2" />
            </div>
            <div className="w-16 text-sm text-center font-semibold bg-gray-200 dark:bg-gray-800 rounded-sm tabular-nums tracking-tight">
                {props.away.score}&ensp;-&ensp;{props.home.score}
            </div>
            <div className={`w-40 text-sm ${props.home.win ? "font-semibold" : "font-normal"}`}>
                <Twemoji emoji={props.home.emoji} className="text-base mr-2" />
                {props.home.name}
            </div>
        </div>
    );
});

const StandalonePitchers = React.memo(
    (props: {
        homePitcher: string | null;
        awayPitcher: string | null;
        predictedHomePitcher: string | null;
        predictedAwayPitcher: string | null;
        className?: string;
    }) => {
        return (
            <div className={`text-sm text-gray-700 dark:text-gray-300 italic ${props.className}`}>
                {props.awayPitcher ? props.awayPitcher : props.predictedAwayPitcher}
                {" / "}
                {props.homePitcher ? props.homePitcher : props.predictedHomePitcher}
                {(!props.awayPitcher || !props.homePitcher) && " (est.)"}
            </div>
        );
    }
);

const SeasonDay = React.memo((props: { season: number; day: number | string; className?: string }) => {
    // todo: clean up eugh
    let seasonText = displaySeason(props.season);
    if (parseInt(seasonText)) seasonText = "S" + seasonText;

    return (
        <div className={`text-sm font-semibold ${props.className}`}>
            {seasonText}/{typeof props.day === "number" ? props.day + 1 : props.day}
        </div>
    );
});

export const GameRow = React.memo(
    (props: {
        game: ChronGame;
        showWeather: boolean;
        predictedHomePitcher: string | null;
        predictedAwayPitcher: string | null;
    }) => {
        const { data } = props.game;

        const home = {
            name: data.homeTeamNickname,
            emoji: data.homeTeamEmoji,
            score: data.homeScore,
            pitcher: data.homePitcherName,
            predictedPitcher: props.predictedHomePitcher,
            win: data.homeScore >= data.awayScore,
        };

        const away = {
            name: data.awayTeamNickname,
            emoji: data.awayTeamEmoji,
            score: data.awayScore,
            pitcher: data.awayPitcherName,
            predictedPitcher: props.predictedAwayPitcher,
            win: data.awayScore >= data.homeScore,
        };

        const weather = props.showWeather ? data.weather : null;

        return (
            <Link
                to={`/game/${props.game.gameId}`}
                className="flex flex-row px-2 py-2 border-b border-gray-300 dark:border-gray-700 space-x-2 items-baseline hover:bg-gray-200 dark-hover:bg-gray-800"
            >
                <div className="contents md:hidden">
                    <TwoLineTeamScore home={home} away={away} />

                    <div className="flex flex-col justify-center items-end">
                        <div className="flex flex-row space-x-2">
                            <Weather weather={weather} className="text-sm" />
                            <SeasonDay season={data.season} day={data.day} className="text-right" />
                        </div>

                        <div className="flex flex-row justify-end items-baseline space-x-2">
                            <Events 
                                outcomes={data.outcomes} 
                                shame={data.shame} 
                                awayTeam={data.awayTeamNickname}
                                startTime={props.game.startTime}
                                endTime={props.game.endTime}/>
                            <Duration
                                gameId={props.game.gameId}
                                startTime={props.game.startTime}
                                endTime={props.game.endTime}
                                inning={data.inning}
                                topOfInning={data.topOfInning}
                            />
                        </div>
                    </div>
                </div>

                <div className="hidden md:contents">
                    <SeasonDay season={data.season} day={data.day} className="text-center w-10" />
                    <OneLineTeamScore home={home} away={away} />
                    <StandalonePitchers
                        awayPitcher={data.awayPitcherName}
                        homePitcher={data.homePitcherName}
                        predictedAwayPitcher={props.predictedAwayPitcher}
                        predictedHomePitcher={props.predictedHomePitcher}
                        className="flex flex-1"
                    />

                    <div className="flex flex-row justify-end items-baseline space-x-2">
                        <Events 
                            outcomes={data.outcomes} 
                            shame={data.shame} 
                            awayTeam={data.awayTeamNickname}
                            startTime={props.game.startTime}
                            endTime={props.game.endTime}/>
                        <Duration
                            gameId={props.game.gameId}
                            startTime={props.game.startTime}
                            endTime={props.game.endTime}
                            inning={data.inning}
                            topOfInning={data.topOfInning}
                        />
                        <Weather weather={weather} />
                    </div>
                </div>
            </Link>
        );
    },
    (prev, next) => prev.game.gameId === next.game.gameId && prev.showWeather === next.showWeather
);

export const FightRow = React.memo(
    (props: { fight: ChronFight }) => {
        const { data } = props.fight;

        const home = {
            name: data.homeTeamNickname,
            emoji: data.homeTeamEmoji,
            score: data.homeScore,
            pitcher: data.homePitcherName,
            predictedPitcher: null,
            win: data.homeScore >= data.awayScore,
        };

        const away = {
            name: data.awayTeamNickname,
            emoji: data.awayTeamEmoji,
            score: data.awayScore,
            pitcher: data.awayPitcherName,
            predictedPitcher: null,
            win: data.awayScore >= data.homeScore,
        };

        return (
            <Link
                to={`/bossfight/${props.fight.id}`}
                className="flex flex-row px-2 py-2 border-b border-gray-300 dark:border-gray-700 space-x-2 items-baseline hover:bg-gray-200 dark-hover:bg-gray-800"
            >
                <div className="contents md:hidden">
                    <TwoLineTeamScore home={home} away={away} />

                    <div className="flex flex-col justify-center items-end">
                        <div className="flex flex-row space-x-2">
                            <SeasonDay season={data.season} day={"X"} className="text-right" />
                        </div>

                        <div className="flex flex-row justify-end items-baseline space-x-2">
                            <Events 
                                outcomes={data.outcomes} 
                                shame={data.shame} 
                                awayTeam={data.awayTeamNickname}
                                startTime={null}
                                endTime={null}/>
                        </div>
                    </div>
                </div>

                <div className="hidden md:contents">
                    <SeasonDay season={data.season} day={"X"} className="text-center w-8" />
                    <OneLineTeamScore home={home} away={away} />
                    <StandalonePitchers
                        awayPitcher={data.awayPitcherName}
                        homePitcher={data.homePitcherName}
                        predictedAwayPitcher={null}
                        predictedHomePitcher={null}
                        className="flex flex-1"
                    />

                    <div className="flex flex-row justify-end items-baseline space-x-2">
                        <Events 
                            outcomes={data.outcomes} 
                            shame={data.shame} 
                            awayTeam={data.awayTeamNickname}
                            startTime={null}
                            endTime={null}/>
                    </div>
                </div>
            </Link>
        );
    },
    (prev, next) => prev.fight.id === next.fight.id
);
