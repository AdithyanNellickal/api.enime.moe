import { Logger, Module } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import ScraperService from '../scraper/scraper.service';

import path from 'path';
import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';
import { BullModule } from '@nestjs/bull';
import { fork } from 'child_process';
import InformationService from './information.service';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    })],
    providers: [DatabaseService, InformationService, ScraperService]
})
export default class InformationModule {
    private informationWorker;

    constructor(private readonly databaseService: DatabaseService) {
        dayjs.extend(utc);
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async updateAnime() {
        Logger.debug("Now we start refetching currently releasing anime from Anilist");
        performance.mark("information-fetch-start");
        if (!this.informationWorker) {
            this.informationWorker = fork(path.resolve(__dirname, "./information-worker"));

            this.informationWorker.on("message", async amount => {
                performance.mark("information-fetch-end");
                Logger.debug(`Refetching completed, took ${performance.measure("information-fetch", "information-fetch-start", "information-fetch-end").duration.toFixed(2)}ms, tracked ${amount} anime entries.`);
            })
        }

        this.informationWorker.send("activate");
    }
}