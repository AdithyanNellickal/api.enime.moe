import { Logger, Module, OnModuleInit } from '@nestjs/common';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import { BullModule, Process, Processor } from '@nestjs/bull';
import ScraperService from './scraper.service';
import { Job } from 'bull';
import InformationModule from '../information/information.module';
import cuid from 'cuid';
import { AnimeWebPage, ScraperJobData, SourceType } from '../types/global';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Scraper from './scraper';
import { transform } from '../helper/romaji';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    }), InformationModule],
    providers: [ScraperService, DatabaseService, ProxyService]
})
@Processor("enime")
export default class ScraperModule implements OnModuleInit {
    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService, private readonly scraperService: ScraperService) {
        if (!process.env.TESTING) dayjs.extend(utc);
    }

    async onModuleInit() {
        if (process.env.TESTING) return;
    }

    async matchAnime(title, scraper: Scraper): Promise<AnimeWebPage> {
        let original = !title.current, special = title.special;
        if (original) title.current = title.english;

        let matchedEntry = await scraper.match(title);

        if (!matchedEntry) {
            if (special && (title.english?.includes(":") || title.romaji?.includes(":"))) {
                let prefixEnglish = title.english?.split(":")[0];
                let prefixRomaji = title.romaji?.split(":")[0];

                if (title.current === prefixEnglish) {
                    title.current = prefixRomaji;
                } else if (title.current === prefixRomaji) {
                    return undefined;
                } else {
                    title.current = prefixEnglish;
                }

                title.original = false;

                return this.matchAnime(title, scraper);
            }

            if (title.current === title.english && title.romaji) {
                title.current = title.romaji;
                title.original = false;

                return this.matchAnime(title, scraper);
            }

            if (title.current === title.romaji && title.current !== transform(title.romaji)) {
                title.current = transform(title.romaji);

                return this.matchAnime(title, scraper);
            }

            if (title.current === transform(title.romaji)) {
                title.special = true;

                return this.matchAnime(title, scraper);
            }

            return undefined;
        }

        return matchedEntry;
    }

    @Process("scrape-anime-match")
    async scrape(job: Job<ScraperJobData>) {
        const { animeId: id, infoOnly } = job.data;

        Logger.debug(`Received a job to fetch anime with ID ${id}, info only mode: ${infoOnly}`);

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
                if (infoOnly && !scraper.infoOnly) continue;

                let matchedAnimeEntry = await this.matchAnime(anime.title, scraper);
                if (!matchedAnimeEntry) continue;

                let episodeToScrapeLower = Number.MAX_SAFE_INTEGER, episodeToScraperHigher = Number.MIN_SAFE_INTEGER;

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

                    episodeToScrapeLower = Math.min(episodeToScrapeLower, i);
                    episodeToScraperHigher = Math.max(episodeToScraperHigher, i);
                }

                try {
                    let scrapedEpisodes = scraper.fetch(matchedAnimeEntry.path, episodeToScrapeLower, episodeToScraperHigher);

                    if (scrapedEpisodes instanceof Promise) scrapedEpisodes = await scrapedEpisodes;
                    if (!scrapedEpisodes) continue;

                    if (!Array.isArray(scrapedEpisodes)) scrapedEpisodes = [scrapedEpisodes];

                    for (let scrapedEpisode of scrapedEpisodes) {
                        let episodeDb = await this.databaseService.episode.findFirst({
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
                            episodeDb = await this.databaseService.episode.create({
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
                                episodeDb = await this.databaseService.episode.update({
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

                            Logger.debug(`Updated an anime with episode number ${episodeDb.number} under ID ${anime.id}`);
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
                    Logger.error(`Error with anime ID ${anime.id} with scraper on url ${scraper.url()}, skipping this job`, e);
                    continue;
                }
            }
        } catch (e) {
            Logger.error(e);
            Logger.error(e.stack);
        }
    }
}