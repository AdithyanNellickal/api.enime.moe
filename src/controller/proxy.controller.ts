import {
    CacheInterceptor,
    Controller,
    Get,
    Injectable, InternalServerErrorException,
    NotFoundException,
    Param, Res, UseGuards,
    UseInterceptors
} from '@nestjs/common';
import S3 from 'aws-sdk/clients/s3';
import DatabaseService from '../database/database.service';
import { Throttle } from '@nestjs/throttler';

@Controller("/proxy")
@Injectable()
@UseInterceptors(CacheInterceptor)
export default class ProxyController {
    S3 = undefined;

    constructor(private readonly databaseService: DatabaseService) {
        this.S3 = new S3({
            endpoint: process.env.S3_ENDPOINT,
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            signatureVersion: "v4",
        });
    }

    @Get("/source/:id")
    @Throttle(10, 60)
    async sourceProxy(@Param() params, @Res() res) {
        const source = await this.databaseService.source.findUnique({
            where: {
                id: params.id.replace(/\.[^/.]+$/, "")
            }
        });

        if (!source) throw new NotFoundException("The source does not exist.");

        try {
            let stream = await this.S3.getObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: params.id
            }).createReadStream();

            return res.send(stream);
        } catch (e) {
            throw new InternalServerErrorException("Error occurred while trying to request for the source file");
        }
    }
}