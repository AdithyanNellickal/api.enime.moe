import Anime from './anime.entity';
import Source from './source.entity';

export default class Episode {
    id: string;

    anime: Anime;

    number: number;

    title: string | null;

    image: string | null;

    sources: Source[];

    introStart: number | null;

    introEnd: number | null;

    filler: boolean | null;

    createdAt: string;

    updatedAt: string;
}