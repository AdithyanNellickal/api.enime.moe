export interface WebsiteMeta {
    id: string;
    // Maybe more fields so we use a class here
}

export interface ScraperJobData {
    animeId: string;
    infoOnly?: boolean;
}

export interface AnimeWebPage {
    title?: string;
    path: string;
}

export interface Episode {
    title?: string;
    url: string;
    number?: number;
    resolution?: string;
    format?: string;
    referer?: string;
    filler?: boolean;
    type: SourceType;
}

export interface RawSource {
    video?: string;
    subtitle?: string;
}

export enum SourceType {
    DIRECT,
    PROXY
}