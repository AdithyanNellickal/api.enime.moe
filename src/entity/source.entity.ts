import { ApiProperty } from '@nestjs/swagger';

export default class Source {
    @ApiProperty({
        description: "Source ID",
        example: "cl5xgxxh2255801mnzpsq6xx8"
    })
    id: string;

    @ApiProperty({
        description: "Source proxied url",
        example: "https://api.enime.moe/proxy/source/cl5xgxxh6000y01mn5wdo8ydw"
    })
    url: string;

    @ApiProperty({
        description: "The source priority, some sources are verified to be more stable than others, higher priority usually means more stability",
        example: 1
    })
    priority: number;

    @ApiProperty({
        description: "The source website name",
        example: "Gogoanime"
    })
    website: string;

    @ApiProperty({
        description: "Sometimes the source website provides an external file as subtitle, this indicates if the current source has an external subtitle file",
        example: false
    })
    subtitle: boolean;
}