import { NestFactory } from '@nestjs/core';
import InformationModule from './information.module';
import InformationService from './information.service';
import { Logger } from '@nestjs/common';

let service = null;
async function bootstrap() {
    const app = await NestFactory.create(InformationModule);
    service = app.select(InformationModule).get(InformationService);

    process.on("message", async ({ event, data }) => {
        if (event === "refetch") {
            Logger.debug("[InformationWorker] Start refetching anime information from Anilist");
            const trackingAnime = await service.refetchAnime();
            process.send({
                event: "refetch",
                data: trackingAnime
            });
        } else if (event === "resync") {
            Logger.debug("[InformationWorker] Start resyncing anime information from Anilist to other information providers");
            const trackingAnime = await service.resyncAnime(data);
            process.send({
                event: "resync",
                data: trackingAnime
            });
        }
    });
}
bootstrap();