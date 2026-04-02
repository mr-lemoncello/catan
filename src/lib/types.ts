export type Resource =
    | "wood"
    | "brick"
    | "sheep"
    | "wheat"
    | "ore"
    | "desert"
    | "water";

export type BuildResource = "wood" | "brick" | "sheep" | "wheat" | "ore";

export type Tile = {
    q: number;
    r: number;
    resource: Resource;
    number?: number;
};

export type Vertex = { key: string; x: number; y: number; city?: boolean; player?: string };
export type Edge = { key: string; a: Vertex; b: Vertex; player?: string };

export type Settlement = {
    player: string;
    city: boolean;
};

export type Road = {
    player: string;
};

export type Player = {
    id: string;
    name: string;
    color: string;

    resources: Record<BuildResource, number>;

    roadsBuilt: number;
    settlementsBuilt: number;
    citiesBuilt: number;

    victoryPoints: number;
    devCards: DevCard[];
    freeRoads: number;
    newDevCards: DevCard[];
    knightsPlayed: number;
};

export type Game = {
    board: Tile[];
    ports: Port[];

    vertices: Map<string, Settlement | null>;
    edges: Map<string, Road | null>;
    players: Player[];
    currentPlayer: number;

    robber: { q: number; r: number };

    dice?: number;

    phase: GamePhase;
    discardQueue: Map<string, number>;

    devDeck: DevCard[];

    longestRoadOwner?: string;
    longestRoadLength: number;

    largestArmyOwner?: string;
    largestArmySize: number;

    winner?: string;
    notification: string | null;
};

export type GameInstance = {
    id: string;
    state: Game;
};

export type DevCard =
    | "knight"
    | "victory"
    | "road-building"
    | "year-of-plenty"
    | "monopoly";

export type GamePhase =
    | "setup-settlement"
    | "setup-road"
    | "roll"
    | "discard"
    | "robber"
    | "trade"
    | "build"
    | "game-over"
    | "year-of-plenty"
    | "monopoly"
    | "road-building";

export type Port = {
    vertices: [string, string];
    ratio: 2 | 3;
    resource?: BuildResource;
    water: { x: number; y: number };
};

export const hexSize = 60;