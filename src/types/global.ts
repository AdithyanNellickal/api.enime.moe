export interface WebsiteMeta {
    id: string;
    // Maybe more fields so we use a class here
}

export interface AnimeWebPage {
    title?: string;
    path: string;
}

export interface Episode {
    title?: string;
    url: string;
    resolution?: string;
    format?: string;
    referer?: string;
    type: SourceType;
}

export enum SourceType {
    DIRECT,
    PROXY
}