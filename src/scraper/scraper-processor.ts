import { Job, DoneCallback } from 'bull';
import { ScraperJobData, SourceType } from '../types/global';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import ScraperModule from './scraper.module';
import cuid from 'cuid';
import dayjs from 'dayjs';
import DatabaseService from '../database/database.service';
import ScraperService from './scraper.service';

export default async function (job: Job<ScraperJobData>, cb: DoneCallback) {
    const app = await NestFactory.create(ScraperModule);
    let scraperModule = app.get(ScraperModule);
    let scraperService = app.select(ScraperModule).get(ScraperService);
    let databaseService = app.select(ScraperModule).get(DatabaseService);

    const { animeIds: ids, infoOnly } = job.data;

    let progress = 0;
    for (let id of ids) {
        Logger.debug(`Received a job to fetch anime with ID ${id}, info only mode: ${infoOnly}`);

        const anime = await databaseService.anime.findUnique({
            where: {
                id
            }
        });

        if (!anime) {
            Logger.debug(`Scraper queue detected an ID ${id} but its corresponding anime entry does not exist in the database. Skipping this job.`);
            return;
        }

        try {
            for (let scraper of await scraperService.scrapers()) {
                if (infoOnly && !scraper.infoOnly) continue;

                let matchedAnimeEntry = await scraperModule.matchAnime(anime.title, scraper);

                if (!matchedAnimeEntry) continue;

                let episodeToScrapeLower = Number.MAX_SAFE_INTEGER, episodeToScraperHigher = Number.MIN_SAFE_INTEGER;

                for (let i = 1; i <= anime.currentEpisode; i++) {
                    const episodeWithSource = await databaseService.episode.findFirst({
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

                    episodeToScrapeLower = Math.min(episodeToScrapeLower, i);
                    episodeToScraperHigher = Math.max(episodeToScraperHigher, i);
                }

                try {
                    let scrapedEpisodes = scraper.fetch(matchedAnimeEntry.path, episodeToScrapeLower, episodeToScraperHigher);

                    if (scrapedEpisodes instanceof Promise) scrapedEpisodes = await scrapedEpisodes;
                    if (!scrapedEpisodes) continue;

                    if (!Array.isArray(scrapedEpisodes)) scrapedEpisodes = [scrapedEpisodes];

                    for (let scrapedEpisode of scrapedEpisodes) {
                        let episodeDb = await databaseService.episode.findFirst({
                            where: {
                                AND: [
                                    {
                                        animeId: anime.id
                                    },
                                    {
                                        number: scrapedEpisode.number
                                    }
                                ]
                            }
                        });

                        if (!episodeDb) {
                            episodeDb = await databaseService.episode.create({
                                data: {
                                    anime: {
                                        connect: { id: anime.id }
                                    },
                                    number: scrapedEpisode.number,
                                    title: scrapedEpisode.title
                                }
                            })
                        } else {
                            if (scrapedEpisode.title) {
                                episodeDb = await databaseService.episode.update({
                                    where: {
                                        id: episodeDb.id
                                    },
                                    data: {
                                        title: scrapedEpisode.title
                                    }
                                });

                                Logger.debug(`Updated an anime with episode title ${episodeDb.title} #${scrapedEpisode.number} under ID ${anime.id}`);
                            }

                            Logger.debug(`No title for anime with ID ${anime.id} to update`);
                        }

                        if (!infoOnly && !scraper.infoOnly) {
                            let url = scrapedEpisode.url;
                            let scrapedEpisodeId = cuid();

                            let scrapedEpisodeDb = await databaseService.source.findUnique({
                                where: {
                                    url: url
                                }
                            });

                            if (!scrapedEpisodeDb) { // Normally we should not check here but just in case
                                scrapedEpisodeDb = await databaseService.source.create({
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

                            Logger.debug(`Updated an anime with episode number ${episodeDb.number} under ID ${anime.id}`);
                            await databaseService.anime.update({
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
                    Logger.error(`Error with anime ID ${anime.id} with scraper on url ${scraper.url()}, skipping this job`, e);
                    continue;
                }
            }
        } catch (e) {
            Logger.error(e);
            Logger.error(e.stack);
        }

        progress++;
        await job.progress(progress);
    }

    cb(null, "Done");
}
