import Episode from './episode.entity';
import { ApiProperty } from '@nestjs/swagger';

export default class Recent {
    @ApiProperty({
        description: "Episodes that have been recently released"
    })
    data: Episode[];

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