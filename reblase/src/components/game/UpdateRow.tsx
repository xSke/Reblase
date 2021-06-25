import { isGameUpdateImportant, getBattingTeam } from "blaseball-lib/games";
import { Circles } from "../elements/Circles";
import React, { useEffect, useRef } from "react";
import dayjs from "dayjs";
import Emoji from "../elements/Emoji";
import { BlaseballGame } from "blaseball-lib/models";
import { ChronFightUpdate, ChronGameUpdate } from "blaseball-lib/chronicler";
import BaseDisplay from "../elements/BaseDisplay";
import clsx from "clsx";
import "./UpdateRow.css";

interface WrappedUpdateProps {
    update: ChronGameUpdate | ChronFightUpdate;
}

interface UpdateProps {
    evt: BlaseballGame;
}

function Timestamp({ update }: WrappedUpdateProps) {
    const updateTime = dayjs(update.timestamp);
    const time = updateTime.format("mm:ss");

    const linkHref =
        window.location.protocol + "//" + window.location.host + window.location.pathname + "#" + update.hash;

    return (
        <a href={linkHref} className="UpdateRow-Timestamp">
            {time}
        </a>
    );
}

function Score({ evt }: UpdateProps) {
    return <span className="UpdateRow-Score tag">{`${evt.awayScore} - ${evt.homeScore}`}</span>;
}

function GameLog({ evt }: UpdateProps) {
    const isImportant = isGameUpdateImportant(evt.lastUpdate, evt.scoreUpdate);

    return (
        <span className="UpdateRow-GameLog">
            <span className={clsx(isImportant && "font-semibold")}>{evt.lastUpdate}</span>
            {evt.scoreLedger && <em className="block">{evt.scoreLedger}</em>}
            {evt.scoreUpdate && <strong> {evt.scoreUpdate}</strong>}
        </span>
    );
}

function Batter({ evt }: UpdateProps) {
    const team = getBattingTeam(evt);

    if (!team.batterName)
        // "hide" when there's no batter
        return null;

    return (
        <span className="UpdateRow-Batter">
            <Emoji emoji={team.emoji} />
            <span className="ml-1">{team.batterName}</span>
        </span>
    );
}

function AtBatInfo({ evt }: UpdateProps) {
    const battingTeam = getBattingTeam(evt);
    return (
        <div className="UpdateRow-AtBat">
            <BlaseRunners evt={evt} />
            <span className="flex space-x-1">
                <Circles label="Balls" amount={evt.atBatBalls} total={battingTeam.maxBalls - 1} />
                <Circles label="Strikes" amount={evt.atBatStrikes} total={battingTeam.maxStrikes - 1} />
                <Circles label="Outs" amount={evt.halfInningOuts} total={battingTeam.maxOuts - 1} />
            </span>
        </div>
    );
}
function BlaseRunners({ evt }: UpdateProps) {
    const basesIncludingHome = (evt.topOfInning ? evt.awayBases : evt.homeBases) ?? 4;

    return (
        <BaseDisplay
            basesOccupied={evt.basesOccupied}
            baseRunnerNames={evt.baseRunnerNames}
            totalBases={basesIncludingHome - 1}
        />
    );
}

interface UpdateRowProps extends WrappedUpdateProps {
    highlight: boolean;
}

export const UpdateRow = React.memo(
    function UpdateRow({ update, highlight }: UpdateRowProps) {
        const evt = update.data;

        const scrollRef = useRef<HTMLDivElement>(null);
        useEffect(() => {
            if (highlight) {
                scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, [highlight, scrollRef]);

        return (
            <div
                ref={highlight ? scrollRef : undefined}
                className={"UpdateRow" + (highlight ? " UpdateRow-Highlight" : "")}
            >
                <GameLog evt={evt} />
                <Timestamp update={update} />
                <Score evt={evt} />
                <Batter evt={evt} />
                <AtBatInfo evt={evt} />
            </div>
        );
    },
    (oldProps, newProps) => {
        return oldProps.update.hash === newProps.update.hash && oldProps.highlight === newProps.highlight;
    }
);
