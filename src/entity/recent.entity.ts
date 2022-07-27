import Episode from './episode.entity';

export default class Recent {
    data: Episode[];

    meta: {
        total: number;
        lastPage: number;
        currentPage: number;
        perPage: number;
        prev: number | null;
        next: number | null;
    }
}