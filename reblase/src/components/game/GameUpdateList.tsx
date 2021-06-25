import { isGameUpdateImportant, getBattingTeam, getPitchingTeam } from "blaseball-lib/games";
import React, { useMemo } from "react";
import { UpdateRow } from "./UpdateRow";

import "../../style/GamePage.css";
import Emoji from "../elements/Emoji";
import { ChronFightUpdate, ChronGameUpdate } from "blaseball-lib/chronicler";
import { BlaseballGame } from "blaseball-lib/models";
import Spinner from "components/elements/Spinner";
import { Loading } from "components/elements/Loading";

type GameOrFight = ChronFightUpdate | ChronGameUpdate;

interface UpdatesListFetchingProps {
    isLoading: boolean;
    updates: GameOrFight[];
    order: "asc" | "desc";
    filterImportant: boolean;
    autoRefresh: boolean;
}

export function UpdatesListFetching(props: UpdatesListFetchingProps) {
    return (
        <div className="flex flex-col mt-2">
            {props.autoRefresh && (
                <span className="italic text-gray-600 dark:text-gray-400">
                    <Spinner /> Live-updating...
                </span>
            )}

            <GameUpdateList updates={props.updates} updateOrder={props.order} filterImportant={props.filterImportant} />

            {props.isLoading && <Loading />}
        </div>
    );
}

interface UpdateProps {
    evt: BlaseballGame;
}

export const InningHeader = React.memo(function InningHeader(props: UpdateProps) {
    const arrow = props.evt.topOfInning ? "\u25B2" : "\u25BC";
    const halfString = props.evt.topOfInning ? "Top" : "Bottom";
    const pitchingTeam = getPitchingTeam(props.evt);
    const battingTeam = getBattingTeam(props.evt);

    return (
        <div className="col-span-4 lg:col-span-5 mb-2 my-4">
            <h4 className="text-xl font-semibold">
                {arrow} {halfString} of {props.evt.inning + 1}
            </h4>

            <div className="text-sm">
                <strong>
                    <Emoji emoji={pitchingTeam.emoji} /> {pitchingTeam.name}
                </strong>{" "}
                fielding, with <strong>{pitchingTeam.pitcherName}</strong> pitching
            </div>

            <div className="text-sm">
                <strong>
                    <Emoji emoji={battingTeam.emoji} /> {battingTeam.name}
                </strong>{" "}
                batting
            </div>
        </div>
    );
});

type Element =
    | { type: "row"; update: GameOrFight }
    | { type: "heading"; update: GameOrFight; inning: number; top: boolean };

export function addInningHeaderRows(
    updates: GameOrFight[],
    direction: "asc" | "desc",
    filterImportant: boolean
): Element[] {
    const elements: Element[] = [];

    let lastInning = -1;
    let lastTopOfInning = true;
    let lastHash = null;
    for (const update of updates) {
        // Basic dedupe
        if (lastHash === update.hash) continue;

        const payload = update.data;
        const row: Element = { type: "row", update };

        if (filterImportant && !isGameUpdateImportant(payload.lastUpdate, payload.scoreUpdate)) continue;

        const isNewHalfInning = lastInning !== payload.inning || lastTopOfInning !== payload.topOfInning;
        if (isNewHalfInning && payload.inning > -1) {
            // New inning, add header
            const header: Element = { type: "heading", inning: payload.inning, top: payload.topOfInning, update };

            // We're skipping "inning 0" so if this is the inning 1 header, "push" it before the first events
            if (payload.inning === 0 && payload.topOfInning) {
                elements.unshift(header);
            } else {
                elements.push(header);
            }
        }

        // Reorder accounting for the early pitching updates we get
        // This was fixed in Season 12 (iirc??)
        if (update.data.season < 11) {
            if (direction === "asc") {
                if (payload.lastUpdate.endsWith("batting.") && elements.length > 2) {
                    const [heading, prevUpdate] = elements.splice(-2);
                    elements.push(prevUpdate, heading);
                }
            } else {
                if (elements.length > 3) {
                    const [prevPrevUpdate, prevUpdate, heading] = elements.splice(-3);
                    if (heading.type === "heading" && prevPrevUpdate.update.data.lastUpdate.endsWith("batting.")) {
                        elements.push(prevPrevUpdate, heading, prevUpdate);
                    } else {
                        elements.push(prevPrevUpdate, prevUpdate, heading);
                    }
                }
            }
        }

        // Add the row
        elements.push(row);

        lastInning = payload.inning;
        lastTopOfInning = payload.topOfInning;
        lastHash = update.hash;
    }

    return elements;
}

export interface SecondaryUpdate<T> {
    data: T;
    timestamp: string;
}

interface GameUpdateListProps<TSecondary> {
    updates: GameOrFight[];
    updateOrder: "asc" | "desc";
    filterImportant: boolean;
    secondaryUpdates?: SecondaryUpdate<TSecondary>[];
    renderSecondary?: (update: SecondaryUpdate<TSecondary>) => React.ReactNode;
}

type GroupValue<TSecondary> =
    | { type: "primary"; data: GameOrFight }
    | { type: "secondary"; data: SecondaryUpdate<TSecondary> };
export function GameUpdateList<TSecondary = undefined>(props: GameUpdateListProps<TSecondary>) {
    const updates = [...props.updates];

    // Season 11+ has a "playCount" property we can use for proper ordering
    // Otherwise, .sort is stable and it'll keep existing order
    updates.sort((a, b) => (a.data.playCount ?? -1) - (b.data.playCount ?? -1));

    if (props.updateOrder === "desc") updates.reverse();

    const elements = useMemo(
        () => addInningHeaderRows(updates, props.updateOrder, props.filterImportant),
        [updates, props.updateOrder, props.filterImportant]
    );

    const grouped = [];
    for (const elem of elements) {
        if (elem.type === "heading") {
            grouped.push({
                firstUpdate: elem.update,
                updates: [] as GroupValue<TSecondary>[],
            });
        } else {
            grouped[grouped.length - 1].updates.push({ type: "primary", data: elem.update });
        }
    }

    if (props.secondaryUpdates) {
        const remaining = [...props.secondaryUpdates] as SecondaryUpdate<TSecondary>[];
        for (const group of grouped) {
            for (let i = 0; i < group.updates.length; i++) {
                const firstRemaining = remaining[0];
                if (!firstRemaining) break;

                const at = group.updates[i];
                if (at.type === "primary" && firstRemaining.timestamp < at.data.timestamp) {
                    group.updates.splice(i, 0, { type: "secondary", data: remaining.shift()! });
                }
            }
        }

        grouped[grouped.length - 1].updates.push(...remaining.map((d) => ({ type: "secondary" as const, data: d })));
    }

    const scrollTarget = window.location.hash.replace("#", "");

    return (
        <div className="flex flex-col">
            {grouped
                .filter((g) => g.updates.length > 0)
                .map((group) => (
                    <div key={group.firstUpdate.hash + "_group"}>
                        <InningHeader key={group.firstUpdate.hash + "_heading"} evt={group.firstUpdate.data} />
                        <div className="flex flex-col">
                            {group.updates.map((update) => {
                                if (update.type === "primary") {
                                    const highlight = update.data.hash === scrollTarget;
                                    return (
                                        <UpdateRow
                                            key={update.data.hash + "_update"}
                                            update={update.data}
                                            highlight={highlight}
                                        />
                                    );
                                } else if (props.renderSecondary) {
                                    return props.renderSecondary(update.data);
                                } else {
                                    return null;
                                }
                            })}
                        </div>
                    </div>
                ))}
        </div>
    );
}
