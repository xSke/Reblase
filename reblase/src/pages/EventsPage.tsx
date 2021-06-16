import React from "react";

import { Loading } from "../components/elements/Loading";
import { Container } from "../components/layout/Container";
import { getOutcomes } from "../blaseball/outcome";
import Error from "../components/elements/Error";
import { Link } from "react-router-dom";
import { useGameList, useTemporal } from "../blaseball/hooks";
import dayjs from "dayjs";
import { displaySeason, GameTeam, getAwayTeam, getHomeTeam } from "blaseball-lib/games";
import Twemoji from "components/elements/Twemoji";

type TimedText = { text: string; timestamp: string };

interface BaseEvent {
    timestamp: string;

    name: string;
    emoji: string;
    color: string;
}

interface GameEvent extends BaseEvent {
    type: "game";

    game: string;
    season: number;
    day: number;
    homeTeam: GameTeam;
    awayTeam: GameTeam;
    text: string[];
}

interface TemporalEvent extends BaseEvent {
    type: "temporal";
    text: TimedText[];
}

type BlaseEvent = GameEvent | TemporalEvent;

interface TemporalType {
    name: string;
    color: string;
    emoji: string;
}

const temporalTypes = {
    siteAlert: {
        name: "Alert",
        color: "red",
        emoji: "\u{1F6A8}",
    },
    peanut: {
        name: "The Peanut",
        color: "brown",
        emoji: "\u{1F95C}",
    },
    squid: {
        name: "The Hall Monitor",
        color: "blue",
        emoji: "\u{1F991}",
    },
    reader: {
        name: "The Reader",
        color: "purple",
        emoji: "\u{1F0CF}",
    },
    coin: {
        name: "Boss",
        color: "yellow",
        emoji: "\u{1FA99}",
    },
    lootcrates: {
        name: "Lōotcrates",
        color: "black",
        emoji: "\u{1F4DC}",
    },
    unknown: {
        name: "???",
        color: "black",
        emoji: "\u{2753}",
    },
};
const temporalTypeByGamma: Partial<Record<number, TemporalType>> = {
    [-1]: temporalTypes.siteAlert,
    0: temporalTypes.peanut,
    1: temporalTypes.squid,
    2: temporalTypes.coin,
    3: temporalTypes.reader,
    5: temporalTypes.lootcrates,
};

const EventRow = ({ evt }: { evt: BlaseEvent }) => {
    return (
        <div className="border-b border-gray-300 dark:border-gray-700 py-2">
            {evt.type === "game" ? (
                <div className="flex">
                    <Link to={`/game/${evt.game}`} className="text-sm font-semibold flex-1">
                        {evt.emoji} {evt.name}
                    </Link>
                    <Link to={`/game/${evt.game}`} className="text-sm">
                        Season <strong>{displaySeason(evt.season)}</strong>, Day <strong>{evt.day + 1}</strong>
                    </Link>
                </div>
            ) : (
                <div className="flex">
                    <div className="text-sm font-semibold flex-1">
                        <Twemoji emoji={evt.emoji} /> {evt.name}
                    </div>
                    <div className="text-sm">{dayjs(evt.timestamp).format("YYYY-MM-DD")}</div>
                </div>
            )}

            <div className="text-sm whitespace-pre-line float-left">
                {evt.type === "game" ? (
                    evt.text.join("\n")
                ) : (
                    <ul>
                        {evt.text.map((line, idx) => (
                            <li key={idx}>
                                <span className="text text-gray-700 dark:text-gray-300 tabular-nums mr-2">
                                    {dayjs(line.timestamp).format("HH:mm")}
                                </span>
                                {line.text}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {evt.type === "game" && (
                <span className="text-sm text-gray-700 dark:text-gray-300 float-right">
                    {evt.awayTeam.nickname} vs. {evt.homeTeam.nickname}
                </span>
            )}
        </div>
    );
};

export function EventsPage() {
    const { games, error, isLoading } = useGameList({ outcomes: true, order: "desc" });
    const { updates: temporalUpdates, error: temporalError, isLoading: temporalIsLoading } = useTemporal();

    if (error || temporalError) return <Error>{(error || temporalError).toString()}</Error>;
    if (isLoading || temporalIsLoading) return <Loading />;

    const gameEvents: BlaseEvent[] = [];
    for (const game of games) {
        const outcomes = getOutcomes(game.data.outcomes, game.data.shame, game.data.awayTeam, game.startTime, game.endTime);
        for (const outcome of outcomes) {
            const lastEvent = gameEvents[gameEvents.length - 1];
            if (
                lastEvent &&
                lastEvent.type === "game" &&
                lastEvent.game === game.gameId &&
                lastEvent.name === outcome.name
            ) {
                lastEvent.text.push(outcome.text);
                continue;
            }

            if (outcome.name === "Party")
                // too damn many
                continue;

            gameEvents.push({
                type: "game",
                game: game.gameId,
                season: game.data.season,
                day: game.data.day,
                homeTeam: getHomeTeam(game.data),
                awayTeam: getAwayTeam(game.data),
                name: outcome.name,
                text: [outcome.text],
                color: outcome.color,
                emoji: outcome.emoji,
                timestamp: game.startTime!,
            });
        }
    }

    const temporalEvents = [];
    let lastEvent: TemporalEvent | null = null;
    for (const update of temporalUpdates) {
        const doc = update.data?.doc;
        if (!doc || !doc.epsilon || !doc.zeta) {
            lastEvent = null;
            continue;
        }

        const type = temporalTypeByGamma[doc.gamma] ?? temporalTypes.unknown;

        if (lastEvent && lastEvent.name === type.name) {
            lastEvent.text.push({ text: doc.zeta, timestamp: update.firstSeen });
            continue;
        }

        lastEvent = {
            type: "temporal",
            timestamp: update.firstSeen,
            name: type.name,
            emoji: type.emoji,
            color: type.color,
            text: [{ text: doc.zeta, timestamp: update.firstSeen }],
        };
        temporalEvents.push(lastEvent);
    }

    const allEvents = [...gameEvents, ...temporalEvents].sort((a, b) => -a.timestamp.localeCompare(b.timestamp));

    return (
        <Container className={"mt-4"}>
            <h2 className="text-2xl font-semibold mb-2">Recent game events</h2>

            <div className="flex flex-col">
                {allEvents.map((evt, idx) => (
                    <EventRow evt={evt} key={idx} />
                ))}
            </div>
        </Container>
    );
}
