import { Logger, Module, OnModuleInit } from '@nestjs/common';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import { BullModule, Process, Processor } from '@nestjs/bull';
import ScraperService from './scraper.service';
import { Job } from 'bull';
import InformationModule from '../information/information.module';
import fetch from 'node-fetch';
import cuid from 'cuid';
import { SourceType } from '../types/global';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import mime from 'mime-types';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    }), InformationModule],
    providers: [ScraperService, DatabaseService, ProxyService]
})
@Processor("enime")
export default class ScraperModule implements OnModuleInit {
    S3 = undefined;

    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService, private readonly scraperService: ScraperService) {
        if (!process.env.TESTING) dayjs.extend(utc);
    }

    async onModuleInit() {
        if (process.env.TESTING) return;
    }

    @Process("scrape-anime-match")
    async scrape(job: Job<string>) {
        const id = job.data;
        Logger.debug(`Received a job to fetch anime with ID ${job.data}`);

        const anime = await this.databaseService.anime.findUnique({
            where: {
                id
            }
        });
        
        if (!anime) {
            Logger.debug(`Scraper queue detected an ID ${id} but its corresponding anime entry does not exist in the database. Skipping this job.`);
            return;
        }

        try {
            for (let scraper of this.scraperService.scrapers) {
                // @ts-ignore
                let matchedAnimeEntry = scraper.match(anime.title);
                if (matchedAnimeEntry instanceof Promise) matchedAnimeEntry = await matchedAnimeEntry;

                if (!matchedAnimeEntry) continue;

                for (let i = 1; i <= anime.currentEpisode; i++) {
                    const episodeWithSource = await this.databaseService.episode.findFirst({
                        where: {
                            AND: [
                                {
                                    animeId: anime.id,
                                },
                                {
                                    number: i
                                }
                            ]
                        },
                        include: {
                            sources: true
                        }
                    });

                    if (episodeWithSource && episodeWithSource.sources.some(source => source.websiteId === scraper.websiteMeta.id)) {
                        continue;
                    }

                    let scrapedEpisode = scraper.fetch(matchedAnimeEntry.path, i, i);
                    if (scrapedEpisode instanceof Promise) scrapedEpisode = await scrapedEpisode;

                    if (!scrapedEpisode) continue;

                    // TODO - We can optimize this by utilizing episode range fetch for websites like Gogoanime
                    if (Array.isArray(scrapedEpisode)) scrapedEpisode = scrapedEpisode[0];

                    let episodeDb = await this.databaseService.episode.findFirst({
                        where: {
                            AND: [
                                {
                                    animeId: anime.id
                                },
                                {
                                    number: i
                                }
                            ]
                        }
                    });

                    if (!episodeDb) {
                        episodeDb = await this.databaseService.episode.create({
                            data: {
                                anime: {
                                    connect: { id: anime.id }
                                },
                                number: i,
                                title: scrapedEpisode.title
                            }
                        })
                    } else {
                        if (scrapedEpisode.title) {
                            episodeDb = await this.databaseService.episode.update({
                                where: {
                                    id: episodeDb.id
                                },
                                data: {
                                    title: scrapedEpisode.title
                                }
                            });
                        }
                    }

                    let url = scrapedEpisode.url;
                    let scrapedEpisodeId = cuid();

                    let scrapedEpisodeDb = await this.databaseService.source.findUnique({
                        where: {
                            url: url
                        }
                    });

                    if (!scrapedEpisodeDb) { // Normally we should not check here but just in case
                        scrapedEpisodeDb = await this.databaseService.source.create({
                            data: {
                                id: scrapedEpisodeId,
                                website: {
                                    connect: { id: scraper.websiteMeta.id }
                                },
                                episode: {
                                    connect: { id: episodeDb.id }
                                },
                                // @ts-ignore
                                type: scrapedEpisode.type === SourceType.DIRECT ? "DIRECT" : "PROXY",
                                url: url,
                                resolution: scrapedEpisode.resolution,
                                format: scrapedEpisode.format,
                                referer: scrapedEpisode.referer?.trim()
                            }
                        })
                    }

                    await this.databaseService.anime.update({
                        where: {
                            id: anime.id
                        },
                        data: {
                            lastEpisodeUpdate: dayjs().toISOString()
                        }
                    })
                }
            }
        } catch (e) {
            Logger.error(e);
            Logger.error(e.stack);
        }
    }
}