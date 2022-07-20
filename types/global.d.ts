export interface WebsiteMeta {
    id: string;
    // Maybe more fields so we use a class here
}

export interface MatchEpisode {
    title?: string;
    number: number;
    path: string;
}

export interface Episode {
    number: number;
    title?: string;
    url: string;
    resolution: string;
    format: string;
}