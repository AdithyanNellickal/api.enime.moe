import { ApiProperty } from '@nestjs/swagger';

export default class Anime {
    @ApiProperty({
        description: "Anime ID",
        example: "cl5xgvv4703502tmnd5g76sbv"
    })
    id: string;

    @ApiProperty({
        description: "Anime slug",
        example: "lycoris-recoil"
    })
    slug: string;

    @ApiProperty({
        description: "Anilist ID",
        example: 143270
    })
    anilistId: number;

    @ApiProperty({
        description: "Cover image",
        example: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx143270-iZOJX2DMUFMC.jpg"
    })
    coverImage: string | null;

    @ApiProperty({
        description: "Banner image",
        example: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/143270-Ivjs2nVpARtS.jpg"
    })
    bannerImage: string | null;

    @ApiProperty({
        description: "Anime status",
        example: "RELEASING"
    })
    status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

    @ApiProperty({
        description: "Anime season",
        example: "SUMMER"
    })
    season: "FALL" | "SUMMER" | "WINTER" | "SPRING";

    @ApiProperty({
        description: "Anime title",
        example: {
            "native": "リコリス・リコイル",
            "romaji": "Lycoris Recoil",
            "english": "Lycoris Recoil"
        }
    })
    title: {
        userPreferred: string | null,
        english: string | null,
        romaji: string | null,
        native: string | null
    }

    @ApiProperty({
        description: "Current episode number",
        example: 4
    })
    currentEpisode: number;

    @ApiProperty({
        description: "Next episode air date",
        example: "2022-07-30T14:30:00.000Z"
    })
    next: string | null;

    @ApiProperty({
        description: "Synonyms / alternative titles",
        example: [
            "ไลโคริส รีคอยล์",
            "LycoRyco"
        ]
    })
    synonyms: string[];

    @ApiProperty({
        description: "Last time the episode was updated in database",
        example: "2022-07-23T17:54:36.034Z"
    })
    lastEpisodeUpdate: string | null;

    @ApiProperty({
        description: "Anime description",
        example: "“LycoReco” is a café with a traditional Japanese twist located in downtown Tokyo. But the delicious coffee and sugary sweets are not the only orders this café takes! From delivering packages short distances, to pick-ups and drop-offs on the lonely streets at night, to zombies and giant monster extermination…?! Whatever your problem, we're here to help! We will solve any kind of \"trouble\" you may have!<br>\n<br>\nWaiting for you are the ever-smiling poster-girl and the cool, serious newcomer. A petite girl who never wants to work and a young woman approaching thirty who wants to get married. And the manager is a nice guy who’s obsessed with Japan!<br>\n<br>\nWhatever your order is, leave it all up to us♪<br><br>\n\n(Source: Official Site)"
    })
    description: string | null;

    @ApiProperty({
        description: "Anime episode duration (in minutes)",
        example: 24
    })
    duration: number | null;

    @ApiProperty({
        description: "Anime average rating (out of 100)",
        example: 79
    })
    averageScore: number | null;

    @ApiProperty({
        description: "Anime theme color",
        example: "#e45078"
    })
    color: string | null;

    @ApiProperty({
        description: "Anime genres",
        example: [
            "Action",
            "Comedy",
            "Slice of Life"
        ]
    })
    genre: string[];
}
