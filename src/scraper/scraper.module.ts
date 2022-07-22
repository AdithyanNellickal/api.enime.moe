import { Logger, Module, OnModuleInit } from '@nestjs/common';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import fs from 'fs/promises';
import path from 'path';
import { BullModule, Process, Processor } from '@nestjs/bull';
import ScraperService from './scraper.service';
import { Job } from 'bull';
import Scraper from './scraper';
import InformationModule from '../information/information.module';
import S3 from 'aws-sdk/clients/s3';
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
    importedScrapers: Scraper[] = [];
    S3 = undefined;

    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService) {
        this.S3 = new S3({
            endpoint: process.env.S3_ENDPOINT,
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            signatureVersion: 'v4',
        });

        dayjs.extend(utc);
    }

    async onModuleInit() {

        if (process.env.TESTING) return;

        const files = (await fs.readdir(path.resolve(__dirname, "./impl"))).filter(file => {
            return path.extname(file).toLowerCase() === ".js" || path.extname(file).toLowerCase() === ".ts";
        });
        for (const file of files) {
            const { default: ScraperModule } = await import(path.resolve(__dirname, "./impl", file));

            this.importedScrapers.push(new ScraperModule(this.proxyService));
        }

        for (const scraper of this.importedScrapers) {
            const website = await this.databaseService.website.upsert({
                where: {
                    url: scraper.url()
                },
                create: {
                    url: scraper.url(),
                    locale: scraper.locale(),
                    name: scraper.name()
                },
                update: {}
            });

            scraper.websiteMeta = {
                id: website.id
            }
        }
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
            for (let scraper of this.importedScrapers) {
                // @ts-ignore
                let matchedAnimeEntry = scraper.match(anime.title.romaji);
                if (matchedAnimeEntry instanceof Promise) matchedAnimeEntry = await matchedAnimeEntry;

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

                    let scrapedEpisode = scraper.fetch(matchedAnimeEntry.path, i);
                    if (scrapedEpisode instanceof Promise) scrapedEpisode = await scrapedEpisode;

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

                    if (scrapedEpisode.type === SourceType.PROXY) {
                        const response = await fetch(url)
                        const contentType = response.headers.get("content-type") ?? undefined;
                        const contentLength =
                            response.headers.get("content-length") != null
                                ? Number(response.headers.get("content-length"))
                                : undefined;

                        const key = `${scrapedEpisodeId}.${mime.extension(contentType) || scrapedEpisode.format}`;

                        await this.S3
                            .putObject({
                                Bucket: process.env.S3_BUCKET_NAME,
                                Key: key,
                                ContentType: contentType,
                                ContentLength: contentLength,
                                Body: response.body,
                            })
                            .promise();
                    }

                    url = scrapedEpisode.type === SourceType.DIRECT ? scrapedEpisode.url : `https://api.enime.moe/proxy/source/${scrapedEpisodeId}.${scrapedEpisode.format}`;

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
            Logger.error(e)
        }
    }
}