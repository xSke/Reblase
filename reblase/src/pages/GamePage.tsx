import React, { ReactNode, useEffect, useState } from "react";
import { useParams, useLocation } from "react-router";

import { UpdatesListFetching } from "../components/game/GameUpdateList";
import { cache } from "swr";
import Error from "../components/elements/Error";
import { useGameUpdates } from "../blaseball/hooks";
import { BlaseballGame } from "blaseball-lib/models";
import { Link } from "react-router-dom";
import { displaySeason } from "blaseball-lib/games";
import { getWeather } from "blaseball-lib/weather";
import Twemoji from "components/elements/Twemoji";

interface PayloadProps {
    evt: BlaseballGame;
}

const GameHeading = ({ evt }: PayloadProps) => {
    const location = useLocation();
    const weather = getWeather(evt.weather);

    return (
        <>
            <p className="mb-2">
                <Link to={`/season/${evt.season + 1}`}>&larr; Back to Season {displaySeason(evt.season)}</Link>
            </p>
            <Link to={location.pathname}>
                <h2 className="text-3xl font-semibold">
                    Season {displaySeason(evt.season)}, Day {evt.day + 1}
                </h2>
            </Link>

            <h3 className="mb-2">
                <strong>{evt.awayTeamName}</strong>
                <small> vs. </small>
                <strong>{evt.homeTeamName}</strong>
            </h3>

            <p className="mb-2">
                <Twemoji emoji={weather.emoji} /> <strong>{weather.name}</strong>
            </p>
        </>
    );
};

interface GamePageOptions {
    reverse: boolean;
    autoUpdate: boolean;
    onlyImportant: boolean;
}

interface GamePageOptionsProps {
    options: GamePageOptions;
    setOptions: (opts: GamePageOptions) => void;
    gameComplete: boolean;
}

const CheckBox = (props: { value: boolean; onChange: (newValue: boolean) => void; children?: ReactNode }) => (
    <label className="block mr-4 text-md">
        <input
            className="mr-2 h-4 align-middle"
            type="checkbox"
            checked={props.value}
            onChange={(e) => props.onChange(e.target.checked)}
        />
        <span>{props.children}</span>
    </label>
);

const GamePageOptions = (props: GamePageOptionsProps) => {
    return (
        <div className="flex flex-row mt-2">
            <CheckBox
                value={props.options.reverse}
                onChange={(reverse) => props.setOptions({ ...props.options, reverse })}
            >
                Latest first
            </CheckBox>

            <CheckBox
                value={props.options.onlyImportant}
                onChange={(onlyImportant) => props.setOptions({ ...props.options, onlyImportant })}
            >
                Only important
            </CheckBox>

            {!props.gameComplete && (
                <CheckBox
                    value={props.options.autoUpdate}
                    onChange={(autoUpdate) => props.setOptions({ ...props.options, autoUpdate })}
                >
                    Live refresh
                </CheckBox>
            )}
        </div>
    );
};

type GamePageParams = { gameId?: string };
export function GamePage() {
    const { gameId } = useParams<GamePageParams>();

    // Never reuse caches across multiple games, then it feels slower because instant rerender...
    useEffect(() => cache.clear(), [gameId]);

    const [options, setOptions] = useState<GamePageOptions>({
        reverse: false,
        autoUpdate: false,
        onlyImportant: false,
    });

    if (options.autoUpdate && !options.reverse) setOptions({ ...options, reverse: true });

    const query = {
        game: gameId ?? "null",
        started: true,
    };
    const { updates, error, isLoading } = useGameUpdates(query, options.autoUpdate);
    if (error) return <Error>{error.toString()}</Error>;

    const last = updates[updates.length - 1]?.data;

    // Stop autoupdating once the game is over
    if (last?.gameComplete && options.autoUpdate) setOptions({ ...options, autoUpdate: false });

    return (
        <div className="container mx-auto px-4">
            {last && <GameHeading evt={last} />}

            <GamePageOptions options={options} setOptions={setOptions} gameComplete={last?.gameComplete ?? true} />

            <UpdatesListFetching
                updates={updates}
                isLoading={isLoading}
                order={options.reverse ? "desc" : "asc"}
                filterImportant={options.onlyImportant}
                autoRefresh={options.autoUpdate}
            />
        </div>
    );
}
