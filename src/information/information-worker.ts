import { NestFactory } from '@nestjs/core';
import InformationModule from './information.module';
import InformationService from './information.service';
import { Logger } from '@nestjs/common';

let service = null;
async function bootstrap() {
    const app = await NestFactory.create(InformationModule);
    service = app.select(InformationModule).get(InformationService);

    process.on("message", async _ => {
        Logger.debug("[InformationWorker] Running requests from parent");
        const trackingAnime = await service.refetchAnime();
        process.send(trackingAnime);
    });
}
bootstrap();