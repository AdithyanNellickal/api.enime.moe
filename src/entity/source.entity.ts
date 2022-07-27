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
}