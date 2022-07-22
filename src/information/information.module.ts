import { Logger, Module } from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import ScraperService from '../scraper/scraper.service';

import path from 'path';
import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { fork } from 'child_process';
import InformationService from './information.service';
import { Queue } from 'bull';
import ProxyService from '../proxy/proxy.service';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    })],
    providers: [DatabaseService, InformationService, ScraperService, ProxyService]
})
export default class InformationModule {
    private informationWorker;

    constructor(@InjectQueue("enime") private readonly queue: Queue, private readonly databaseService: DatabaseService) {
        if (!process.env.TESTING) dayjs.extend(utc);
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async updateAnime() {
        Logger.debug("Now we start refetching currently releasing anime from Anilist");
        performance.mark("information-fetch-start");
        if (!this.informationWorker) {
            this.informationWorker = fork(path.resolve(__dirname, "./information-worker"));

            this.informationWorker.on("message", async animeIds => {
                performance.mark("information-fetch-end");
                Logger.debug(`Refetching completed, took ${performance.measure("information-fetch", "information-fetch-start", "information-fetch-end").duration.toFixed(2)}ms, tracked ${animeIds.length} anime entries.`);

                for (let animeId of animeIds) { // Higher priority than the daily anime sync
                    await this.queue.add("scrape-anime-match", animeId, {
                        priority: 4,
                        removeOnComplete: true
                    });
                }
            })
        }

        this.informationWorker.send("activate");
    }

    // Every 10 minutes, we check anime that have don't have "enough episode" stored in the database (mostly the anime source sites update slower than Anilist because subs stuff) so we sync that part more frequently
    @Cron(CronExpression.EVERY_10_MINUTES)
    async checkForUpdatedEpisodes() {
        const animeList = await this.databaseService.anime.findMany({
            where: {
                status: {
                    in: ["RELEASING", "FINISHED"]
                }
            },
            include: {
                episodes: {
                    include: {
                        sources: true
                    }
                }
            }
        });

        for (let anime of animeList) { // Episode number are unique values, we can safely assume "if the current episode progress count is not even equal to the amount of episodes we have in database, the anime entry should be outdated"
            if (anime.currentEpisode !== anime.episodes.filter(episode => episode.sources.length > 0).length) await this.queue.add("scrape-anime-match", anime.id, {
                priority: 3,
                removeOnComplete: true
            });
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async pushToScrapeQueue() {
        const eligibleToScrape = await this.databaseService.anime.findMany({
            where: {
                status: {
                    in: ["RELEASING", "FINISHED"]
                }
            },
            select: {
                id: true
            }
        });

        for (let anime of eligibleToScrape) {
            await this.queue.add("scrape-anime-match", anime.id, {
                priority: 5,
                removeOnComplete: true
            });
        }
    }
}