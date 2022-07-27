import Anime from './anime.entity';

export default class Search {
    data: Anime[];

    meta: {
        total: number;
        lastPage: number;
        currentPage: number;
        perPage: number;
        prev: number | null;
        next: number | null;
    }
}