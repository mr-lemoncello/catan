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

export type Vertex = { key: string; x: number; y: number };
export type Edge = { key: string; a: Vertex; b: Vertex };

export type Settlement = {
    player: number;
    city: boolean;
};

export type Road = {
    player: number;
};

export type Player = {
    id: number;
    name: string;
    color: string;

    resources: Record<BuildResource, number>;

    roads: number;
    settlements: number;
    cities: number;

    victoryPoints: number;
    devCards: DevCard[]
    newDevCards: DevCard[]
    knightsPlayed: number;
};

export type GameState = {
    players: Player[];
    currentPlayer: number;

    board: Tile[];

    vertices: Map<string, Settlement | null>;
    edges: Map<string, Road | null>;

    robber: { q: number; r: number };

    dice: number | null;

    ports: Port[];

    phase: GamePhase;
    discardQueue: Map<number, number>;

    longestRoadOwner: number | null;
    longestRoadLength: number;

    largestArmyOwner: number | null;
    largestArmySize: number;

    winner: number | null;
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
    | "monopoly";

export type Port = {
    vertices: [string, string];
    ratio: 2 | 3;
    resource?: BuildResource;
    water: { x: number; y: number };
};