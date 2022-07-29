import { ApiProperty } from '@nestjs/swagger';
import Anime from './anime.entity';

export default class Popular {
    @ApiProperty({
        description: "Anime that are sorted with popular rating",
        type: Anime,
        isArray: true
    })
    data: Anime[];

    @ApiProperty({
        description: "Pagination meta",
        example: {
            "total": 651,
            "lastPage": 33,
            "currentPage": 1,
            "perPage": 20,
            "prev": null,
            "next": 2
        }
    })
    meta: {
        total: number;
        lastPage: number;
        currentPage: number;
        perPage: number;
        prev: number | null;
        next: number | null;
    }
}