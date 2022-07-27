export default class Anime {
    id: string;

    slug: string;

    anilistId: number;

    coverImage: string | null;

    bannerImage: string | null;

    status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

    season: "FALL" | "SUMMER" | "WINTER" | "SPRING";

    title: {
        english: string | null,
        romaji: string | null,
        native: string | null
    }

    currentEpisode: number;

    next: string | null;

    synonyms: string[];

    lastEpisodeUpdate: string | null;

    description: string | null;

    duration: number | null;

    averageScore: number | null;

    color: string | null;

    createdAt: string;

    updatedAt: string;

    genre: string[];


}
